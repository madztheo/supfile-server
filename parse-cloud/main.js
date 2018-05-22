"use strict";
exports.__esModule = true;
var minio_handler_1 = require("../minio-handler");
var crypto_function_1 = require("../crypto-function");
function createUserStorage(req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .createBucket(crypto_function_1.createsha256Hash(req.user.id))
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
    minioHandler.createBucket(crypto_function_1.createsha256Hash(req.object.id));
});
Parse.Cloud.afterDelete(Parse.User, function (req) {
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler.removeBucket(crypto_function_1.createsha256Hash(req.object.id));
});
Parse.Cloud.define("getUploadUrl", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .getPresignedUploadURL(crypto_function_1.createsha256Hash(req.user.id), fileName)
        .then(function (url) {
        res.success({
            url: url
        });
    })["catch"](function () {
        res.error("Unable to get url");
    });
});
Parse.Cloud.define("getFileUrl", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .getPresignedDownloadUrl(crypto_function_1.createsha256Hash(req.user.id), fileName)
        .then(function (url) {
        res.success({
            url: url
        });
    })["catch"](function () {
        res.error("Unable to get url");
    });
});
Parse.Cloud.define("getFile", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .getFile(crypto_function_1.createsha256Hash(req.user.id), fileName)
        .then(function (file) {
        res.success(file);
    })["catch"](function (err) {
        res.error({ title: "Unable to get file stream", message: err });
    });
});
Parse.Cloud.define("uploadFile", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
    }
    var file = req.params.file;
    var fileName = req.params.fileName;
    var folderId = req.params.folderId;
    if (!file || !fileName) {
        res.error("File or file name undefined");
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    minioHandler
        .uploadFile(crypto_function_1.createsha256Hash(req.user.id), fileName, file)
        .then(function () {
        var createFile = function (folder) {
            var dbFile = new Parse.Object("File");
            dbFile.set("name", fileName);
            dbFile.set("user", req.user);
            if (folder) {
                dbFile.set("folder", folder);
            }
            dbFile.setACL(new Parse.ACL(req.user));
            dbFile
                .save()
                .then(function () {
                res.success("File uploaded");
            })["catch"](function () {
                res.error("File uploaded but not saved in database");
            });
        };
        if (!folderId) {
            createFile();
        }
        else {
            var queryFolder = new Parse.Query("Folder");
            queryFolder
                .get(folderId)
                .then(function (folder) {
                createFile(folder);
            })["catch"](function () {
                res.error("File uploaded but not saved in database. Folder not found");
            });
        }
    })["catch"](function () {
        res.error("Unable to upload file");
    });
});
Parse.Cloud.beforeSave("File", function (req, res) {
    var fileName = req.object.get("name");
    //To keep the original name of the file
    if (!req.object.get("fileName")) {
        req.object.set("fileName", fileName);
    }
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
});
//# sourceMappingURL=main.js.map