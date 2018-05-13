import { MinioHandler } from "../minio-handler";

function createUserStorage(req, res) {
  if (!req.user) {
    res.error("User undefined");
  }
  let minioHandler = new MinioHandler();
  minioHandler
    .createBucket(req.user.id.toLowerCase())
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
  minioHandler.createBucket(req.object.id.toLowerCase());
});
