import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  CloudStorageClient,
  CloudUploadedFileDetails,
} from "prostgles-server/dist/StorageClient/StorageClientTypes";
import { pickKeys } from "prostgles-types";
import { Readable } from "stream";

type S3Config = {
  Bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
};
const getS3CloudClient = (s3Config: S3Config): CloudStorageClient => {
  const bucket = pickKeys(s3Config, ["Bucket"]);

  // Initialize S3 client
  const s3Client = new S3Client({
    credentials: pickKeys(s3Config, ["accessKeyId", "secretAccessKey"]),
    region: s3Config.region || "auto",
    endpoint: s3Config.endpoint,
  });

  // Helper function to upload a file to S3 and track progress
  const uploadToS3 = async (
    bucketName: string,
    objectKey: string,
    file: string | Buffer | Readable,
    contentType: string,
    onProgress?: (bytesUploaded: number) => void,
  ) => {
    const stream = file instanceof Readable ? file : Readable.from(file);

    // Prepare the parameters for the PutObjectCommand
    const params = {
      Bucket: bucketName,
      Key: objectKey,
      Body: stream,
      ContentType: contentType,
    };
    const parallelUploads3 = new Upload({
      client: s3Client,
      // tags: [...], // optional tags
      // queueSize: 4, // optional concurrency configuration
      leavePartsOnError: false, // optional manually handle dropped parts
      params,
    });

    parallelUploads3.on("httpUploadProgress", (progres) => {
      onProgress?.(progres.loaded ?? 0);
    });

    await parallelUploads3.done();

    // Fetch the object metadata to get etag and content length
    const headCommand = new GetObjectCommand({ ...bucket, Key: objectKey });
    const headResponse = await s3Client.send(headCommand);

    const endpoint =
      s3Config.endpoint || `https://${bucketName}.s3.amazonaws.com/`;

    const uploadedFile: CloudUploadedFileDetails = {
      type: "cloud",
      url: `${endpoint}${objectKey}`,
      contentHash: headResponse.ETag || "",
      contentLength: headResponse.ContentLength || 0,
    };

    return uploadedFile;
  };

  return {
    type: "cloud",
    upload: (file) =>
      uploadToS3(
        bucket.Bucket,
        file.fileName,
        file.file,
        file.contentType,
        file.onProgress,
      ),

    downloadAsStream: async (name: string) => {
      const command = new GetObjectCommand({ ...bucket, Key: name });
      const response = await s3Client.send(command);
      return response.Body as Readable;
    },

    delete: async (fileName: string) => {
      const command = new DeleteObjectCommand({ ...bucket, Key: fileName });
      await s3Client.send(command);
    },

    getSignedUrlForDownload: async (
      fileName: string,
      expiresInSeconds: number,
    ) => {
      const command = new GetObjectCommand({ ...bucket, Key: fileName });
      const url = await getSignedUrl(s3Client, command, {
        expiresIn: expiresInSeconds,
      });
      return url;
    },
  };
};

export const getCloudClient = getS3CloudClient;
