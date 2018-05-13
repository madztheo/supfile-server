"use strict";
exports.__esModule = true;
var minio_handler_1 = require("../minio-handler");
function createUserStorage(req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .createBucket(req.user.id.toLowerCase())
        .then(function () {
        res.success("User storage created");
    })["catch"](function (err) {
        res.error(err);
    });
}
Parse.Cloud.define("createUserStorage", function (req, res) {
    createUserStorage(req, res);
});
//After user registration
Parse.Cloud.afterSave(Parse.User, function (req) {
    //We create its bucket right after registration
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler.createBucket(req.object.id.toLowerCase());
});
//# sourceMappingURL=main.js.map