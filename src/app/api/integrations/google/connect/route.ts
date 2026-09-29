import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { buildGoogleAuthUrl, getGoogleOAuthClient } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const client = await getGoogleOAuthClient();
  if (!client) {
    return NextResponse.redirect(new URL("/leads?google=unconfigured", origin));
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildGoogleAuthUrl(client, state));

  response.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}
