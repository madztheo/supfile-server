import { MinioHandler } from "../minio-handler";
import { createsha256Hash } from "../crypto-function";

/**
 * After user registration
 */
Parse.Cloud.afterSave(Parse.User, req => {
  //We create its bucket right after registration
  let minioHandler = new MinioHandler();
  minioHandler.createBucket(createsha256Hash(req.object.id));
});

/**
 * After user deletion
 */
Parse.Cloud.afterDelete(Parse.User, req => {
  let minioHandler = new MinioHandler();
  //We delete the bucket of the user after he deleted his account
  minioHandler.removeBucket(createsha256Hash(req.object.id));
});

/**
 * Before a representation of file is saved to the database
 */
Parse.Cloud.beforeSave("File", (req, res) => {
  const fileName = req.object.get("name");
  //To keep the original name of the file
  if (!req.object.get("fileName")) {
    req.object.set("fileName", fileName);
  }
  //Try to find if a file with same already exists
  const query = new Parse.Query("File");
  query.equalTo("name", fileName);
  //We don't add this condition to the query if the file has just been created,
  //because at this step of the process the file doesn't have an id yet.
  if (req.object.existed()) {
    //We want to the exclude the file itself from the query
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

/**
 * Update the storage used by the user
 * @param user User
 * @param storageInfo Storage Info object associated to the user
 */
function updateStorageUsed(user: Parse.User, storageInfo: Parse.Object) {
  const minioHandler = new MinioHandler();
  let totalSize = 0;
  //We will received each file's size one by one
  minioHandler.getFilesSizes(createsha256Hash(user.id)).subscribe(size => {
    //We get the sum of the sizes
    totalSize += size;
    storageInfo.set("used", totalSize);
    storageInfo.set("user", user);
    storageInfo.setACL(new Parse.ACL(user));
    storageInfo.save(null, {
      sessionToken: user.getSessionToken()
    });
  });
}

/**
 * Update a user's storage information
 * @param user User
 */
function updateStorageInfo(user: Parse.User) {
  //We try to get the StorageInfo object associated to the user
  let storageInfoQuery = new Parse.Query("StorageInfo");
  storageInfoQuery.equalTo("user", user);
  storageInfoQuery
    .first({ sessionToken: user.getSessionToken() })
    .then(storageInfo => {
      if (storageInfo) {
        //We got one so we just use it and compute the storage used
        updateStorageUsed(user, storageInfo);
      } else {
        //The user doesn't have on yet, so we create one
        let storageInfo = new Parse.Object("StorageInfo");
        //The user has 30GB of storage at its disposal
        storageInfo.set("allowed", Math.pow(10, 9) * 30);
        updateStorageUsed(user, storageInfo);
      }
    })
    .catch(() => {
      //Just in case
      let storageInfo = new Parse.Object("StorageInfo");
      updateStorageUsed(user, storageInfo);
    });
}

/**
 * After a file is saved to database
 */
Parse.Cloud.afterSave("File", req => {
  //Only when the object is created.
  //We don't want to compute storage used if the file representation
  //has just been updated as it cannot trigger a file size change.
  if (!req.object.existed()) {
    updateStorageInfo(req.user);
  }
});

/**
 * Before a file is deleted
 */
Parse.Cloud.beforeDelete("File", (req, res) => {
  if (!req.user || !req.object) {
    res.error("Undefined user or object");
    return;
  }
  const fileName = req.object.get("fileName");
  const minioHandler = new MinioHandler();
  //We delete the file from the data storage before
  //deleting its representation in the database
  minioHandler
    .removeFile(createsha256Hash(req.user.id), fileName)
    .then(() => {
      res.success("");
    })
    .catch(() => {
      res.error("Unable to remove file");
    });
});

/**
 * After a file has been deleted
 */
Parse.Cloud.afterDelete("File", req => {
  //Because we have one less file in our data storage
  //we recompute the storage used by the user
  updateStorageInfo(req.user);
});

/**
 * Before a folder is deleted
 */
Parse.Cloud.beforeDelete("Folder", (req, res) => {
  if (!req.user || !req.object) {
    res.error("Undefined user or object");
    return;
  }
  const folder = req.object;
  const minioHandler = new MinioHandler();
  //We make sure to delete all the content of the folder
  //before deleting it
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
          //as this will trigger the beforeDelete of the subfolders
          //and their subfolders and so on until there's no more left.
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

/**
 * Before a folder is saved to the database
 */
Parse.Cloud.beforeSave("Folder", (req, res) => {
  //We make sure that a folder with the same name
  //and same parent folder doesn't exist before
  //allowing to update or create the folder
  const query = new Parse.Query("Folder");
  query.equalTo("name", req.object.get("name"));
  //Id is not generated yet if it's the folder's creation
  if (req.object.existed()) {
    //To exclude the folder itself from the query
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
