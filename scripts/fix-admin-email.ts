import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function main() {
  await prisma.user.update({
    where: { email: 'admin@local' },
    data: { email: 'admin@local.test' },
  })
  console.log('Updated admin email to admin@local.test')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
