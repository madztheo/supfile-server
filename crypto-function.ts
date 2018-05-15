import * as crypto from "crypto";

export function createsha256Hash(data: string) {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("hex")
    .substr(0, 63);
}
