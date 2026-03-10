import bcrypt from "bcryptjs";
import { BlockKey, PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = process.env.DEMO_USER_EMAIL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;

  if (!demoEmail || !demoPassword) {
    console.log("Seed ignorado: defina DEMO_USER_EMAIL e DEMO_USER_PASSWORD para criar um usuario inicial.");
    return;
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const company = await prisma.company.upsert({
    where: { slug: "demo-company" },
    update: {
      name: "Empresa Demo",
    },
    create: {
      name: "Empresa Demo",
      slug: "demo-company",
    },
  });

  await prisma.companyBlockPermission.createMany({
    data: Object.values(BlockKey).map((block) => ({
      companyId: company.id,
      block,
      enabled: true,
    })),
    skipDuplicates: true,
  });

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      companyId: company.id,
      passwordHash,
      name: "Usuario Demo",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      companyId: company.id,
      email: demoEmail,
      name: "Usuario Demo",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Usuario demo pronto: ${demoEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
