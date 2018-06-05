import * as Minio from "minio";
import * as fs from "fs";
import { Observable, Observer } from "rxjs";

/**
 * Class to make the communication with Minio
 */
export class MinioHandler {
  private static minioClient: Minio.Client;

  /**
   * Initialize the connection to Minio
   * @param accessKey Public key
   * @param secretKey Private key
   * @param endPoint The hostname
   * @param port The port
   * @param secure Set to true if served over a secure connection (i.e. https)
   */
  static initializeMinio(
    accessKey = "S40WFAXPERNK35QQME38",
    secretKey = "AIAlQvfg+9JWhQgVc9quEphqbG2iJv1Vu35pKL8z",
    endPoint = "127.0.0.1",
    port = 9000,
    secure = false
  ) {
    if (!MinioHandler.minioClient) {
      MinioHandler.minioClient = new Minio.Client({
        endPoint,
        port,
        //True if https
        secure,
        accessKey,
        secretKey
      });
      console.log("Minio client initialized");
    }
  }

  /**
   * Create a bucket
   * @param bucketName Bucket's name
   */
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

  /**
   * Remove bucket
   * @param bucketName Bucket's name
   */
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

  /**
   * Upload a file
   * @param bucketName Bucket's name
   * @param fileName File's name
   * @param file Raw file
   */
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

  /**
   * Get a url to a upload a file from a browser
   * @param bucketName Bucket's name
   * @param fileName File's name
   */
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

  /**
   * Get a url to download or view a file from browser
   * @param bucketName Bucket's name
   * @param fileName File's name
   * @param expire When the url is supposed to expire in seconds (default: 6 hours)
   */
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

  /**
   * Get a raw from data storage
   * @param bucketName Bucket's name
   * @param fileName File's name
   */
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

  /**
   * Get the stream of a file from data storage
   * @param bucketName Bucket's name
   * @param fileName File's name
   */
  getFileStream(bucketName: string, fileName: string) {
    return MinioHandler.minioClient.getObject(bucketName, fileName);
  }

  /**
   * Remove a file from data storage
   * @param bucketName Bucket's name
   * @param fileName File's name
   */
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

  /**
   * Get a list of all the files in a bucket in the form of a stream
   * @param bucketName
   */
  getFilesInBucket(bucketName: string) {
    return MinioHandler.minioClient.listObjects(bucketName);
  }

  /**
   * Get the size of a bucket
   * @param bucketName Bucket's name
   */
  getFilesSizes(bucketName: string): Observable<any> {
    //We transform the stream into an Observable for ease of use
    return Observable.create((observer: Observer<any>) => {
      let stream = this.getFilesInBucket(bucketName);
      stream.on("data", obj => {
        //We send the file size to the listeners
        observer.next(obj.size);
      });
    });
  }
}
