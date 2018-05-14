"use strict";
exports.__esModule = true;
var Minio = require("minio");
var MinioHandler = /** @class */ (function () {
    function MinioHandler() {
    }
    MinioHandler.initializeMinio = function () {
        if (!MinioHandler.minioClient) {
            MinioHandler.minioClient = new Minio.Client({
                endPoint: "127.0.0.1",
                port: 9000,
                //True if https
                secure: false,
                accessKey: "S40WFAXPERNK35QQME38",
                secretKey: "AIAlQvfg+9JWhQgVc9quEphqbG2iJv1Vu35pKL8z"
            });
            console.log("Minio client initialized");
        }
    };
    MinioHandler.prototype.createBucket = function (bucketName) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.makeBucket(bucketName, "", function (err) {
                if (err) {
                    console.log("Error creating bucket.", err);
                    reject(err);
                    return;
                }
                console.log("Bucket " + bucketName + " created successfully.");
                resolve();
            });
        });
    };
    MinioHandler.prototype.removeBucket = function (bucketName) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.removeBucket(bucketName, function (err) {
                if (err) {
                    console.log("Error removing bucket.", err);
                    reject(err);
                    return;
                }
                console.log("Bucket " + bucketName + " removed.");
                resolve();
            });
        });
    };
    MinioHandler.prototype.uploadFile = function (bucketName, fileName, file) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.putObject(bucketName, fileName, file, function (err) {
                if (err) {
                    console.log("Error uploading file.", err);
                    reject(err);
                    return;
                }
                console.log("File uploaded in bucket " + bucketName + ".");
                resolve();
            });
        });
    };
    MinioHandler.prototype.getPresignedUploadURL = function (bucketName, fileName) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.presignedPutObject(bucketName, fileName, function (err, url) {
                if (err) {
                    console.log("Error getting url", err);
                    reject(err);
                    return;
                }
                console.log("Url retrieved " + url);
                resolve(url);
            });
        });
    };
    MinioHandler.prototype.getPresignedDownloadUrl = function (bucketName, fileName) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.presignedGetObject(bucketName, fileName, function (err, downloadUrl) {
                if (err) {
                    console.log("Error getting url", err);
                    reject(err);
                    return;
                }
                console.log("Url retrieved " + downloadUrl);
                resolve(downloadUrl);
            });
        });
    };
    MinioHandler.prototype.removeFile = function (bucketName, fileName) {
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.removeObject(bucketName, fileName, function (err) {
                if (err) {
                    console.log("Error removing file.", err);
                    reject(err);
                    return;
                }
                console.log("File " + fileName + " removed from bucket " + bucketName + ".");
                resolve();
            });
        });
    };
    return MinioHandler;
}());
exports.MinioHandler = MinioHandler;
//# sourceMappingURL=minio-handler.js.map