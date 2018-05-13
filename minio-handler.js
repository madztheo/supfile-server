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
    return MinioHandler;
}());
exports.MinioHandler = MinioHandler;
//# sourceMappingURL=minio-handler.js.map