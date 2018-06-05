import * as crypto from "crypto";

/**
 * Get the 63 first characters of the SHA 256 hash of the given data
 * @param data Data to hash
 */
export function createsha256Hash(data: string) {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("hex")
    .substr(0, 63);
}
