"use strict";
exports.__esModule = true;
var minio_handler_1 = require("../minio-handler");
var crypto_function_1 = require("../crypto-function");
require("./triggers");
require("./file-sharing");
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
Parse.Cloud.define("getPublicFileUrl", function (req, res) {
    var fileId = req.params.fileId;
    if (!fileId) {
        res.error("File id undefined");
    }
    var query = new Parse.Query("File");
    query.get(fileId).then(function (file) {
        var minioHandler = new minio_handler_1.MinioHandler();
        minioHandler
            .getPresignedDownloadUrl(crypto_function_1.createsha256Hash(file.get("user").id), file.get("name"))
            .then(function (url) {
            res.success({
                url: url
            });
        })["catch"](function () {
            res.error("Unable to get url");
        });
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
//# sourceMappingURL=main.js.map