import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const items = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  })

  return { items }
})
