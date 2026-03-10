import { BlockKey, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

function slugifyCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function isBootstrapRequired() {
  const userCount = await prisma.user.count();
  return userCount === 0;
}

export async function bootstrapPlatform(input: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  password: string;
}) {
  const { companyName, adminName, adminEmail, password } = input;
  const baseSlug = slugifyCompanyName(companyName) || "empresa-inicial";
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const userCount = await tx.user.count();

    if (userCount > 0) {
      throw new Error("Bootstrap ja concluido.");
    }

    const company = await tx.company.create({
      data: {
        name: companyName,
        slug: baseSlug,
      },
    });

    await tx.companyBlockPermission.createMany({
      data: Object.values(BlockKey).map((block) => ({
        companyId: company.id,
        block,
        enabled: true,
      })),
    });

    const user = await tx.user.create({
      data: {
        companyId: company.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.globalSetting.createMany({
      data: [
        {
          key: "session_timeout_minutes",
          value: 120,
          updatedById: user.id,
        },
        {
          key: "platform_bootstrapped_at",
          value: new Date().toISOString(),
          updatedById: user.id,
        },
      ],
    });

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        module: "SETTINGS",
        action: "bootstrap_completed",
        entityType: "platform",
        entityId: company.id,
        description: "Primeiro SUPER_ADMIN e empresa inicial criados.",
      },
    });

    return { company, user };
  });
}
