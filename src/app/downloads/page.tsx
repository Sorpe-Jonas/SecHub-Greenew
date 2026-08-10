import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { DownloadsView } from "@/components/downloads/downloads-view";

export default async function DownloadsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const user = await requireCurrentUser();

  const resources = await prisma.downloadResource.findMany({
    where: user.companyId ? { companyId: user.companyId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const viewResources = resources.map((resource) => ({
    id: resource.id,
    fileName: resource.fileName,
    storagePath: resource.storagePath,
    description: resource.description,
    uploadedByName: resource.uploadedBy.name || resource.uploadedBy.email,
    createdAt: resource.createdAt.toISOString(),
  }));

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Downloads</span>
          <h1>Biblioteca de arquivos e links</h1>
          <p>
            Aqui voce pode acessar recursos para download. Apenas administradores podem adicionar ou
            remover arquivos; usuarios comuns podem visualizar e baixar.
          </p>
        </div>
      </section>

      <DownloadsView resources={viewResources} canManage={user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN} />
    </AppShell>
  );
}
