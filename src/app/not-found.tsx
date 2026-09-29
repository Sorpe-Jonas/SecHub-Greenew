import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function NotFound() {
  return (
    <div className="landing-wrapper">
      <div className="landingBackdrop" aria-hidden="true">
        <div className="bg-glow bg-glow--top-left" />
        <div className="bg-glow bg-glow--bottom-right" />
        <div className="bg-grid" />
      </div>

      <main className="pageShell landingContainer">
        <SiteHeader />

        <section className="contactSection">
          <div className="sectionHeader">
            <span className="eyebrow">Erro 404</span>
            <h1 className="contactTitle">Pagina nao encontrada.</h1>
            <p className="contactSubtitle">
              O endereco que voce tentou acessar nao existe ou foi movido.
            </p>
          </div>

          <div className="heroActions">
            <Link className="primaryButton" href="/">
              Voltar para o inicio
            </Link>
            <Link className="secondaryButton" href="/contato">
              Falar com um especialista
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
