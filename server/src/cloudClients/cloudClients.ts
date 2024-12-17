import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Readable } from "stream";
import type {
  CloudClient,
  FileUploadArgs,
  UploadedCloudFile,
} from "prostgles-server/dist/FileManager/FileManager";
import { pickKeys } from "prostgles-types";

type S3Config = {
  Bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};
const getS3CloudClient = (s3Config: S3Config): CloudClient => {
  const bucket = pickKeys(s3Config, ["Bucket"]);

  // Initialize S3 client
  const s3Client = new S3Client({
    credentials: pickKeys(s3Config, ["accessKeyId", "secretAccessKey"]),
    region: s3Config.region,
  });

  // Helper function to upload a file to S3 and track progress
  const uploadToS3 = async (
    bucketName: string,
    objectKey: string,
    file: string | Buffer | Readable,
    contentType: string,
    onFinish: (error: any, result: UploadedCloudFile) => void,
    onProgress?: (bytesUploaded: number) => void,
  ): Promise<void> => {
    const stream = file instanceof Readable ? file : Readable.from(file);

    // Prepare the parameters for the PutObjectCommand
    const params = {
      Bucket: bucketName,
      Key: objectKey,
      Body: stream,
      ContentType: contentType,
    };
    try {
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

      const uploadedFile: UploadedCloudFile = {
        cloud_url: `https://${bucketName}.s3.amazonaws.com/${objectKey}`,
        etag: headResponse.ETag || "",
        content_length: headResponse.ContentLength || 0,
      };

      onFinish(undefined, uploadedFile);
    } catch (error: unknown) {
      onFinish(error ?? new Error("Error"), undefined as any);
    }
  };

  return {
    upload: (file: FileUploadArgs) =>
      new Promise((resolve, reject) => {
        uploadToS3(
          bucket.Bucket,
          file.fileName,
          file.file,
          file.contentType,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
            file.onFinish(error, result);
          },
          file.onProgress,
        );
      }),

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

export const getCloudClient = (config: S3Config) => getS3CloudClient(config);
