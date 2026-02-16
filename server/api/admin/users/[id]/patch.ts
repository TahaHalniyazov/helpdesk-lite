import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireRole } from '~~/server/utils/auth'
import bcrypt from 'bcryptjs'

const Body = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'AGENT', 'USER']).optional(),
  password: z.string().min(8).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const raw = await readBody(event)
  const body = Body.parse(raw)

  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const data: any = {}
  const changes: any = {}

  if (body.name !== undefined && body.name !== current.name) {
    data.name = body.name
    changes.name = { from: current.name, to: body.name }
  }
  if (body.role !== undefined && body.role !== current.role) {
    data.role = body.role
    changes.role = { from: current.role, to: body.role }
  }
  if (body.password !== undefined) {
    data.password = await bcrypt.hash(body.password, 10)
    changes.password = { reset: true }
  }

  if (Object.keys(data).length === 0) return { ok: true, changed: false }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  await prisma.auditLog.create({
    data: {
      action: 'user.update',
      metaJson: JSON.stringify({ userId: id, changes }),
      actor: { connect: { id: admin.id } },
    },
  })

  return { ok: true, changed: true, user: updated }
})
