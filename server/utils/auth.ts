import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie, createError } from 'h3'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'
const COOKIE = 'hd_session'

export async function getAuthUser(event: H3Event) {
  const sessionId = getCookie(event, COOKIE)
  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    return null
  }

  return session.user
}

export function setSessionCookie(event: H3Event, sessionId: string, maxAgeSec: number) {
  setCookie(event, COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSec,
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

export async function requireUser(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}

type Role = 'ADMIN' | 'AGENT' | 'USER'

export async function requireRole(event: any, roles: Role[]) {
  const user = await requireUser(event)
  if (!roles.includes(user.role as Role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}