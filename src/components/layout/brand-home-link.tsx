import Link from "next/link";

export function BrandHomeLink() {
  return (
    <Link className="brandHomeLink" href="/dashboard" aria-label="Voltar para o dashboard">
      <span className="brandMark" aria-hidden="true">
        S
      </span>
      <span className="brandWordmark">sechub</span>
    </Link>
  );
}
