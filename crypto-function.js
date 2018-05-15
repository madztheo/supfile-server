"use strict";
exports.__esModule = true;
var crypto = require("crypto");
function createsha256Hash(data) {
    return crypto
        .createHash("sha256")
        .update(data, "utf8")
        .digest("hex")
        .substr(0, 63);
}
exports.createsha256Hash = createsha256Hash;
//# sourceMappingURL=crypto-function.js.map