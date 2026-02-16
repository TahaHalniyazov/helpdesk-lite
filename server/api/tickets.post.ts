import { z } from 'zod'
import { readBody } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const Body = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const raw = await readBody(event)
  const body = Body.parse(raw)

  const tags = (body.tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)

  const ticket = await prisma.ticket.create({
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority ?? 'MEDIUM',
      createdById: user.id,
      tags: tags.length
        ? {
            create: tags.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            })),
          }
        : undefined,
      audits: {
        create: {
          actorId: user.id,
          action: 'ticket.create',
          metaJson: JSON.stringify({ title: body.title }),
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
  }
})
