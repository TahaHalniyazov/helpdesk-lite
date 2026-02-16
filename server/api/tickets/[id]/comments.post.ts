import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const Body = z.object({
  body: z.string().min(1).max(2000),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const raw = await readBody(event)
  const { body } = Body.parse(raw)

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

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        body,
      },
      include: {
        author: { select: { id: true, email: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.create({
       data: {
    action: 'comment.create',
    metaJson: JSON.stringify({ length: body.length }),
    actor: { connect: { id: user.id } },
    ticket: { connect: { id: ticket.id } },
  },
    }),
  ])

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    author: comment.author,
  }
})
