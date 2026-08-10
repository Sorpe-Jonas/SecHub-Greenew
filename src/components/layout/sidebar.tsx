import Link from "next/link";
import { signOut } from "@/auth";
import { getVisibleCards } from "@/lib/blocks";
import type { UserRole } from "@prisma/client";
import type { UserBlockPermission } from "@prisma/client";

type SidebarProps = {
  role: UserRole;
  permissions: Array<Pick<UserBlockPermission, "block" | "canView">>;
  userName?: string | null;
  userEmail?: string | null;
  companyName?: string | null;
};

const navIcons: Record<string, string> = {
  PASSWORDS: "🔐",
  TICKETS: "🎫",
  GRAFANA: "📊",
  TIMESHEET: "⏱",
  FINANCIAL: "💳",
  DOWNLOADS: "📥",
  USERS: "👥",
  COMPANIES: "🏢",
  AUDIT: "🧾",
  SETTINGS: "⚙️",
};

export function Sidebar({ role, permissions, userName, userEmail, companyName }: SidebarProps) {
  const cards = getVisibleCards(role, permissions);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <aside className="appSidebar">
      <div className="sidebarBrand">
        <Link href="/dashboard" className="sidebarBrandLink" aria-label="Ir para o dashboard">
          <span className="brandMark" aria-hidden="true">
            S
          </span>
          <span className="sidebarBrandName">sechub</span>
        </Link>
      </div>

      <nav className="sidebarNav" aria-label="Navegacao principal">
        <Link className="sidebarNavItem" href="/dashboard">
          <span className="sidebarNavIcon" aria-hidden="true">
            🏠
          </span>
          <span>Dashboard</span>
        </Link>

        <span className="sidebarSectionLabel">Modulos</span>
        {cards.map((card) => (
          <Link
            key={card.block}
            className="sidebarNavItem"
            href={card.href || "/dashboard"}
            {...(card.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="sidebarNavIcon" aria-hidden="true">
              {navIcons[card.block] || "📦"}
            </span>
            <span>{card.title}</span>
            {card.external ? <span className="sidebarExternal">↗</span> : null}
          </Link>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="sidebarUser">
          <span className="sidebarAvatar" aria-hidden="true">
            {(userName || userEmail || "U").charAt(0).toUpperCase()}
          </span>
          <div className="sidebarUserInfo">
            <strong>{userName || "Usuario"}</strong>
            <span>{companyName || userEmail || ""}</span>
          </div>
        </div>
        <form action={handleSignOut}>
          <button className="sidebarSignOut" type="submit">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}