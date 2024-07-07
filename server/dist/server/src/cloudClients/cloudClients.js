"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCloudClient = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const stream_1 = require("stream");
const prostgles_types_1 = require("prostgles-types");
const getS3CloudClient = (s3Config) => {
    const bucket = (0, prostgles_types_1.pickKeys)(s3Config, ["Bucket"]);
    // Initialize S3 client
    const s3Client = new client_s3_1.S3Client({
        credentials: (0, prostgles_types_1.pickKeys)(s3Config, ["accessKeyId", "secretAccessKey"]),
        region: s3Config.region,
    });
    // Helper function to upload a file to S3 and track progress
    const uploadToS3 = async (bucketName, objectKey, file, contentType, onFinish, onProgress) => {
        const stream = file instanceof stream_1.Readable ? file : stream_1.Readable.from(file);
        // Prepare the parameters for the PutObjectCommand
        const params = {
            Bucket: bucketName,
            Key: objectKey,
            Body: stream,
            ContentType: contentType,
        };
        try {
            const parallelUploads3 = new lib_storage_1.Upload({
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
            const headCommand = new client_s3_1.GetObjectCommand({ ...bucket, Key: objectKey });
            const headResponse = await s3Client.send(headCommand);
            const uploadedFile = {
                cloud_url: `https://${bucketName}.s3.amazonaws.com/${objectKey}`,
                etag: headResponse.ETag || "",
                content_length: headResponse.ContentLength || 0,
            };
            onFinish(undefined, uploadedFile);
        }
        catch (error) {
            onFinish(error ?? new Error("Error"), undefined);
        }
    };
    return {
        upload: (file) => new Promise((resolve, reject) => {
            uploadToS3(bucket.Bucket, file.fileName, file.file, file.contentType, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
                file.onFinish(error, result);
            }, file.onProgress);
        }),
        downloadAsStream: async (name) => {
            const command = new client_s3_1.GetObjectCommand({ ...bucket, Key: name });
            const response = await s3Client.send(command);
            return response.Body;
        },
        delete: async (fileName) => {
            const command = new client_s3_1.DeleteObjectCommand({ ...bucket, Key: fileName });
            await s3Client.send(command);
        },
        getSignedUrlForDownload: async (fileName, expiresInSeconds) => {
            const command = new client_s3_1.GetObjectCommand({ ...bucket, Key: fileName });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresInSeconds });
            return url;
        },
    };
};
const getCloudClient = (config) => getS3CloudClient(config);
exports.getCloudClient = getCloudClient;
//# sourceMappingURL=cloudClients.js.map