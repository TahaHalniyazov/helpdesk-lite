import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import { hashPassword } from '../server/utils/password'

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL!
  const password = process.env.SEED_ADMIN_PASSWORD!
  const name = process.env.SEED_ADMIN_NAME || 'Admin'

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    console.log('Admin already exists:', email)
    return
  }

  const hash = await hashPassword(password)

  await prisma.user.create({
    data: {
      email,
      name,
      password: hash,
      role: 'ADMIN',
    },
  })

  console.log('Admin created:', email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
