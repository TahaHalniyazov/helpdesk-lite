import { prisma } from '~~/server/utils/prisma'
import { clearSessionCookie } from '~~/server/utils/auth'
import { getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const sid = getCookie(event, 'hd_session')
  if (sid) await prisma.session.delete({ where: { id: sid } }).catch(() => {})
  clearSessionCookie(event)
  return { ok: true }
})
