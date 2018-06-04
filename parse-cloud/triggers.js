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
    var query = new Parse.Query("File");
    query.equalTo("name", fileName);
    if (req.object.existed()) {
        query.notEqualTo("objectId", req.object.id);
    }
    query
        .first({
        sessionToken: req.user.getSessionToken()
    })
        .then(function (file) {
        if (!file) {
            res.success();
        }
        else {
            res.error("A file with that name already exists");
        }
    })["catch"](function (err) { return res.error(err); });
});
function updateStorageUsed(user, storageInfo) {
    var minioHandler = new minio_handler_1.MinioHandler();
    var totalSize = 0;
    minioHandler.getFilesSizes(crypto_function_1.createsha256Hash(user.id)).subscribe(function (size) {
        totalSize += size;
        storageInfo.set("used", totalSize);
        storageInfo.set("user", user);
        storageInfo.setACL(new Parse.ACL(user));
        storageInfo.save(null, {
            sessionToken: user.getSessionToken()
        });
    });
}
function updateStorageInfo(user) {
    var storageInfoQuery = new Parse.Query("StorageInfo");
    var totalSize = 0;
    storageInfoQuery.equalTo("user", user);
    storageInfoQuery
        .first({ sessionToken: user.getSessionToken() })
        .then(function (storageInfo) {
        if (storageInfo) {
            updateStorageUsed(user, storageInfo);
        }
        else {
            var storageInfo_1 = new Parse.Object("StorageInfo");
            storageInfo_1.set("allowed", Math.pow(10, 9) * 30);
            updateStorageUsed(user, storageInfo_1);
        }
    })["catch"](function () {
        var storageInfo = new Parse.Object("StorageInfo");
        updateStorageUsed(user, storageInfo);
    });
}
Parse.Cloud.afterSave("File", function (req) {
    //Only when the object is created
    if (!req.object.existed()) {
        updateStorageInfo(req.user);
    }
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
Parse.Cloud.afterDelete("File", function (req) {
    updateStorageInfo(req.user);
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
    var filesQuery = new Parse.Query("File");
    filesQuery.equalTo("folder", req.object);
    filesQuery
        .find({ sessionToken: req.user.getSessionToken() })
        .then(function (files) {
        //First we delete all the files contained directly in the folder
        return Parse.Object.destroyAll(files, {
            sessionToken: req.user.getSessionToken()
        });
    })
        .then(function () {
        var foldersQuery = new Parse.Query("Folder");
        foldersQuery.equalTo("parent", req.object);
        return foldersQuery
            .find({ sessionToken: req.user.getSessionToken() })
            .then(function (folders) {
            //Then we carry on with the subfolders recursively
            return Parse.Object.destroyAll(folders, {
                sessionToken: req.user.getSessionToken()
            });
        });
    })
        .then(function () {
        res.success("");
    })["catch"](function (err) {
        res.error(err);
    });
});
Parse.Cloud.beforeSave("Folder", function (req, res) {
    var query = new Parse.Query("Folder");
    query.equalTo("name", req.object.get("name"));
    if (req.object.existed()) {
        query.notEqualTo("objectId", req.object.id);
    }
    query.equalTo("parent", req.object.get("parent"));
    query
        .first({
        sessionToken: req.user.getSessionToken()
    })
        .then(function (folder) {
        if (!folder) {
            res.success();
        }
        else {
            res.error("A folder with that name already exists in the current folder");
        }
    })["catch"](function (err) { return res.error(err); });
});
//# sourceMappingURL=triggers.js.map