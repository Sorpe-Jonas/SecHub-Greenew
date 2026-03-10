import { UserRole, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      blockPermissions: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  if (user.status !== UserStatus.ACTIVE) {
    redirect("/");
  }

  return user;
}

export function canManageCompanyTickets(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}
