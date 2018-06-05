import { MinioHandler } from "../minio-handler";
import * as fs from "fs";
import { createsha256Hash } from "../crypto-function";
import "./triggers";
import "./file-sharing";

/**
 * Create a bucket for a user
 * @param req
 * @param res
 */
function createUserStorage(
  req: Parse.Cloud.FunctionRequest,
  res: Parse.Cloud.FunctionResponse
) {
  if (!req.user) {
    //We can't create a bucket for an undefined user
    res.error("User undefined");
    return;
  }
  let minioHandler = new MinioHandler();
  /**
   * We create the bucket named from the 63 first characters of the SHA 256 hash (not salted)
   * of the user id. We could have just used the user id as the name of the bucket, but
   * bucket names don't support capital letters while our user ids have some. And to avoid
   * possible (even if very unlikely) collisions between same ids but with different capitalization
   * we take the hash of the id instead.
   */
  minioHandler
    .createBucket(createsha256Hash(req.user.id))
    .then(() => {
      res.success("User storage created");
    })
    .catch(err => {
      res.error(err);
    });
}

/**
 * Create the user storage (Not used)
 */
Parse.Cloud.define("createUserStorage", (req, res) => {
  createUserStorage(req, res);
});

/**
 * Get a url to upload a file to by giving its name beforehand
 */
Parse.Cloud.define("getUploadUrl", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
    return;
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
    return;
  }
  const minioHandler = new MinioHandler();
  //We get the url for file with the given name and in the bucket correspond to the user
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

/**
 * Get the url to view or download a file
 */
Parse.Cloud.define("getFileUrl", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
    return;
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
    return;
  }
  const minioHandler = new MinioHandler();
  //We get the url by specifying the bucket name (hash of user's id) and the file's name
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

/**
 * Get the url to view or download a public file from another user
 */
Parse.Cloud.define("getPublicFileUrl", (req, res) => {
  const fileId = req.params.fileId;
  if (!fileId) {
    res.error("File id undefined");
    return;
  }
  //We look for the file with the id given in parameters
  let query = new Parse.Query("File");
  query.get(fileId).then(file => {
    const minioHandler = new MinioHandler();
    //We get the url
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

/**
 * Get raw file (considered as Blob on client side) from data storage
 */
Parse.Cloud.define("getFile", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
    return;
  }
  const fileName = req.params.fileName;
  if (!fileName) {
    res.error("File name undefined");
    return;
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

/**
 * Upload a raw file to data storage (not used)
 */
Parse.Cloud.define("uploadFile", (req, res) => {
  if (!req.user) {
    res.error("User undefined");
    return;
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
