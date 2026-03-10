import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { getVisibleCards } from "@/lib/blocks";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      blockPermissions: {
        where: {
          canView: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  const runtime = await getPlatformRuntimeConfig();
  const cards = getVisibleCards(user.role, user.blockPermissions).map((card) =>
    card.block === "GRAFANA"
      ? {
          ...card,
          href: runtime.grafanaUrl || "/grafana-unconfigured",
          external: Boolean(runtime.grafanaUrl),
        }
      : card,
  );

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="dashboardShell">
      <section className="dashboardHero">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Portal Principal</span>
          <h1>Bem-vindo, {session.user.name || session.user.email}.</h1>
          <p>
            {user.company
              ? `Empresa ativa: ${user.company.name}. O painel abaixo respeita role e blocos permitidos para o usuario logado.`
              : "Usuario sem empresa vinculada. Conclua o onboarding administrativo para liberar os modulos corretos."}
          </p>
        </div>
        <form action={handleSignOut}>
          <button className="secondaryButton" type="submit">
            Sair
          </button>
        </form>
      </section>

      <section className="cardGrid">
        {cards.length === 0 ? (
          <div className="emptyCard">
            <span className="cardLabel">Sem blocos</span>
            <h2>Nenhum modulo liberado</h2>
            <p>Este usuario ainda nao possui blocos ativos. Ajuste as permissoes no painel administrativo.</p>
          </div>
        ) : null}
        {cards.map((card) => {
          const className = `portalCard ${card.tone}`;

          if (card.external && card.href) {
            return (
              <a
                key={card.title}
                className={className}
                href={card.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className="cardLabel">Aplicativo</span>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                <strong>Abrir em nova aba</strong>
              </a>
            );
          }

          return (
            <Link key={card.title} className={className} href={card.href || "/dashboard"}>
              <span className="cardLabel">Aplicativo</span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <strong>Acessar modulo</strong>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
