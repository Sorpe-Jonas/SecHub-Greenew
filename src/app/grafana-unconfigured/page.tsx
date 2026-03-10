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
        Defina `NEXT_PUBLIC_GRAFANA_URL` no ambiente para que o card direcione para a instancia
        correta do Grafana.
      </p>
      <Link className="secondaryButton linkButton" href="/dashboard">
        Voltar ao dashboard
      </Link>
    </main>
  );
}
