import Link from "next/link";

export default function ContactThanksPage() {
  return (
    <main className="pageShell">
      <section className="loginShell">
        <div className="loginCard">
          <div className="loginBrand">
            <div className="brandHomeLink brandStatic" aria-label="SecHub">
              <span className="brandMark" aria-hidden="true">
                S
              </span>
              <span className="brandWordmark">sechub</span>
            </div>
            <p>Plataforma de TI corporativa.</p>
          </div>

          <div className="loginHeading">
            <span className="eyebrow">Recebemos seu contato</span>
            <h1>Obrigado!</h1>
            <p>
              Registramos os seus dados com sucesso. Em breve nosso time entra
              em contato para dar continuidade.
            </p>
          </div>

          <Link className="primaryButton" href="/">
            Voltar para o inicio
          </Link>

          <p className="helperText">
            Ja e cliente? <Link href="/login">Entrar no portal</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
