import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/authz";

export default async function GrafanaUnconfiguredPage() {
  const user = await requireCurrentUser();

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
          <span className="eyebrow">Configuracao Pendente</span>
          <h1>Grafana ainda nao configurado</h1>
          <p>
            Defina a URL do Grafana no painel de Configuracoes ou use `NEXT_PUBLIC_GRAFANA_URL` como
            fallback de ambiente.
          </p>
        </div>
        <Link className="secondaryButton linkButton" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </section>
    </AppShell>
  );
}
