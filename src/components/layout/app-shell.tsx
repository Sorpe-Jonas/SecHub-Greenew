import { Sidebar } from "@/components/layout/sidebar";
import type { UserRole } from "@prisma/client";
import type { UserBlockPermission } from "@prisma/client";

type AppShellProps = {
  children: React.ReactNode;
  role: UserRole;
  permissions: Array<Pick<UserBlockPermission, "block" | "canView">>;
  userName?: string | null;
  userEmail?: string | null;
  companyName?: string | null;
};

export function AppShell({
  children,
  role,
  permissions,
  userName,
  userEmail,
  companyName,
}: AppShellProps) {
  return (
    <div className="appShell">
      <Sidebar
        role={role}
        permissions={permissions}
        userName={userName}
        userEmail={userEmail}
        companyName={companyName}
      />
      <main className="appMain">{children}</main>
    </div>
  );
}