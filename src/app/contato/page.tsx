import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

export default function ContactPage() {
  return (
    <div className="landing-wrapper">
      <div className="bg-glow bg-glow--top-left" />
      <div className="bg-glow bg-glow--bottom-right" />
      <div className="bg-grid" />

      <main className="pageShell landingContainer">
        <SiteHeader />

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

      <SiteFooter />
    </div>
  );
}
