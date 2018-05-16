"use strict";
exports.__esModule = true;
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var ParseServer = require("parse-server").ParseServer;
var port = process.env.PORT || 1337;
var parseMasterKey = process.env.MASTER_KEY || "KQdF126IZFZarl4mLAGu5ix6h";
var parseAppId = process.env.APP_ID || "r2iHRgNfOM8lih4";
var mongoDBUser = process.env.MONGO_USER || "admin";
var mongoDBPassword = process.env.MONGO_PASSWORD || "Es0REXOXP7KC04f2kngktBNwC";
var minio_handler_1 = require("./minio-handler");
var Parse = require("parse/node");
var crypto_function_1 = require("./crypto-function");
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
});
var api = new ParseServer({
    databaseURI: "mongodb://" + mongoDBUser + ":" + mongoDBPassword + "@ds217970.mlab.com:17970/supfile",
    cloud: "./parse-cloud/main.js",
    appId: parseAppId,
    masterKey: parseMasterKey,
    serverURL: "http://localhost:1337/parse"
});
// Serve the Parse API on the /parse URL prefix
app.use("/parse", api);
minio_handler_1.MinioHandler.initializeMinio();
app.post("/files/download", function (req, res) {
    var sessionToken = req.body.sessionToken;
    var fileName = req.body.fileName;
    var query = new Parse.Query("File");
    query.equalTo("fileName", fileName);
    //We use the session token to restrict to the user
    //If no session token is provided, nothing will be returned as
    //the request will not be authorized
    query.first({ sessionToken: sessionToken }).then(function (file) {
        if (file) {
            var userId = file.get("user").id;
            console.log("User id " + userId);
            var minioHandler = new minio_handler_1.MinioHandler();
            minioHandler.getFileStream(crypto_function_1.createsha256Hash(userId), fileName).then(function (fileStream) {
                res.setHeader("Content-Type", file.get("type"));
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
});
app.listen(port, function () {
    console.log("Server is listening on port " + port);
});
//# sourceMappingURL=app.js.map