"use strict";
exports.__esModule = true;
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var ParseServer = require("parse-server").ParseServer;
var minio_handler_1 = require("./minio-handler");
var Parse = require("parse/node");
var crypto_function_1 = require("./crypto-function");
var jszip = require("jszip");
var port = process.env.PORT || 1337;
var parseMasterKey = process.env.MASTER_KEY || "KQdF126IZFZarl4mLAGu5ix6h";
var parseAppId = process.env.APP_ID || "r2iHRgNfOM8lih4";
var mongoDBUri = process.env.MONGO_URI ||
    "mongodb://admin:Es0REXOXP7KC04f2kngktBNwC@ds217970.mlab.com:17970/supfile";
var serverUrl = process.env.SERVER_URL || "http://localhost:1337/parse";
var minioAccessKey = process.env.MINIO_ACCESS_KEY || "S40WFAXPERNK35QQME38";
var minioSecretKey = process.env.MINIO_SECRET_KEY || "AIAlQvfg+9JWhQgVc9quEphqbG2iJv1Vu35pKL8z";
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
/**
 * Quick notes about Parse.
 * Parse come several features to simplying the handling of authentification and sessions.
 * Object which are store to Mongo Database are packed with common features to simply their use
 * and overall security. Such as ACL which can restrict the use to a specific users or several,
 * seperating everytime reading from writing rights.
 * Queries made by a user or with the user's session token, will return only objects that the user
 * has access to (defined by the ACLs).
 */
var api = new ParseServer({
    databaseURI: mongoDBUri,
    cloud: __dirname + "/parse-cloud/main.js",
    appId: parseAppId,
    masterKey: parseMasterKey,
    serverURL: serverUrl
});
// Serve the Parse API on the /parse URL prefix
app.use("/parse", api);
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
});
//We initialize the connection to Minio
minio_handler_1.MinioHandler.initializeMinio(minioAccessKey, minioSecretKey);
/**
 * Download a file
 * @param req
 * @param res
 */
function downloadFile(req, res) {
    var sessionToken = req.body.sessionToken || req.query.sessionToken;
    var fileName = req.body.fileName || req.params.name;
    var forceDownload = req.body.forceDownload || req.query.forceDownload;
    var query = new Parse.Query("File");
    query.equalTo("fileName", fileName);
    //We use the session token to restrict to the user
    //If no session token is provided, nothing will be returned as
    //the request will not be authorized
    query.first({ sessionToken: sessionToken }).then(function (file) {
        if (file) {
            var userId = file.get("user").id;
            var minioHandler = new minio_handler_1.MinioHandler();
            //We get the stream of the file
            minioHandler.getFileStream(crypto_function_1.createsha256Hash(userId), fileName).then(function (fileStream) {
                res.setHeader("Content-Type", file.get("type"));
                if (forceDownload) {
                    res.setHeader("Content-Disposition", "attachment; filename=\"" + file.get("name") + "\"");
                }
                //We associate the stream to the response
                fileStream.pipe(res);
                fileStream.on("end", function () {
                    res.end();
                });
            }, function (err) { return res.send(err); });
        }
        else {
            res.sendStatus(404);
        }
    }, function (err) { return res.sendStatus(err); });
}
/**
 * Route to download araw  file directly
 */
app.get("/files/download/:name", function (req, res) { return downloadFile(req, res); });
app.post("/files/download", function (req, res) { return downloadFile(req, res); });
/**
 * Get the zip of a folder
 * @param folder Folder
 * @param sessionToken Session token of a user who can access the folder
 * @param zip JSZip object
 */
function zipFolder(folder, sessionToken, zip) {
    //We query the subfolders of the folder
    var minioHandler = new minio_handler_1.MinioHandler();
    var query = new Parse.Query("Folder");
    query.equalTo("parent", folder);
    var zipFiles = function () {
        //We get the files within the current folder
        return new Parse.Query("File")
            .equalTo("folder", folder)
            .find({ sessionToken: sessionToken })
            .then(function (files) {
            return Promise.all(files.map(function (file) {
                //We get the stream of the file
                return minioHandler
                    .getFileStream(crypto_function_1.createsha256Hash(file.get("user").id), file.get("fileName"))
                    .then(function (stream) {
                    //We add the stream along with the file's name to response array
                    return {
                        stream: stream,
                        name: file.get("fileName")
                    };
                });
            })).then(function (minioFiles) {
                //We iterate through the response
                minioFiles.forEach(function (file) {
                    //We add each file to the zip by giving its name and stream
                    zip.file(file.name, file.stream);
                });
                //We return the zip containing all the file of the current folders
                return zip;
            });
        });
    };
    //To get a standard Promise out of the Parse Promise
    return Promise.resolve(
    //We make the query to get the subfolders of the current folder
    query.find({ sessionToken: sessionToken }).then(function (folders) {
        if (folders && folders.length >= 0) {
            var promiseToExecute = folders.map(function (x) {
                //For each subfolder we call the function again with the subfolder as current folder
                //to go down the folder tree
                return zipFolder(x, sessionToken, zip.folder(x.get("name")));
            });
            //We fuse the whole with Promise.all to get a single response when every subfolders have been added.
            //Then we add the files to the zip
            return Promise.all(promiseToExecute).then(function () { return zipFiles(); });
        }
        //If we got it means there's no subfolder, so we can jump straight to adding the files to the zip
        return zipFiles();
    }));
}
/**
 * Download a folder
 * @param req
 * @param res
 */
function downloadFolder(req, res) {
    var sessionToken = req.body.sessionToken || req.query.sessionToken;
    var folderId = req.body.folderId || req.params.id;
    //Get the folder from id given in the parameters
    var query = new Parse.Query("Folder");
    query
        .get(folderId, { sessionToken: sessionToken })
        .then(function (folder) {
        if (folder) {
            //We then zip the folder
            var zip = new jszip();
            zipFolder(folder, sessionToken, zip).then(function (zippedFolder) {
                //We get a stream of the zip. So we pipe it to response.
                //We also specify in the header that the response is a zip archive
                res.setHeader("Content-Type", "application/zip");
                res.setHeader("Content-Disposition", "attachment; filename=\"" + folder.get("name") + ".zip\"");
                zippedFolder.generateNodeStream().pipe(res, { end: true });
            });
        }
        else {
            res.sendStatus(404);
        }
    })["catch"](function (err) { return res.send(err); });
}
/**
 * Download a folder as a zip archive
 */
app.get("/folders/download/:id", function (req, res) { return downloadFolder(req, res); });
app.post("/folders/download", function (req, res) { return downloadFolder(req, res); });
/**
 * We serve the static files put in the www folder
 */
app.use(express.static("www"));
/**
 * Even though index.html will be already served as a static file
 * we add this route to let Angular handle the routing
 */
app.get("*", function (req, res) {
    res.sendFile(__dirname + "/www/index.html");
});
app.listen(port, function () {
    console.log("Server is listening on port " + port);
});
//# sourceMappingURL=app.js.map