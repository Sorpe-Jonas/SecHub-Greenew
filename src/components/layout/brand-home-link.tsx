import Image from "next/image";
import Link from "next/link";

export function BrandHomeLink() {
  return (
    <Link className="brandHomeLink" href="/dashboard" aria-label="Voltar para o dashboard">
      <Image src="/sechub-logo.svg" alt="SecHub" width={164} height={44} priority />
    </Link>
  );
}
