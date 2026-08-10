"use server";

import { signOut } from "@/auth";

export async function handleSidebarSignOut() {
  await signOut({ redirectTo: "/" });
}