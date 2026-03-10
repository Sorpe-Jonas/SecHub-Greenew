import { BlockKey, UserRole, type PasswordEntry, type PasswordEntryVersion, type User } from "@prisma/client";

export function parseTags(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function canManagePasswordEntry(user: Pick<User, "role" | "companyId" | "id">, companyId: string) {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && user.companyId === companyId)
  );
}

export function canExportPasswords(user: Pick<User, "role">) {
  return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
}

export function getFaviconUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export function assertPasswordBlockAccess(blocks: Array<{ block: BlockKey; canView: boolean }>) {
  return blocks.some((item) => item.block === BlockKey.PASSWORDS && item.canView);
}

export type EntryWithVersions = PasswordEntry & {
  versions: PasswordEntryVersion[];
};
