import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function buildPublicObjectUrl(endpoint: string, bucket: string, key: string) {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  return `${normalizedEndpoint}/${bucket}/${key}`;
}

async function getS3Client() {
  const config = await getPlatformRuntimeConfig();

  if (
    !config.objectStorage.enabled ||
    config.objectStorage.provider !== "b2" ||
    !config.objectStorage.accessKeyId ||
    !config.objectStorage.secretAccessKey ||
    !config.objectStorage.bucket ||
    !config.objectStorage.endpoint ||
    !config.objectStorage.region
  ) {
    return null;
  }

  return {
    config,
    client: new S3Client({
      region: config.objectStorage.region,
      endpoint: config.objectStorage.endpoint,
      credentials: {
        accessKeyId: config.objectStorage.accessKeyId,
        secretAccessKey: config.objectStorage.secretAccessKey,
      },
    }),
  };
}

export async function uploadStorageFile(params: {
  file: File;
  folder: "tickets" | "financial" | "healthcheck";
}) {
  const safeName = sanitizeFileName(params.file.name || "arquivo");
  const finalName = `${Date.now()}-${randomUUID()}-${safeName}`;

  const s3 = await getS3Client();

  if (s3) {
    const key = `${params.folder}/${finalName}`;
    const arrayBuffer = await params.file.arrayBuffer();

    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.config.objectStorage.bucket,
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: params.file.type || "application/octet-stream",
      }),
    );

    return {
      fileName: params.file.name || safeName,
      storagePath: buildPublicObjectUrl(
        s3.config.objectStorage.endpoint,
        s3.config.objectStorage.bucket,
        key,
      ),
      mimeType: params.file.type || "application/octet-stream",
      storageKey: key,
    };
  }

  const relativeDir = path.join("uploads", params.folder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, finalName), buffer);

  return {
    fileName: params.file.name || safeName,
    storagePath: `/${path.join(relativeDir, finalName).replace(/\\/g, "/")}`,
    mimeType: params.file.type || "application/octet-stream",
    storageKey: finalName,
  };
}

export async function deleteStorageFile(storagePath: string) {
  const s3 = await getS3Client();

  if (s3 && storagePath.startsWith(s3.config.objectStorage.endpoint)) {
    const prefix = `${s3.config.objectStorage.endpoint.replace(/\/+$/, "")}/${s3.config.objectStorage.bucket}/`;
    const key = storagePath.startsWith(prefix) ? storagePath.slice(prefix.length) : "";

    if (key) {
      await s3.client.send(
        new DeleteObjectCommand({
          Bucket: s3.config.objectStorage.bucket,
          Key: key,
        }),
      );
    }

    return;
  }

  if (storagePath.startsWith("/uploads/")) {
    const relativePath = storagePath.replace(/^\/+/, "");
    const absolutePath = path.join(process.cwd(), "public", relativePath);

    try {
      await unlink(absolutePath);
    } catch {
      // Ignore missing local file.
    }
  }
}
