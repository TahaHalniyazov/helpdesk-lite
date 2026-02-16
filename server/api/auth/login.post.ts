import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { verifyPassword } from '~~/server/utils/password'
import { setSessionCookie } from '~~/server/utils/auth'

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const { email, password } = Body.parse(raw)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })

  const ok = await verifyPassword(password, user.password)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })

  const maxAgeSec = 60 * 60 * 24 * 30 // 30 дней
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000)

  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
  })

  setSessionCookie(event, session.id, maxAgeSec)

  return { id: user.id, email: user.email, name: user.name, role: user.role }
})
