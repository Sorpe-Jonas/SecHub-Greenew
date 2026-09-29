import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function ContactThanksPage() {
  return (
    <div className="landing-wrapper">
      <div className="landingBackdrop" aria-hidden="true">
        <div className="bg-glow bg-glow--top-left" />
        <div className="bg-grid" />
      </div>

      <main className="pageShell landingContainer">
        <SiteHeader />

        <section className="contactSection">
          <div className="sectionHeader">
            <span className="eyebrow">Recebemos seu contato</span>
            <h1 className="contactTitle">Obrigado!</h1>
            <p className="contactSubtitle">
              Registramos os seus dados com sucesso. Em breve nosso time entra em
              contato para dar continuidade.
            </p>
          </div>

          <div className="heroActions">
            <Link className="primaryButton" href="/">
              Voltar para o inicio
            </Link>
            <Link className="secondaryButton" href="/login">
              Entrar no portal
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
