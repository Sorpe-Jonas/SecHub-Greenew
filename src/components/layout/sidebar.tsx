"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleSidebarSignOut } from "@/app/actions/sidebar-actions";
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

function SvgIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const navIcons: Record<string, string> = {
  PASSWORDS: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  TICKETS: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  GRAFANA: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  TIMESHEET: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  FINANCIAL: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  DOWNLOADS: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  USERS: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  COMPANIES: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  AUDIT: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  SETTINGS: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

export function Sidebar({ role, permissions, userName, userEmail, companyName }: SidebarProps) {
  const pathname = usePathname();
  const cards = getVisibleCards(role, permissions);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="appSidebar">
      <div className="sidebarBrand">
        <Link href="/dashboard" className="sidebarBrandLink" aria-label="Ir para o dashboard">
          <span className="brandMark" aria-hidden="true">S</span>
          <span className="sidebarBrandName">sechub</span>
        </Link>
      </div>

      <nav className="sidebarNav" aria-label="Navegacao principal">
        <Link
          className="sidebarNavItem"
          href="/dashboard"
          data-active={isActive("/dashboard")}
        >
          <span className="sidebarNavIcon" aria-hidden="true">
            <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </span>
          <span>Dashboard</span>
        </Link>

        <span className="sidebarSectionLabel">Modulos</span>
        {cards.map((card) => (
          <Link
            key={card.block}
            className="sidebarNavItem"
            href={card.href || "/dashboard"}
            data-active={card.href ? isActive(card.href) : false}
            {...(card.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="sidebarNavIcon" aria-hidden="true">
              {navIcons[card.block] ? <SvgIcon d={navIcons[card.block]} /> : <SvgIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
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
        <form action={handleSidebarSignOut}>
          <button className="sidebarSignOut" type="submit">
            <SvgIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={16} />
            <span style={{ marginLeft: 8 }}>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}