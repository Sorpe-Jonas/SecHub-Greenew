import { AuditModule, UserRole } from "@prisma/client";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getGoogleOAuthClient } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { writeEncryptedValue } from "@/lib/runtime-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true },
  });

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const cookieState = cookieStore.get("g_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/leads?google=error", origin));
  }

  const client = await getGoogleOAuthClient();
  if (!client) {
    return NextResponse.redirect(new URL("/leads?google=unconfigured", origin));
  }

  try {
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/leads?google=error", origin));
    }

    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    const googleEmail = data.email ?? null;

    const tokenData = {
      googleEmail,
      accessTokenEncrypted: writeEncryptedValue(tokens.access_token ?? ""),
      refreshTokenEncrypted: writeEncryptedValue(tokens.refresh_token),
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    };

    await prisma.googleCalendarConnection.upsert({
      where: { userId: user.id },
      update: tokenData,
      create: { userId: user.id, ...tokenData },
    });

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        module: AuditModule.LEAD,
        action: "google_calendar_connected",
        entityType: "google_calendar_connection",
        entityId: user.id,
        description: `Conta Google Calendar conectada${googleEmail ? `: ${googleEmail}` : ""}.`,
      },
    });

    const response = NextResponse.redirect(new URL("/leads?google=connected", origin));
    response.cookies.delete("g_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/leads?google=error", origin));
  }
}
