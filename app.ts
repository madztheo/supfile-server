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
const mongoDBUri =
  process.env.MONGO_URI ||
  "mongodb://admin:Es0REXOXP7KC04f2kngktBNwC@ds217970.mlab.com:17970/supfile";
const serverUrl = process.env.SERVER_URL || "http://localhost:1337/parse";

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

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

const api = new ParseServer({
  databaseURI: mongoDBUri, // Connection string for your MongoDB database
  cloud: __dirname + "/parse-cloud/main.js", // Absolute path to your Cloud Code
  appId: parseAppId,
  masterKey: parseMasterKey,
  serverURL: serverUrl
});

// Serve the Parse API on the /parse URL prefix
app.use("/parse", api);

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

//We initialize the connection to Minio
MinioHandler.initializeMinio();

/**
 * Route to download araw  file directly
 */
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
        let minioHandler = new MinioHandler();
        //We get the stream of the file
        minioHandler.getFileStream(createsha256Hash(userId), fileName).then(
          fileStream => {
            res.setHeader("Content-Type", file.get("type"));
            //We associate the stream to the response
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

/**
 * Get the zip of a folder
 * @param folder Folder
 * @param sessionToken Session token of a user who can access the folder
 * @param zip JSZip object
 */
function zipFolder(
  folder: Parse.Object,
  sessionToken: string,
  zip: jszip
): Promise<jszip> {
  //We query the subfolders of the folder
  const minioHandler = new MinioHandler();
  const query = new Parse.Query("Folder");
  query.equalTo("parent", folder);

  const zipFiles = () => {
    //We get the files within the current folder
    return new Parse.Query("File")
      .equalTo("folder", folder)
      .find({ sessionToken: sessionToken })
      .then(files => {
        return Promise.all(
          files.map(file => {
            //We get the stream of the file
            return minioHandler
              .getFileStream(
                createsha256Hash((<Parse.Object>file.get("user")).id),
                file.get("name")
              )
              .then(stream => {
                //We add the stream along with the file's name to response array
                return {
                  stream,
                  name: file.get("name")
                };
              });
          })
        ).then(minioFiles => {
          //We iterate through the response
          minioFiles.forEach(file => {
            //We add each file to the zip by giving its name and stream
            zip.file(file.name, file.stream);
          });
          //We return the zip containing all the file of the current folders
          return zip;
        });
      });
  };

  //To get a standard Promise out of the Parse Promise
  return <Promise<any>>Promise.resolve(
    //We make the query to get the subfolders of the current folder
    query.find({ sessionToken: sessionToken }).then(folders => {
      if (folders && folders.length >= 0) {
        const promiseToExecute = folders.map(x => {
          //For each subfolder we call the function again with the subfolder as current folder
          //to go down the folder tree
          return zipFolder(x, sessionToken, zip.folder(x.get("name")));
        });
        //We fuse the whole with Promise.all to get a single response when every subfolders have been added.
        //Then we add the files to the zip
        return Promise.all(promiseToExecute).then(() => zipFiles());
      }
      //If we got it means there's no subfolder, so we can jump straight to adding the files to the zip
      return zipFiles();
    })
  );
}

/**
 * Download a folder as a zip archive
 */
app.post("/folders/download", (req, res) => {
  const sessionToken = req.body.sessionToken;
  const folderId = req.body.folderId;
  //Get the folder from id given in the parameters
  let query = new Parse.Query("Folder");
  query
    .get(folderId, { sessionToken: sessionToken })
    .then(folder => {
      if (folder) {
        //We then zip the folder
        const zip = new jszip();
        zipFolder(folder, sessionToken, zip).then(zippedFolder => {
          //We get a stream of the zip. So we pipe it to response.
          //We also specify in the header that the response is a zip archive
          res.setHeader("Content-Type", "application/zip");
          zippedFolder.generateNodeStream().pipe(
            res,
            { end: true }
          );
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
