import { MinioHandler } from "../minio-handler";
import * as crypto from "crypto";
import * as fs from "fs";

function createsha256Hash(data: string) {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("hex")
    .substr(0, 63);
}

function createUserStorage(req, res) {
  if (!req.user) {
    res.error("User undefined");
  }
  let minioHandler = new MinioHandler();
  minioHandler
    .createBucket(createsha256Hash(req.user.id))
    .then(() => {
      res.success("User storage created");
    })
    .catch(err => {
      res.error(err);
    });
}

Parse.Cloud.define("createUserStorage", (req, res) => {
  createUserStorage(req, res);
});

//After user registration
Parse.Cloud.afterSave(Parse.User, req => {
  //We create its bucket right after registration
  let minioHandler = new MinioHandler();
  minioHandler.createBucket(createsha256Hash(req.object.id));
});

Parse.Cloud.afterDelete(Parse.User, req => {
  let minioHandler = new MinioHandler();
  minioHandler.removeBucket(createsha256Hash(req.object.id));
});

Parse.Cloud.define("getUploadUrl", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
  }
  const minioHandler = new MinioHandler();
  minioHandler
    .getPresignedUploadURL(createsha256Hash(req.user.id), fileName)
    .then(url => {
      res.success({
        url
      });
    })
    .catch(() => {
      res.error("Unable to get url");
    });
});

Parse.Cloud.define("getFileUrl", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
  }
  const minioHandler = new MinioHandler();
  minioHandler
    .getPresignedDownloadUrl(createsha256Hash(req.user.id), fileName)
    .then(url => {
      res.success({
        url
      });
    })
    .catch(() => {
      res.error("Unable to get url");
    });
});

Parse.Cloud.define("uploadFile", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
  }
  const file = req.params.file;
  const fileName = req.params.fileName;
  const folderId = req.params.folderId;
  if (!file || !fileName) {
    res.error("File or file name undefined");
  }
  const minioHandler = new MinioHandler();
  minioHandler
    .uploadFile(createsha256Hash(req.user.id), fileName, file)
    .then(() => {
      const createFile = (folder?) => {
        let dbFile = new Parse.Object("File");
        dbFile.set("name", fileName);
        dbFile.set("user", req.user);
        if (folder) {
          dbFile.set("folder", folder);
        }
        dbFile.setACL(new Parse.ACL(req.user));
        dbFile
          .save()
          .then(() => {
            res.success("File uploaded");
          })
          .catch(() => {
            res.error("File uploaded but not saved in database");
          });
      };
      if (!folderId) {
        createFile();
      } else {
        let queryFolder = new Parse.Query("Folder");
        queryFolder
          .get(folderId)
          .then(folder => {
            createFile(folder);
          })
          .catch(() => {
            res.error(
              "File uploaded but not saved in database. Folder not found"
            );
          });
      }
    })
    .catch(() => {
      res.error("Unable to upload file");
    });
});

Parse.Cloud.beforeSave("File", (req, res) => {
  const fileName = req.object.get("name");
  //To keep the original name of the file
  if (!req.object.get("fileName")) {
    req.object.set("fileName", fileName);
  }
  res.success();
});

Parse.Cloud.beforeDelete("File", (req, res) => {
  if (req.master) {
    res.success("");
  }
  if (!req.user || !req.object) {
    return;
  }
  const fileName = req.object.get("fileName");
  const minioHandler = new MinioHandler();
  minioHandler
    .removeFile(createsha256Hash(req.user.id), fileName)
    .then(() => {
      res.success("");
    })
    .catch(() => {
      res.error("Unable to remove file");
    });
});
