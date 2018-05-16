import * as express from "express";
const bodyParser = require("body-parser");
const app = express();
const ParseServer = require("parse-server").ParseServer;

const port = process.env.PORT || 1337;
const parseMasterKey = process.env.MASTER_KEY || "KQdF126IZFZarl4mLAGu5ix6h";
const parseAppId = process.env.APP_ID || "r2iHRgNfOM8lih4";
const mongoDBUser = process.env.MONGO_USER || "admin";
const mongoDBPassword =
  process.env.MONGO_PASSWORD || "Es0REXOXP7KC04f2kngktBNwC";

import { MinioHandler } from "./minio-handler";
import * as Parse from "parse/node";
import { createsha256Hash } from "./crypto-function";

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

const api = new ParseServer({
  databaseURI: `mongodb://${mongoDBUser}:${mongoDBPassword}@ds217970.mlab.com:17970/supfile`, // Connection string for your MongoDB database
  cloud: "./parse-cloud/main.js", // Absolute path to your Cloud Code
  appId: parseAppId,
  masterKey: parseMasterKey,
  serverURL: "http://localhost:1337/parse"
});

// Serve the Parse API on the /parse URL prefix
app.use("/parse", api);

MinioHandler.initializeMinio();

app.post("/files/download", (req, res) => {
  const sessionToken = req.body.sessionToken;
  const fileName = req.body.fileName;
  let query = new Parse.Query("File");
  query.equalTo("fileName", fileName);
  //We use the session token to restrict to the user
  //If no session token is provided, nothing will be returned as
  //the request will not be authorized
  query.first({ sessionToken: sessionToken }).then(
    file => {
      if (file) {
        const userId = file.get("user").id;
        console.log("User id " + userId);
        let minioHandler = new MinioHandler();
        minioHandler.getFileStream(createsha256Hash(userId), fileName).then(
          fileStream => {
            res.setHeader("Content-Type", file.get("type"));
            fileStream.pipe(res);
            fileStream.on("end", () => {
              res.end();
            });
          },
          err => res.send(err)
        );
      } else {
        res.sendStatus(404);
      }
    },
    err => res.sendStatus(err)
  );
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
