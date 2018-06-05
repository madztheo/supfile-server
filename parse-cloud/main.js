"use strict";
exports.__esModule = true;
var minio_handler_1 = require("../minio-handler");
var crypto_function_1 = require("../crypto-function");
require("./triggers");
require("./file-sharing");
/**
 * Create a bucket for a user
 * @param req
 * @param res
 */
function createUserStorage(req, res) {
    if (!req.user) {
        //We can't create a bucket for an undefined user
        res.error("User undefined");
        return;
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    /**
     * We create the bucket named from the 63 first characters of the SHA 256 hash (not salted)
     * of the user id. We could have just used the user id as the name of the bucket, but
     * bucket names don't support capital letters while our user ids have some. And to avoid
     * possible (even if very unlikely) collisions between same ids but with different capitalization
     * we take the hash of the id instead.
     */
    minioHandler
        .createBucket(crypto_function_1.createsha256Hash(req.user.id))
        .then(function () {
        res.success("User storage created");
    })["catch"](function (err) {
        res.error(err);
    });
}
/**
 * Create the user storage (Not used)
 */
Parse.Cloud.define("createUserStorage", function (req, res) {
    createUserStorage(req, res);
});
/**
 * Get a url to upload a file to by giving its name beforehand
 */
Parse.Cloud.define("getUploadUrl", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
        return;
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
        return;
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    //We get the url for file with the given name and in the bucket correspond to the user
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
/**
 * Get the url to view or download a file
 */
Parse.Cloud.define("getFileUrl", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
        return;
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
        return;
    }
    var minioHandler = new minio_handler_1.MinioHandler();
    //We get the url by specifying the bucket name (hash of user's id) and the file's name
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
/**
 * Get the url to view or download a public file from another user
 */
Parse.Cloud.define("getPublicFileUrl", function (req, res) {
    var fileId = req.params.fileId;
    if (!fileId) {
        res.error("File id undefined");
        return;
    }
    //We look for the file with the id given in parameters
    var query = new Parse.Query("File");
    query.get(fileId).then(function (file) {
        var minioHandler = new minio_handler_1.MinioHandler();
        //We get the url
        minioHandler
            .getPresignedDownloadUrl(crypto_function_1.createsha256Hash(file.get("user").id), file.get("fileName"))
            .then(function (url) {
            res.success({
                url: url
            });
        })["catch"](function () {
            res.error("Unable to get url");
        });
    });
});
/**
 * Get raw file (considered as Blob on client side) from data storage
 */
Parse.Cloud.define("getFile", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
        return;
    }
    var fileName = req.params.fileName;
    if (!fileName) {
        res.error("File name undefined");
        return;
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
/**
 * Upload a raw file to data storage (not used)
 */
Parse.Cloud.define("uploadFile", function (req, res) {
    if (!req.user) {
        res.error("User undefined");
        return;
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