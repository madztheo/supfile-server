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
  console.log(req.object);
  res.success();
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
  //TO-DO : Delete files and folders contained in it
  res.success("");
});
