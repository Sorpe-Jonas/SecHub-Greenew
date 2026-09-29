import Link from "next/link";

import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

export default function ContactPage() {
  return (
    <div className="landing-wrapper">
      <div className="bg-glow bg-glow--top-left" />
      <div className="bg-glow bg-glow--bottom-right" />
      <div className="bg-grid" />

      <main className="pageShell landingContainer">
        <header className="landingHeader">
          <Link className="brandHomeLink" href="/" aria-label="Voltar para a pagina inicial">
            <span className="brandMark" aria-hidden="true">
              S
            </span>
            <span className="brandWordmark">sechub</span>
          </Link>
          <nav className="landingNav">
            <Link href="/#servicos">Serviços</Link>
            <Link href="/#vantagens">Vantagens</Link>
            <Link className="loginHeaderButton" href="/login">
              Entrar
            </Link>
          </nav>
        </header>

        <section className="contactSection">
          <div className="sectionHeader">
            <span className="eyebrow">Fale com a gente</span>
            <h1 className="contactTitle">
              Vamos entender a <span className="text-gradient">sua demanda</span>.
            </h1>
            <p className="contactSubtitle">
              Preencha os dados abaixo e nosso time entra em contato para entender
              o seu cenario e propor a melhor solucao de TI.
            </p>
          </div>

          <div className="contactCard">
            <LeadCaptureForm />
          </div>
        </section>
      </main>

      <footer className="landingFooter">
        <div className="landingFooterInner">
          <div className="landingFooterBrand">
            <div className="brandHomeLink brandStatic" aria-label="SecHub">
              <span className="brandMark" aria-hidden="true">
                S
              </span>
              <span className="brandWordmark">sechub</span>
            </div>
            <p>
              Gestão de TI, suporte de infraestrutura e atendimento corporativo
              em uma única plataforma.
            </p>
          </div>
          <nav className="landingFooterNav" aria-label="Rodape">
            <Link href="/#servicos">Serviços</Link>
            <Link href="/#vantagens">Vantagens</Link>
            <Link href="/contato">Contato</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
        <div className="landingFooterBottom">
          <span>© {new Date().getFullYear()} SecHub. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
