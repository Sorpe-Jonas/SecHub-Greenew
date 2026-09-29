import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="landingHeader">
      <Link className="brandHomeLink" href="/" aria-label="Inicio - SecHub">
        <span className="brandMark" aria-hidden="true">
          S
        </span>
        <span className="brandWordmark">sechub</span>
      </Link>
      <nav className="landingNav">
        <Link href="/#servicos">Serviços</Link>
        <Link href="/#vantagens">Vantagens</Link>
        <Link href="/contato">Contato</Link>
        <Link className="loginHeaderButton" href="/login">
          Entrar
        </Link>
      </nav>
    </header>
  );
}
