"use strict";
exports.__esModule = true;
var Minio = require("minio");
var rxjs_1 = require("rxjs");
/**
 * Class to make the communication with Minio
 */
var MinioHandler = /** @class */ (function () {
    function MinioHandler() {
    }
    /**
     * Initialize the connection to Minio
     * @param accessKey Public key
     * @param secretKey Private key
     * @param endPoint The hostname
     * @param port The port
     * @param secure Set to true if served over a secure connection (i.e. https)
     */
    MinioHandler.initializeMinio = function (accessKey, secretKey, endPoint, port, secure) {
        if (accessKey === void 0) { accessKey = "S40WFAXPERNK35QQME38"; }
        if (secretKey === void 0) { secretKey = "AIAlQvfg+9JWhQgVc9quEphqbG2iJv1Vu35pKL8z"; }
        if (endPoint === void 0) { endPoint = "127.0.0.1"; }
        if (port === void 0) { port = 9000; }
        if (secure === void 0) { secure = false; }
        if (!MinioHandler.minioClient) {
            MinioHandler.minioClient = new Minio.Client({
                endPoint: endPoint,
                port: port,
                //True if https
                secure: secure,
                accessKey: accessKey,
                secretKey: secretKey
            });
            console.log("Minio client initialized");
        }
    };
    /**
     * Create a bucket
     * @param bucketName Bucket's name
     */
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
    /**
     * Remove bucket
     * @param bucketName Bucket's name
     */
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
    /**
     * Upload a file
     * @param bucketName Bucket's name
     * @param fileName File's name
     * @param file Raw file
     */
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
    /**
     * Get a url to a upload a file from a browser
     * @param bucketName Bucket's name
     * @param fileName File's name
     */
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
    /**
     * Get a url to download or view a file from browser
     * @param bucketName Bucket's name
     * @param fileName File's name
     * @param expire When the url is supposed to expire in seconds (default: 6 hours)
     */
    MinioHandler.prototype.getPresignedDownloadUrl = function (bucketName, fileName, expire) {
        if (expire === void 0) { expire = 6 * 60 * 60; }
        return new Promise(function (resolve, reject) {
            MinioHandler.minioClient.presignedGetObject(bucketName, fileName, expire, function (err, downloadUrl) {
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
    /**
     * Get a raw from data storage
     * @param bucketName Bucket's name
     * @param fileName File's name
     */
    MinioHandler.prototype.getFile = function (bucketName, fileName) {
        return MinioHandler.minioClient
            .getObject(bucketName, fileName)
            .then(function (stream) {
            return new Promise(function (resolve, reject) {
                var file;
                stream.on("data", function (chunk) {
                    if (!file) {
                        file = chunk;
                    }
                    else {
                        file += chunk;
                    }
                });
                stream.on("end", function () {
                    resolve(file);
                });
                stream.on("error", function (err) {
                    reject(err);
                });
            });
        });
    };
    /**
     * Get the stream of a file from data storage
     * @param bucketName Bucket's name
     * @param fileName File's name
     */
    MinioHandler.prototype.getFileStream = function (bucketName, fileName) {
        return MinioHandler.minioClient.getObject(bucketName, fileName);
    };
    /**
     * Remove a file from data storage
     * @param bucketName Bucket's name
     * @param fileName File's name
     */
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
    /**
     * Get a list of all the files in a bucket in the form of a stream
     * @param bucketName
     */
    MinioHandler.prototype.getFilesInBucket = function (bucketName) {
        return MinioHandler.minioClient.listObjects(bucketName);
    };
    /**
     * Get the size of a bucket
     * @param bucketName Bucket's name
     */
    MinioHandler.prototype.getFilesSizes = function (bucketName) {
        var _this = this;
        //We transform the stream into an Observable for ease of use
        return rxjs_1.Observable.create(function (observer) {
            var stream = _this.getFilesInBucket(bucketName);
            stream.on("data", function (obj) {
                //We send the file size to the listeners
                observer.next(obj.size);
            });
        });
    };
    return MinioHandler;
}());
exports.MinioHandler = MinioHandler;
//# sourceMappingURL=minio-handler.js.map