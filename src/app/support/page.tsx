import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { TicketCreateForm } from "@/components/support/ticket-create-form";
import { canManageCompanyTickets, requireCurrentUser } from "@/lib/authz";
import { getTicketCatalogItem, ticketCatalog } from "@/lib/tickets";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const subcategory = typeof params.subcategory === "string" ? params.subcategory : undefined;
  const selectedCategory = getTicketCatalogItem(category);

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
          <span className="eyebrow">Suporte</span>
          <h1>Chamados e atendimento</h1>
          <p>
            {canManageCompanyTickets(user.role)
              ? "Voce visualiza os chamados da empresa e pode responder conforme o perfil."
              : "Voce visualiza apenas os seus tickets e pode acompanhar a conversa por aqui."}
          </p>
        </div>
      </section>

      {!selectedCategory ? (
        <section className="cardGrid">
          {ticketCatalog.map((item) => (
            <Link
              key={item.category}
              className="portalCard cyan"
              href={`/support?category=${item.category}`}
            >
              <span className="cardLabel">Novo ticket</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <strong>Escolher categoria</strong>
            </Link>
          ))}
        </section>
      ) : !subcategory ? (
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">{selectedCategory.title}</span>
              <h2>Escolha o tipo do chamado</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/support">
              Voltar
            </Link>
          </div>
          <div className="subcardGrid">
            {selectedCategory.subcategories.map((item) => (
              <Link
                key={item}
                className="subcardLink"
                href={`/support?category=${selectedCategory.category}&subcategory=${encodeURIComponent(item)}`}
              >
                <strong>{item}</strong>
                <span>Preencher formulario com essa trilha</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">
                {selectedCategory.title} / {subcategory}
              </span>
              <h2>Abrir novo ticket</h2>
            </div>
            <Link className="secondaryButton linkButton" href={`/support?category=${selectedCategory.category}`}>
              Voltar
            </Link>
          </div>
          <TicketCreateForm category={selectedCategory.category} subcategory={subcategory} />
        </section>
      )}

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Operacao</span>
            <h2>Fila e relatorios separados</h2>
          </div>
          <Link className="secondaryButton linkButton" href="/support/queue">
            Abrir fila
          </Link>
        </div>
        <p className="helperText">
          A listagem de tickets saiu desta tela para reduzir excesso de informacao. Em{" "}
          <Link href="/support/queue">/support/queue</Link> voce encontra filtros por solicitante,
          periodo, status, prioridade, exportacao CSV e resumo com indicadores.
        </p>
      </section>
    </AppShell>
  );
}
