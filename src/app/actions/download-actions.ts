"use server";

import { AuditModule, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile, uploadStorageFile } from "@/lib/storage";

export type DownloadFormState = {
  error?: string;
  success?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function addDownloadResourceAction(
  _prevState: DownloadFormState,
  formData: FormData,
): Promise<DownloadFormState> {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente administradores podem adicionar downloads." };
  }

  if (!user.companyId) {
    return { error: "Usuario sem empresa vinculada." };
  }

  const fileNameInput = getValue(formData, "fileName");
  const storagePathInput = getValue(formData, "storagePath");
  const description = getValue(formData, "description");
  const uploadedFile = formData.get("file");

  let fileName = fileNameInput;
  let storagePath = storagePathInput;
  let mimeType = "application/octet-stream";

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const storedFile = await uploadStorageFile({
      file: uploadedFile,
      folder: "downloads",
    });

    fileName = fileName || storedFile.fileName;
    storagePath = storedFile.storagePath;
    mimeType = storedFile.mimeType;
  }

  if (!storagePath) {
    return { error: "Informe um arquivo ou um link para download." };
  }

  if (!fileName) {
    const parsedName = storagePath.split("/").pop();
    fileName = parsedName || "download";
  }

  await prisma.downloadResource.create({
    data: {
      companyId: user.companyId,
      fileName,
      description: description || null,
      storagePath,
      mimeType,
      uploadedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "download_resource_added",
      entityType: "download_resource",
      entityId: user.companyId,
      description: `Recurso de download adicionado: ${fileName}`,
    },
  });

  revalidatePath("/downloads");

  return { success: "Download adicionado com sucesso." };
}

export async function removeDownloadResourceAction(
  formData: FormData,
): Promise<DownloadFormState> {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente administradores podem remover downloads." };
  }

  const resourceId = getValue(formData, "resourceId");
  if (!resourceId) {
    return { error: "Recurso invalido." };
  }

  const resource = await prisma.downloadResource.findUnique({
    where: { id: resourceId },
  });

  if (!resource || (user.role === UserRole.ADMIN && resource.companyId !== user.companyId)) {
    return { error: "Recurso nao encontrado." };
  }

  await prisma.downloadResource.delete({
    where: { id: resource.id },
  });

  await deleteStorageFile(resource.storagePath).catch(() => undefined);
  revalidatePath("/downloads");

  return { success: "Download removido com sucesso." };
}
