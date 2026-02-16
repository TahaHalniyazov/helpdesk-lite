import { getRouterParam, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, createdById: true, assignedToId: true },
  })
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const canAccess =
    user.role === 'ADMIN' ||
    (user.role === 'USER' && ticket.createdById === user.id) ||
    (user.role === 'AGENT' && ticket.assignedToId === user.id)

  if (!canAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const comments = await prisma.comment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, email: true, name: true, role: true } },
    },
  })

  return {
    items: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: c.author,
    })),
  }
})
