import { prisma } from '~~/server/utils/prisma'
import { clearSessionCookie } from '~~/server/utils/auth'
import { getCookie, parseCookies, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  // 1) Удаляем серверную сессию (правильный logout)
  const sid = getCookie(event, 'hd_session')
  if (sid) await prisma.session.delete({ where: { id: sid } }).catch(() => {})

  // 2) Точечно чистим auth-cookie (как было)
  clearSessionCookie(event)

  // 3) Дополнительно: пытаемся удалить ВСЕ cookies, которые пришли в запросе (как во втором)
  const cookies = parseCookies(event)
  for (const name of Object.keys(cookies)) {
    setCookie(event, name, '', { maxAge: 0, path: '/' })
  }

  return { ok: true }
})
