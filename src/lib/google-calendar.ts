import { google, type Auth, type calendar_v3 } from "googleapis";

import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig, readEncryptedValue } from "@/lib/runtime-settings";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

export function getGoogleRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/+$/, "")}/api/integrations/google/callback`;
}

export async function getGoogleOAuthClient() {
  const config = await getPlatformRuntimeConfig();

  if (!config.google.clientId || !config.google.clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    getGoogleRedirectUri(config.appUrl),
  );
}

export function buildGoogleAuthUrl(client: Auth.OAuth2Client, state: string) {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export async function getCalendarClientForUser(userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });

  if (!connection) {
    return null;
  }

  const client = await getGoogleOAuthClient();
  if (!client) {
    return null;
  }

  const refreshToken = readEncryptedValue(connection.refreshTokenEncrypted);
  if (!refreshToken) {
    return null;
  }

  client.setCredentials({ refresh_token: refreshToken });

  return {
    calendar: google.calendar({ version: "v3", auth: client }),
    connection,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeLocalDateTime(local: string) {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [hours = "00", minutes = "00"] = timePart.split(":");
  return { datePart, hours, minutes };
}

function addMinutesToLocalDateTime(local: string, minutes: number) {
  const { datePart, hours, minutes: mins } = normalizeLocalDateTime(local);
  const [year, month, day] = datePart.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day, Number(hours), Number(mins));
  const end = new Date(base + minutes * 60 * 1000);

  return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}:00`;
}

export async function createCalendarMeeting(params: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  timeZone: string;
  summary: string;
  description?: string;
  startLocal: string;
  durationMinutes: number;
  attendee: { email: string; name?: string | null };
}) {
  const { datePart, hours, minutes } = normalizeLocalDateTime(params.startLocal);
  const startDateTime = `${datePart}T${hours}:${minutes}:00`;
  const endDateTime = addMinutesToLocalDateTime(params.startLocal, params.durationMinutes);

  const response = await params.calendar.events.insert({
    calendarId: params.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: startDateTime, timeZone: params.timeZone },
      end: { dateTime: endDateTime, timeZone: params.timeZone },
      attendees: [
        {
          email: params.attendee.email,
          displayName: params.attendee.name || undefined,
        },
      ],
      conferenceData: {
        createRequest: {
          requestId: `sechub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return response.data;
}
