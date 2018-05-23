import { MinioHandler } from "../minio-handler";
import * as fs from "fs";
import { createsha256Hash } from "../crypto-function";
import "./triggers";
import "./file-sharing";

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

Parse.Cloud.define("getPublicFileUrl", (req, res) => {
  const fileId = req.params.fileId;
  if (!fileId) {
    res.error("File id undefined");
  }
  let query = new Parse.Query("File");
  query.get(fileId).then(file => {
    const minioHandler = new MinioHandler();
    minioHandler
      .getPresignedDownloadUrl(
        createsha256Hash(file.get("user").id),
        file.get("name")
      )
      .then(url => {
        res.success({
          url
        });
      })
      .catch(() => {
        res.error("Unable to get url");
      });
  });
});

Parse.Cloud.define("getFile", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
  }
  const minioHandler = new MinioHandler();
  minioHandler
    .getFile(createsha256Hash(req.user.id), fileName)
    .then(file => {
      res.success(file);
    })
    .catch(err => {
      res.error({ title: "Unable to get file stream", message: err });
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
