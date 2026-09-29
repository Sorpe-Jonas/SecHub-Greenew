import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getSettingsMap(keys: string[]) {
  const settings = await prisma.globalSetting.findMany({
    where: {
      key: {
        in: keys,
      },
    },
  });

  return new Map(settings.map((setting) => [setting.key, setting.value]));
}

export function readEncryptedValue(value?: unknown) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  try {
    return decryptSecret(value);
  } catch {
    return "";
  }
}

export function writeEncryptedValue(value: string) {
  return value ? encryptSecret(value) : "";
}

export async function getPlatformRuntimeConfig() {
  const map = await getSettingsMap([
    "platform_urls",
    "smtp_settings",
    "telegram_settings",
    "auth0_settings",
    "object_storage_settings",
    "google_settings",
  ]);

  const platform = asObject(map.get("platform_urls"));
  const smtp = asObject(map.get("smtp_settings"));
  const telegram = asObject(map.get("telegram_settings"));
  const auth0 = asObject(map.get("auth0_settings"));
  const objectStorage = asObject(map.get("object_storage_settings"));
  const google = asObject(map.get("google_settings"));

  return {
    appUrl:
      (typeof platform.appUrl === "string" && platform.appUrl) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
    grafanaUrl:
      (typeof platform.grafanaUrl === "string" && platform.grafanaUrl) ||
      process.env.NEXT_PUBLIC_GRAFANA_URL ||
      "",
    smtp: {
      enabled: Boolean(smtp.enabled),
      host: (typeof smtp.host === "string" && smtp.host) || process.env.SMTP_HOST || "",
      port:
        (typeof smtp.port === "string" && smtp.port) ||
        (typeof smtp.port === "number" ? String(smtp.port) : process.env.SMTP_PORT || "587"),
      user: readEncryptedValue(smtp.userEncrypted) || process.env.SMTP_USER || "",
      pass: readEncryptedValue(smtp.passEncrypted) || process.env.SMTP_PASS || "",
      from: (typeof smtp.from === "string" && smtp.from) || process.env.SMTP_FROM || "",
      userNameHint: (typeof smtp.userNameHint === "string" && smtp.userNameHint) || "",
    },
    telegram: {
      enabled: Boolean(telegram.enabled),
      chatId:
        (typeof telegram.chatId === "string" && telegram.chatId) || process.env.TELEGRAM_CHAT_ID || "",
      botToken: readEncryptedValue(telegram.botTokenEncrypted) || process.env.TELEGRAM_BOT_TOKEN || "",
      botTokenHint: (typeof telegram.botTokenHint === "string" && telegram.botTokenHint) || "",
      notificationEvents: asStringArray(telegram.notificationEvents),
      notificationEventsConfigured: Boolean(telegram.notificationEventsConfigured),
    },
    auth0: {
      issuer: (typeof auth0.issuer === "string" && auth0.issuer) || process.env.AUTH_AUTH0_ISSUER || "",
      clientId: (typeof auth0.clientId === "string" && auth0.clientId) || process.env.AUTH_AUTH0_ID || "",
    },
    google: {
      clientId: (typeof google.clientId === "string" && google.clientId) || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret:
        readEncryptedValue(google.clientSecretEncrypted) || process.env.GOOGLE_CLIENT_SECRET || "",
      calendarId: (typeof google.calendarId === "string" && google.calendarId) || "primary",
      timeZone: (typeof google.timeZone === "string" && google.timeZone) || "America/Sao_Paulo",
    },
    objectStorage: {
      enabled: Boolean(objectStorage.enabled),
      provider: (typeof objectStorage.provider === "string" && objectStorage.provider) || "local",
      accessKeyId:
        readEncryptedValue(objectStorage.accessKeyIdEncrypted) ||
        process.env.AWS_ACCESS_KEY_ID ||
        "",
      secretAccessKey:
        readEncryptedValue(objectStorage.secretAccessKeyEncrypted) ||
        process.env.AWS_SECRET_ACCESS_KEY ||
        "",
      bucket:
        (typeof objectStorage.bucket === "string" && objectStorage.bucket) ||
        process.env.BUCKET_NAME ||
        "",
      region:
        (typeof objectStorage.region === "string" && objectStorage.region) ||
        process.env.REGION ||
        "",
      endpoint:
        (typeof objectStorage.endpoint === "string" && objectStorage.endpoint) ||
        process.env.ENDPOINT_URL ||
        "",
    },
  };
}
