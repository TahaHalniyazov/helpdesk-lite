import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const Body = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
})

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)))
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const raw = await readBody(event)
  const body = Body.parse(raw)

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  })
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const canAccess =
    user.role === 'ADMIN' ||
    (user.role === 'USER' && ticket.createdById === user.id) ||
    (user.role === 'AGENT' && ticket.assignedToId === user.id)

  if (!canAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  // RBAC: кто что может менять
  const data: any = {}
  const changes: Record<string, { from: any; to: any }> = {}

  const currentTags = ticket.tags.map((x) => x.tag.name).sort()

  // USER: только title/description и только пока OPEN
  if (user.role === 'USER') {
    if (ticket.status !== 'OPEN') {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    if (body.title !== undefined && body.title !== ticket.title) {
      data.title = body.title
      changes.title = { from: ticket.title, to: body.title }
    }
    if (body.description !== undefined && body.description !== ticket.description) {
      data.description = body.description
      changes.description = { from: ticket.description, to: body.description }
    }
  }

  // AGENT: только status у назначенных
  if (user.role === 'AGENT') {
    if (body.status !== undefined && body.status !== ticket.status) {
      data.status = body.status
      changes.status = { from: ticket.status, to: body.status }
    }
    const forbidden =
      body.title !== undefined ||
      body.description !== undefined ||
      body.priority !== undefined ||
      body.assignedToId !== undefined ||
      body.tags !== undefined

    if (forbidden) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // ADMIN: всё
  if (user.role === 'ADMIN') {
    if (body.title !== undefined && body.title !== ticket.title) {
      data.title = body.title
      changes.title = { from: ticket.title, to: body.title }
    }
    if (body.description !== undefined && body.description !== ticket.description) {
      data.description = body.description
      changes.description = { from: ticket.description, to: body.description }
    }
    if (body.status !== undefined && body.status !== ticket.status) {
      data.status = body.status
      changes.status = { from: ticket.status, to: body.status }
    }
    if (body.priority !== undefined && body.priority !== ticket.priority) {
      data.priority = body.priority
      changes.priority = { from: ticket.priority, to: body.priority }
    }
    if (body.assignedToId !== undefined) {
      const next = body.assignedToId ?? null
      if (next !== ticket.assignedToId) {
        data.assignedToId = next
        changes.assignedToId = { from: ticket.assignedToId, to: next }
      }
    }
    if (body.tags !== undefined) {
      const nextTags = uniq(body.tags).slice(0, 10).sort()
      const same =
        nextTags.length === currentTags.length &&
        nextTags.every((v, i) => v === currentTags[i])

      if (!same) {
        changes.tags = { from: currentTags, to: nextTags }
        data.tags = {
          deleteMany: {},
          create: nextTags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        }
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: true, changed: false }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...data,
      audits: {
        create: {
          actorId: user.id,
          action: 'ticket.update',
          metaJson: JSON.stringify({ changes }),
        },
      },
    },
    include: {
      createdBy: { select: { id: true, email: true, name: true, role: true } },
      assignedTo: { select: { id: true, email: true, name: true, role: true } },
      tags: { include: { tag: true } },
    },
  })

  return {
    ok: true,
    changed: true,
    ticket: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      createdBy: updated.createdBy,
      assignedTo: updated.assignedTo,
      tags: updated.tags.map((x) => x.tag.name),
    },
  }
})
