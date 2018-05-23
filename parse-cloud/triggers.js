"use strict";
exports.__esModule = true;
var minio_handler_1 = require("../minio-handler");
var crypto_function_1 = require("../crypto-function");
//After user registration
Parse.Cloud.afterSave(Parse.User, function (req) {
    //We create its bucket right after registration
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler.createBucket(crypto_function_1.createsha256Hash(req.object.id));
});
Parse.Cloud.afterDelete(Parse.User, function (req) {
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler.removeBucket(crypto_function_1.createsha256Hash(req.object.id));
});
Parse.Cloud.beforeSave("File", function (req, res) {
    var fileName = req.object.get("name");
    //To keep the original name of the file
    if (!req.object.get("fileName")) {
        req.object.set("fileName", fileName);
    }
    console.log(req.object);
    res.success();
});
Parse.Cloud.beforeDelete("File", function (req, res) {
    if (req.master) {
        res.success("");
    }
    if (!req.user || !req.object) {
        res.error("Undefined user or object");
        return;
    }
    var fileName = req.object.get("fileName");
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .removeFile(crypto_function_1.createsha256Hash(req.user.id), fileName)
        .then(function () {
        res.success("");
    })["catch"](function () {
        res.error("Unable to remove file");
    });
});
Parse.Cloud.beforeDelete("Folder", function (req, res) {
    if (req.master) {
        res.success("");
    }
    if (!req.user || !req.object) {
        res.error("Undefined user or object");
        return;
    }
    var folder = req.object;
    var minioHandler = new minio_handler_1.MinioHandler();
    //TO-DO : Delete files and folders contained in it
    res.success("");
});
//# sourceMappingURL=triggers.js.map