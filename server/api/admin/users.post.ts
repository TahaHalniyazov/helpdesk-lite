import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireRole } from '~~/server/utils/auth'
import bcrypt from 'bcryptjs'

const Body = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN', 'AGENT', 'USER']),
})

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['ADMIN'])
  const raw = await readBody(event)
  const body = Body.parse(raw)

  const hashed = await bcrypt.hash(body.password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        password: hashed,
      } as any,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    await prisma.auditLog.create({
      data: {
        action: 'user.create',
        metaJson: JSON.stringify({ userId: user.id, email: user.email, role: user.role }),
        actor: { connect: { id: admin.id } },
      },
    })

    return user
  } catch (e: any) {
    if (String(e?.code) === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Email already exists' })
    }
    throw e
  }
})
