import { MinioHandler } from "../minio-handler";
import { createsha256Hash } from "../crypto-function";

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

Parse.Cloud.beforeSave("File", (req, res) => {
  const fileName = req.object.get("name");
  //To keep the original name of the file
  if (!req.object.get("fileName")) {
    req.object.set("fileName", fileName);
  }
  const query = new Parse.Query("File");
  query.equalTo("name", fileName);
  if (req.object.existed()) {
    query.notEqualTo("objectId", req.object.id);
  }
  query
    .first({
      sessionToken: req.user.getSessionToken()
    })
    .then(file => {
      if (!file) {
        res.success();
      } else {
        res.error("A file with that name already exists");
      }
    })
    .catch(err => res.error(err));
});

function updateStorageUsed(user: Parse.User, storageInfo: Parse.Object) {
  const minioHandler = new MinioHandler();
  let totalSize = 0;
  minioHandler.getFilesSizes(createsha256Hash(user.id)).subscribe(size => {
    totalSize += size;
    storageInfo.set("used", totalSize);
    storageInfo.set("user", user);
    storageInfo.setACL(new Parse.ACL(user));
    storageInfo.save(null, {
      sessionToken: user.getSessionToken()
    });
  });
}

function updateStorageInfo(user: Parse.User) {
  let storageInfoQuery = new Parse.Query("StorageInfo");
  let totalSize = 0;
  storageInfoQuery.equalTo("user", user);
  storageInfoQuery
    .first({ sessionToken: user.getSessionToken() })
    .then(storageInfo => {
      if (storageInfo) {
        updateStorageUsed(user, storageInfo);
      } else {
        let storageInfo = new Parse.Object("StorageInfo");
        storageInfo.set("allowed", Math.pow(10, 9) * 30);
        updateStorageUsed(user, storageInfo);
      }
    })
    .catch(() => {
      let storageInfo = new Parse.Object("StorageInfo");
      updateStorageUsed(user, storageInfo);
    });
}

Parse.Cloud.afterSave("File", req => {
  //Only when the object is created
  if (!req.object.existed()) {
    updateStorageInfo(req.user);
  }
});

Parse.Cloud.beforeDelete("File", (req, res) => {
  if (req.master) {
    res.success("");
  }
  if (!req.user || !req.object) {
    res.error("Undefined user or object");
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

Parse.Cloud.afterDelete("File", req => {
  updateStorageInfo(req.user);
});

Parse.Cloud.beforeDelete("Folder", (req, res) => {
  if (req.master) {
    res.success("");
  }
  if (!req.user || !req.object) {
    res.error("Undefined user or object");
    return;
  }
  const folder = req.object;
  const minioHandler = new MinioHandler();
  let filesQuery = new Parse.Query("File");
  filesQuery.equalTo("folder", req.object);
  filesQuery
    .find({ sessionToken: req.user.getSessionToken() })
    .then(files => {
      //First we delete all the files contained directly in the folder
      return Parse.Object.destroyAll(files, {
        sessionToken: req.user.getSessionToken()
      });
    })
    .then(() => {
      let foldersQuery = new Parse.Query("Folder");
      foldersQuery.equalTo("parent", req.object);
      return foldersQuery
        .find({ sessionToken: req.user.getSessionToken() })
        .then(folders => {
          //Then we carry on with the subfolders recursively
          return Parse.Object.destroyAll(folders, {
            sessionToken: req.user.getSessionToken()
          });
        });
    })
    .then(() => {
      res.success("");
    })
    .catch(err => {
      res.error(err);
    });
});

Parse.Cloud.beforeSave("Folder", (req, res) => {
  const query = new Parse.Query("Folder");
  query.equalTo("name", req.object.get("name"));
  if (req.object.existed()) {
    query.notEqualTo("objectId", req.object.id);
  }
  query.equalTo("parent", req.object.get("parent"));
  query
    .first({
      sessionToken: req.user.getSessionToken()
    })
    .then(folder => {
      if (!folder) {
        res.success();
      } else {
        res.error(
          "A folder with that name already exists in the current folder"
        );
      }
    })
    .catch(err => res.error(err));
});
