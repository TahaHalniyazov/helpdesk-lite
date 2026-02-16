import { getRouterParam, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, email: true, name: true, role: true } },
      assignedTo: { select: { id: true, email: true, name: true, role: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
    },
  })

  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const canAccess =
    user.role === 'ADMIN' ||
    (user.role === 'USER' && ticket.createdById === user.id) ||
    (user.role === 'AGENT' && ticket.assignedToId === user.id)

  if (!canAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    tags: ticket.tags.map((x) => x.tag.name),
    commentsCount: ticket._count.comments,
  }
})
