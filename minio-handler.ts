import * as Minio from "minio";
import * as fs from "fs";

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

  removeBucket(bucketName: string) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.removeBucket(bucketName, err => {
        if (err) {
          console.log("Error removing bucket.", err);
          reject(err);
          return;
        }
        console.log(`Bucket ${bucketName} removed.`);
        resolve();
      });
    });
  }

  uploadFile(bucketName: string, fileName: string, file: any) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.putObject(bucketName, fileName, file, err => {
        if (err) {
          console.log("Error uploading file.", err);
          reject(err);
          return;
        }
        console.log(`File uploaded in bucket ${bucketName}.`);
        resolve();
      });
    });
  }

  getPresignedUploadURL(bucketName: string, fileName: string) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.presignedPutObject(
        bucketName,
        fileName,
        (err, url) => {
          if (err) {
            console.log("Error getting url", err);
            reject(err);
            return;
          }
          console.log(`Url retrieved ${url}`);
          resolve(url);
        }
      );
    });
  }

  getPresignedDownloadUrl(
    bucketName: string,
    fileName: string,
    expire = 6 * 60 * 60
  ) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.presignedGetObject(
        bucketName,
        fileName,
        expire,
        (err, downloadUrl) => {
          if (err) {
            console.log("Error getting url", err);
            reject(err);
            return;
          }
          console.log(`Url retrieved ${downloadUrl}`);
          resolve(downloadUrl);
        }
      );
    });
  }

  getFile(bucketName: string, fileName: string) {
    return MinioHandler.minioClient
      .getObject(bucketName, fileName)
      .then(stream => {
        return new Promise((resolve, reject) => {
          let file;
          stream.on("data", chunk => {
            if (!file) {
              file = chunk;
            } else {
              file += chunk;
            }
          });

          stream.on("end", () => {
            resolve(file);
          });
          stream.on("error", err => {
            reject(err);
          });
        });
      });
  }

  getFileStream(bucketName: string, fileName: string) {
    return MinioHandler.minioClient.getObject(bucketName, fileName);
  }

  removeFile(bucketName: string, fileName: string) {
    return new Promise((resolve, reject) => {
      MinioHandler.minioClient.removeObject(bucketName, fileName, err => {
        if (err) {
          console.log("Error removing file.", err);
          reject(err);
          return;
        }
        console.log(`File ${fileName} removed from bucket ${bucketName}.`);
        resolve();
      });
    });
  }
}
