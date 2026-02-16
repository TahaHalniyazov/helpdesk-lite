import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireRole } from '~~/server/utils/auth'

const Body = z.object({
  name: z.string().trim().min(1).max(50),
})

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['ADMIN'])
  const raw = await readBody(event)
  const { name } = Body.parse(raw)

  try {
    const tag = await prisma.tag.create({ data: { name } })

    await prisma.auditLog.create({
      data: {
        action: 'tag.create',
        metaJson: JSON.stringify({ name }),
        actor: { connect: { id: admin.id } },
      },
    })

    return tag
  } catch (e: any) {
    if (String(e?.code) === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Tag already exists' })
    }
    throw e
  }
})
