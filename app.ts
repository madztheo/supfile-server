import * as express from "express";
const bodyParser = require("body-parser");
const app = express();
const ParseServer = require("parse-server").ParseServer;
import { MinioHandler } from "./minio-handler";
import * as Parse from "parse/node";
import { createsha256Hash } from "./crypto-function";
import * as jszip from "jszip";

const port = process.env.PORT || 1337;
const parseMasterKey = process.env.MASTER_KEY || "KQdF126IZFZarl4mLAGu5ix6h";
const parseAppId = process.env.APP_ID || "r2iHRgNfOM8lih4";
const mongoDBUser = process.env.MONGO_USER || "admin";
const mongoDBPassword =
  process.env.MONGO_PASSWORD || "Es0REXOXP7KC04f2kngktBNwC";

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

function zipFolder(
  folder: Parse.Object,
  sessionToken: string,
  zip: jszip
): Promise<jszip> {
  const minioHandler = new MinioHandler();
  const query = new Parse.Query("Folder");
  query.equalTo("parent", folder);
  const zipFiles = () => {
    return new Parse.Query("File")
      .equalTo("folder", folder)
      .find({ sessionToken: sessionToken })
      .then(files => {
        return Promise.all(
          files.map(file => {
            return minioHandler
              .getFileStream(
                createsha256Hash((<Parse.Object>file.get("user")).id),
                file.get("name")
              )
              .then(stream => {
                return {
                  stream,
                  name: file.get("name")
                };
              });
          })
        ).then(minioFiles => {
          minioFiles.forEach(file => {
            zip.file(file.name, file.stream);
          });
          return zip;
        });
      });
  };

  return <Promise<any>>Promise.resolve(
    query.find({ sessionToken: sessionToken }).then(folders => {
      console.log(folder.get("name"));
      console.log(folders.map(x => x.get("name")));
      if (folders && folders.length >= 0) {
        const promiseToExecute = folders.map(x => {
          return zipFolder(x, sessionToken, zip.folder(x.get("name")));
        });
        return Promise.all(promiseToExecute).then(() => zipFiles());
      }
      return zipFiles();
    })
  );
}

app.post("/folders/download", (req, res) => {
  const sessionToken = req.body.sessionToken;
  const folderId = req.body.folderId;
  let query = new Parse.Query("Folder");
  query
    .get(folderId, { sessionToken: sessionToken })
    .then(folder => {
      if (folder) {
        const zip = new jszip();
        zipFolder(folder, sessionToken, zip).then(zippedFolder => {
          console.log(zippedFolder);
          res.setHeader("Content-Type", "application/zip");
          zippedFolder.generateNodeStream().pipe(res, { end: true });
        });
      } else {
        res.sendStatus(404);
      }
    })
    .catch(err => res.send(err));
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
