import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default async function AuditPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <ModulePlaceholder
      eyebrow="Administracao"
      title="Auditoria"
      description="Este modulo reunira os logs sensiveis da plataforma, incluindo autenticacao, senhas, tickets e configuracoes."
    />
  );
}
