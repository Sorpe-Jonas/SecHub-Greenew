import Link from "next/link";

export function SiteFooter() {
  return (
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
            Gestão de TI, suporte de infraestrutura e atendimento corporativo em
            uma única plataforma.
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
  );
}
