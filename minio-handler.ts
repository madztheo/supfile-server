import * as Minio from "minio";

export class MinioHandler {
  private static minioClient: Minio.Client;

  static initializeMinio() {
    if (!MinioHandler.minioClient) {
      MinioHandler.minioClient = new Minio.Client({
        endPoint: "127.0.0.1",
        port: 9000,
        //True if https
        secure: false,
        accessKey: "S40WFAXPERNK35QQME38",
        secretKey: "AIAlQvfg+9JWhQgVc9quEphqbG2iJv1Vu35pKL8z"
      });
      console.log("Minio client initialized");
    }
  }

  createBucket(bucketName: string) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.makeBucket(bucketName, "", err => {
        if (err) {
          console.log("Error creating bucket.", err);
          reject(err);
          return;
        }
        console.log(`Bucket ${bucketName} created successfully.`);
        resolve();
      });
    });
  }
}
