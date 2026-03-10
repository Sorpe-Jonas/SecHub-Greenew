import Link from "next/link";

import { BrandHomeLink } from "@/components/layout/brand-home-link";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ModulePlaceholder({ eyebrow, title, description }: ModulePlaceholderProps) {
  return (
    <main className="moduleShell">
      <BrandHomeLink />
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="secondaryButton linkButton" href="/dashboard">
        Voltar ao dashboard
      </Link>
    </main>
  );
}
