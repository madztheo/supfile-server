"use strict";
exports.__esModule = true;
var crypto = require("crypto");
/**
 * Get the 63 first characters of the SHA 256 hash of the given data
 * @param data Data to hash
 */
function createsha256Hash(data) {
    return crypto
        .createHash("sha256")
        .update(data, "utf8")
        .digest("hex")
        .substr(0, 63);
}
exports.createsha256Hash = createsha256Hash;
//# sourceMappingURL=crypto-function.js.map