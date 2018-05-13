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
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
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
app.listen(port, function () {
    console.log("Server is listening on port " + port);
});
//# sourceMappingURL=app.js.map