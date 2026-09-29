import Link from "next/link";

import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

export default function ContactPage() {
  return (
    <main className="pageShell">
      <section className="authShell">
        <div className="authIntro">
          <span className="eyebrow">Fale com a gente</span>
          <h1>Vamos entender a sua demanda.</h1>
          <p>
            Preencha os dados abaixo e nosso time entra em contato para entender
            o seu cenario e propor a melhor solucao de TI.
          </p>
          <p className="helperText">
            Ja e cliente? <Link href="/login">Acesse o portal</Link>.
          </p>
        </div>

        <div className="authCard">
          <div className="loginHeading">
            <span className="eyebrow">Contato</span>
            <h2>Solicitar retorno</h2>
            <p>Retornamos o mais breve possivel.</p>
          </div>
          <LeadCaptureForm />
        </div>
      </section>
    </main>
  );
}
