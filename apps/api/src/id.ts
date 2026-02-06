import crypto from "node:crypto";

export function newId(): string {
  return crypto.randomUUID();
}

export function newToken(size = 32): string {
  return crypto.randomBytes(size).toString("hex");
}
