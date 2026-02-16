import { z } from 'zod'
import { getQuery } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const Query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),

  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),

  q: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(50).optional(),

  sortBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),

  // эти фильтры реально применяются только для ADMIN
  createdById: z.string().trim().optional(),
  assignedToId: z.string().trim().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = Query.parse(getQuery(event))

  const skip = (q.page - 1) * q.perPage
  const take = q.perPage

  const where: any = {}

  // RBAC-ограничение
  if (user.role === 'USER') {
    where.createdById = user.id
  } else if (user.role === 'AGENT') {
    where.assignedToId = user.id
  } else if (user.role === 'ADMIN') {
    if (q.createdById) where.createdById = q.createdById
    if (q.assignedToId) where.assignedToId = q.assignedToId
  }

  if (q.status) where.status = q.status
  if (q.priority) where.priority = q.priority

  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: 'insensitive' } },
      { description: { contains: q.q, mode: 'insensitive' } },
    ]
  }

  if (q.tag) {
    where.tags = {
      some: {
        tag: { name: q.tag },
      },
    }
  }

  const [total, items] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { [q.sortBy]: q.sortDir },
      skip,
      take,
      include: {
        createdBy: { select: { id: true, email: true, name: true, role: true } },
        assignedTo: { select: { id: true, email: true, name: true, role: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    }),
  ])

  return {
    page: q.page,
    perPage: q.perPage,
    total,
    items: items.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdBy,
      assignedTo: t.assignedTo,
      tags: t.tags.map((x) => x.tag.name),
      commentsCount: t._count.comments,
    })),
  }
})
