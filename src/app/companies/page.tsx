import { InvitationStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { CompanyForm } from "@/components/admin/company-form";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const companies = await prisma.company.findMany({
    include: {
      users: true,
      invitations: {
        where: {
          status: InvitationStatus.PENDING,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Empresas</span>
          <h1>Ambiente multiempresa</h1>
          <p>O Admin Total cria empresas, acompanha usuarios por tenant e controla o crescimento da plataforma.</p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Nova empresa</span>
              <h2>Cadastrar tenant</h2>
            </div>
          </div>
          <CompanyForm />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Resumo</span>
              <h2>Empresas criadas</h2>
            </div>
          </div>
          <div className="ticketTable">
            {companies.map((company) => (
              <div key={company.id} className="statementCard">
                <div className="ticketRow">
                  <div>
                    <strong>{company.name}</strong>
                    <span>{company.slug}</span>
                  </div>
                  <div>
                    <strong>{company.status}</strong>
                    <span>{company.users.length} usuario(s)</span>
                  </div>
                </div>
                <div className="detailList">
                  <div>
                    <strong>Convites pendentes</strong>
                    <span>{company.invitations.length}</span>
                  </div>
                  <div>
                    <strong>Criada em</strong>
                    <span>{company.createdAt.toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
