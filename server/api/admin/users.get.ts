import { z } from 'zod'
import { getQuery } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireRole } from '~~/server/utils/auth'

const Query = z.object({
  role: z.enum(['ADMIN', 'AGENT', 'USER']).optional(),
  q: z.string().trim().min(1).max(200).optional(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const q = Query.parse(getQuery(event))

  const where: any = {}
  if (q.role) where.role = q.role
  if (q.q) {
    where.OR = [
      { email: { contains: q.q, mode: 'insensitive' } },
      { name: { contains: q.q, mode: 'insensitive' } },
    ]
  }

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return { items }
})
