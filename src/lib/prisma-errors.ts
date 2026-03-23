import { Prisma } from "@prisma/client";

const MISSING_SCHEMA_ERROR_CODES = new Set(["P2021", "P2022"]);

export function isMissingSchemaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    MISSING_SCHEMA_ERROR_CODES.has(error.code)
  );
}
