import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function GrafanaUnconfiguredPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="moduleShell">
      <span className="eyebrow">Configuracao Pendente</span>
      <h1>Grafana ainda nao configurado</h1>
      <p>
        Defina a URL do Grafana no painel de Configuracoes ou use `NEXT_PUBLIC_GRAFANA_URL` como
        fallback de ambiente.
      </p>
      <Link className="secondaryButton linkButton" href="/dashboard">
        Voltar ao dashboard
      </Link>
    </main>
  );
}
