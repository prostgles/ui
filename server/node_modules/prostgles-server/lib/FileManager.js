"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asSQLIdentifier = void 0;
const aws_sdk_1 = require("aws-sdk");
const fs = __importStar(require("fs"));
const FileType = __importStar(require("file-type"));
const sharp = __importStar(require("sharp"));
const prostgles_types_1 = require("prostgles-types");
const HOUR = 3600 * 1000;
const asSQLIdentifier = async (name, db) => {
    return (await db.one("select format('%I', $1) as name", [name]))?.name;
};
exports.asSQLIdentifier = asSQLIdentifier;
class FileManager {
    constructor(config, imageOptions) {
        this.uploadAsMedia = async (params) => {
            const { item, imageOptions } = params;
            const { name, data, content_type } = item;
            if (!data)
                throw "No file provided";
            if (!name || typeof name !== "string")
                throw "Expecting a string name";
            // const type = await this.getMIME(data, name, allowedExtensions, dissallowedExtensions);
            let _data = data;
            if (content_type.startsWith("image")) {
                const compression = imageOptions?.compression;
                if (compression) {
                    console.log("Resizing image");
                    let opts;
                    if ("contain" in compression) {
                        opts = {
                            fit: sharp.fit.contain,
                            ...compression.contain
                        };
                    }
                    else if ("inside" in compression) {
                        opts = {
                            fit: sharp.fit.inside,
                            ...compression.inside
                        };
                    }
                    _data = await sharp(data)
                        .resize(opts)
                        .withMetadata(Boolean(imageOptions?.keepMetadata))
                        // .jpeg({ quality: 80 })
                        .toBuffer();
                }
                else if (!imageOptions?.keepMetadata) {
                    /**
                     * Remove exif
                     */
                    _data = await sharp(data)
                        .clone()
                        .toBuffer();
                }
            }
            const res = await this.upload(_data, name, content_type);
            return res;
        };
        this.parseSQLIdentifier = async (name) => (0, exports.asSQLIdentifier)(name, this.prostgles.db); //  this.prostgles.dbo.sql<"value">("select format('%I', $1)", [name], { returnType: "value" } )
        this.init = async (prg) => {
            this.prostgles = prg;
            // const { dbo, db, opts } = prg;
            const { fileTable } = prg.opts;
            if (!fileTable)
                throw "fileTable missing";
            const { tableName = "media", referencedTables = {} } = fileTable;
            this.tableName = tableName;
            const maxBfSizeMB = prg.opts.io?.engine?.opts?.maxHttpBufferSize / 1e6;
            console.log(`Prostgles: Initiated file manager. Max allowed file size: ${maxBfSizeMB}MB (maxHttpBufferSize = 1e6). To increase this set maxHttpBufferSize in socket.io server init options`);
            // throw "Why are constraints dissapearing?"
            /**
             * 1. Create media table
             */
            if (!this.dbo[tableName]) {
                console.log(`Creating fileTable ${(0, prostgles_types_1.asName)(tableName)} ...`);
                await this.db.any(`CREATE EXTENSION IF NOT EXISTS pgcrypto `);
                await this.db.any(`CREATE TABLE IF NOT EXISTS ${(0, prostgles_types_1.asName)(tableName)} (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name                TEXT NOT NULL,
          extension           TEXT NOT NULL,
          content_type        TEXT NOT NULL,
          url                 TEXT NOT NULL,
          original_name       TEXT NOT NULL,

          description         TEXT,
          s3_url              TEXT,
          signed_url          TEXT,
          signed_url_expires  BIGINT,
          etag                TEXT,
          UNIQUE(name)
      )`);
                console.log(`Created fileTable ${(0, prostgles_types_1.asName)(tableName)}`);
                await prg.refreshDBO();
            }
            /**
             * 2. Create media lookup tables
             */
            await Promise.all(Object.keys(referencedTables).map(async (refTable) => {
                if (!this.dbo[refTable])
                    throw `Referenced table (${refTable}) from fileTable.referencedTables record is missing`;
                // const lookupTableName = asName(`lookup_${tableName}_${refTable}`);
                const lookupTableName = await this.parseSQLIdentifier(`prostgles_lookup_${tableName}_${refTable}`);
                const pKeyFields = (await this.dbo[refTable].getColumns()).filter(f => f.is_pkey);
                if (pKeyFields.length !== 1)
                    throw `Could not make link table for ${refTable}. ${pKeyFields} must have exactly one primary key column. Current pkeys: ${pKeyFields.map(f => f.name)}`;
                const pkField = pKeyFields[0];
                const refType = referencedTables[refTable];
                if (!this.dbo[lookupTableName]) {
                    // if(!(await dbo[lookupTableName].count())) await db.any(`DROP TABLE IF EXISTS  ${lookupTableName};`);
                    const action = ` (${tableName} <-> ${refTable}) join table ${lookupTableName}`; //  PRIMARY KEY
                    const query = `        
        CREATE TABLE ${lookupTableName} (
          foreign_id  ${pkField.udt_name} ${refType === "one" ? " PRIMARY KEY " : ""} REFERENCES ${(0, prostgles_types_1.asName)(refTable)}(${(0, prostgles_types_1.asName)(pkField.name)}),
          media_id    UUID NOT NULL REFERENCES ${(0, prostgles_types_1.asName)(tableName)}(id)
        )
        `;
                    console.log(`Creating ${action} ...`, lookupTableName);
                    await this.db.any(query);
                    console.log(`Created ${action}`);
                }
                else {
                    const cols = await this.dbo[lookupTableName].getColumns();
                    const badCols = cols.filter(c => !c.references);
                    await Promise.all(badCols.map(async (badCol) => {
                        console.error(`Prostgles: media ${lookupTableName} joining table has lost a reference constraint for column ${badCol.name}.` +
                            ` This may have been caused by a DROP TABLE ... CASCADE.`);
                        let q = `
            ALTER TABLE ${(0, prostgles_types_1.asName)(lookupTableName)} 
            ADD CONSTRAINT ${(lookupTableName + "_" + badCol.name + "_r")} FOREIGN KEY (${badCol.name})
          `;
                        console.log("Trying to add the missing constraint back");
                        if (badCol.name === "foreign_id") {
                            q += `REFERENCES ${(0, prostgles_types_1.asName)(refTable)}(${(0, prostgles_types_1.asName)(pkField.name)}) `;
                        }
                        else if (badCol.name === "media_id") {
                            q += `REFERENCES ${(0, prostgles_types_1.asName)(tableName)}(id) `;
                        }
                        if (q) {
                            try {
                                await this.db.any(q);
                                console.log("Added missing constraint back");
                            }
                            catch (e) {
                                console.error("Failed to add missing constraint", e);
                            }
                        }
                    }));
                }
                await prg.refreshDBO();
                return true;
            }));
            /**
             * 4. Serve media through express
             */
            const { fileServeRoute = `/${tableName}`, expressApp: app } = fileTable;
            this.fileRoute = fileServeRoute;
            if (app) {
                app.get(this.fileRoute + "/:name", async (req, res) => {
                    if (!this.dbo[tableName]) {
                        res.status(500).json({ err: `Internal error: media table (${tableName}) not valid` });
                        return false;
                    }
                    const mediaTable = this.dbo[tableName];
                    try {
                        const { name } = req.params;
                        if (typeof name !== "string" || !name)
                            throw "Invalid media name";
                        const media = await mediaTable.findOne({ name }, { select: { id: 1, name: 1, signed_url: 1, signed_url_expires: 1, content_type: 1 } }, { httpReq: req });
                        if (!media) {
                            /**
                             * Redirect to login !??
                             */
                            // const mediaExists = await mediaTable.count({ name });
                            // if(mediaExists && this.prostgles.authHandler){
                            // } else {
                            //   throw "Invalid media";
                            // }
                            throw "Invalid media";
                        }
                        if (this.s3Client) {
                            let url = media.signed_url;
                            const expires = +(media.signed_url_expires || 0);
                            const EXPIRES = Date.now() + HOUR;
                            if (!url || expires < EXPIRES) {
                                url = await this.getFileURL(media.name, 60 * 60);
                                await mediaTable.update({ name }, { signed_url: url, signed_url_expires: EXPIRES });
                            }
                            res.redirect(url);
                        }
                        else {
                            const pth = `${this.config.localFolderPath}/${media.name}`;
                            res.contentType(media.content_type);
                            res.sendFile(pth);
                        }
                    }
                    catch (e) {
                        console.log(e);
                        res.status(404).json({ err: "Invalid/missing media" });
                    }
                });
            }
        };
        this.config = config;
        this.imageOptions = imageOptions;
        if ("region" in config) {
            const { region, accessKeyId, secretAccessKey } = config;
            this.s3Client = new aws_sdk_1.S3({
                region,
                credentials: { accessKeyId, secretAccessKey },
            });
        }
    }
    get dbo() {
        if (!this.prostgles?.dbo)
            throw "this.prostgles.dbo missing";
        return this.prostgles.dbo;
    }
    ;
    get db() {
        if (!this.prostgles?.db)
            throw "this.prostgles.db missing";
        return this.prostgles.db;
    }
    ;
    async getMIME(file, fileName, allowedExtensions, dissallowedExtensions, onlyFromName = true) {
        const nameParts = fileName.split(".");
        const nameExt = nameParts[nameParts.length - 1].toLowerCase(), mime = (0, prostgles_types_1.getKeys)(CONTENT_TYPE_TO_EXT).find(k => CONTENT_TYPE_TO_EXT[k].includes(nameExt));
        let type = {
            fileName,
            mime,
            ext: nameExt,
        };
        if (onlyFromName && !mime)
            throw `Invalid file extension: content_type could not be found for extension(${nameExt})`;
        if (!mime) {
            /* Set correct/missing extension */
            if (["xml", "txt", "csv", "tsv", "doc"].includes(nameExt)) {
                type = { ...type, mime: ("text/" + nameExt), ext: nameExt };
            }
            else if (["svg"].includes(nameExt)) {
                type = { ...type, mime: "image/svg+xml", ext: nameExt };
            }
            else if (Buffer.isBuffer(file)) {
                const res = await FileType.fromBuffer(file);
                type = {
                    ...res,
                    fileName,
                };
            }
            else if (typeof file === "string") {
                const res = await FileType.fromFile(file);
                type = {
                    ...res,
                    fileName,
                };
            }
            else {
                throw "Unexpected file. Expecting: Buffer | String";
            }
        }
        if (allowedExtensions &&
            !allowedExtensions.map(v => v.toLowerCase())?.includes(type.ext)) {
            throw fileName + " -> File type ( " + type.ext + " ) not allowed. Expecting one of: " + allowedExtensions.map(v => v.toLowerCase()).join(", ");
        }
        else if (dissallowedExtensions &&
            dissallowedExtensions.map(v => v.toLowerCase())?.includes(type.ext)) {
            throw fileName + " -> File type ( " + type.ext + " ) not allowed";
        }
        if (!onlyFromName) {
            let { ext } = type;
            if (nameExt !== ext)
                fileName = nameParts.slice(0, -1).join('') + "." + ext;
        }
        const res = {
            ...type,
            fileName
        };
        if (!res.mime)
            throw "Could not find mime";
        return res;
    }
    // async getUploadURL(fileName: string): Promise<string> {
    //   const thisHour = new Date();
    //   thisHour.setMilliseconds(0);
    //   thisHour.setSeconds(0);
    //   thisHour.setMinutes(0);
    //   const now = Date.now();
    //   const HOUR = 60 * 60;
    //   const params = {
    //     Bucket: this.config.bucket, 
    //     Key: fileName, 
    //     Expires: Math.round(((now - (+thisHour))/1000 + 2 * HOUR )), // one hour
    //     ACL: "bucket-owner-full-control", 
    //     ContentType: "image/png",
    //   };
    //   return await this.s3Client.getSignedUrlPromise("putObject", params)
    // }
    async upload(file, name, mime) {
        return new Promise(async (resolve, reject) => {
            if (!file) {
                throw "No file. Expecting: Buffer | String";
            }
            if (!name) {
                throw "No name. Expecting: String";
            }
            // let type = await this.getMIME(file, name, allowedExtensions);
            const url = `${this.fileRoute}/${name}`;
            if (!this.s3Client) {
                const config = this.config;
                try {
                    await fs.promises.mkdir(config.localFolderPath, { recursive: true });
                    fs.writeFileSync(`${config.localFolderPath}/${name}`, file);
                    resolve({
                        url,
                        etag: `none`,
                    });
                }
                catch (err) {
                    console.error("Error saving file locally", err);
                    reject("Internal error");
                }
            }
            else {
                /* S3 Upload */
                // ACL: "public-read", 
                /* ACL needs this permission:
                    "s3:PutObject",
                    "s3:PutObjectAcl",
                    "s3:GetObject",
                    "s3:GetObjectAcl",
                  */
                const params = {
                    Bucket: this.config.bucket,
                    Key: name,
                    ContentType: mime,
                    Body: file
                };
                this.s3Client.upload(params, (err, res) => {
                    if (err) {
                        reject("Something went wrong");
                        console.error(err);
                    }
                    else {
                        // console.log("Uploaded file:", res)
                        resolve({
                            url,
                            etag: res.ETag,
                            s3_url: res.Location,
                        });
                    }
                });
            }
        });
    }
    async getFileURL(fileName, expiresInSeconds = 30 * 60) {
        const params = {
            Bucket: this.config.bucket,
            Key: fileName,
            Expires: expiresInSeconds || 30 * 60
        };
        return await this.s3Client?.getSignedUrlPromise("getObject", params);
    }
}
exports.default = FileManager;
const CONTENT_TYPE_TO_EXT = {
    "text/html": ["html", "htm", "shtml"],
    "text/css": ["css"],
    "text/xml": ["xml"],
    "text/mathml": ["mml"],
    "text/plain": ["txt"],
    "text/vnd.sun.j2me.app-descriptor": ["jad"],
    "text/vnd.wap.wml": ["wml"],
    "text/x-component": ["htc"],
    "image/gif": ["gif"],
    "image/jpeg": ["jpeg", "jpg"],
    "image/png": ["png"],
    "image/tiff": ["tif", "tiff"],
    "image/vnd.wap.wbmp": ["wbmp"],
    "image/x-icon": ["ico"],
    "image/x-jng": ["jng"],
    "image/x-ms-bmp": ["bmp"],
    "image/svg+xml": ["svg"],
    "image/webp": ["webp"],
    "application/x-javascript": ["js"],
    "application/atom+xml": ["atom"],
    "application/rss+xml": ["rss"],
    "application/java-archive": ["jar", "war", "ear"],
    "application/mac-binhex40": ["hqx"],
    "application/msword": ["doc", "docx"],
    "application/pdf": ["pdf"],
    "application/postscript": ["ps", "eps", "ai"],
    "application/rtf": ["rtf"],
    "application/vnd.ms-excel": ["xls", "xlsx"],
    "application/vnd.ms-powerpoint": ["ppt", "pptx"],
    "application/vnd.wap.wmlc": ["wmlc"],
    "application/vnd.google-earth.kml+xml": ["kml"],
    "application/vnd.google-earth.kmz": ["kmz"],
    "application/x-7z-compressed": ["7z"],
    "application/x-cocoa": ["cco"],
    "application/x-java-archive-diff": ["jardiff"],
    "application/x-java-jnlp-file": ["jnlp"],
    "application/x-makeself": ["run"],
    "application/x-perl": ["pl", "pm"],
    "application/x-pilot": ["prc", "pdb"],
    "application/x-rar-compressed": ["rar"],
    "application/x-redhat-package-manager": ["rpm"],
    "application/x-sea": ["sea"],
    "application/x-shockwave-flash": ["swf"],
    "application/x-stuffit": ["sit"],
    "application/x-tcl": ["tcl", "tk"],
    "application/x-x509-ca-cert": ["der", "pem", "crt"],
    "application/x-xpinstall": ["xpi"],
    "application/xhtml+xml": ["xhtml"],
    "application/zip": ["zip"],
    "application/octet-stream": ["bin", "exe", "dll", "deb", "dmg", "eot", "iso", "img", "msi", "msp", "msm"],
    "audio/midi": ["mid", "midi", "kar"],
    "audio/mpeg": ["mp3"],
    "audio/ogg": ["ogg"],
    "audio/x-realaudio": ["ra"],
    "video/3gpp": ["3gpp", "3gp"],
    "video/mpeg": ["mpeg", "mpg"],
    "video/quicktime": ["mov"],
    "video/x-flv": ["flv"],
    "video/x-mng": ["mng"],
    "video/x-ms-asf": ["asx", "asf"],
    "video/x-ms-wmv": ["wmv"],
    "video/x-msvideo": ["avi"],
    "video/mp4": ["m4v", "mp4"],
    "video/webm": ["webm"],
};
/**
 *
 

    // if(content_type && typeof content_type !== "string") throw "Invalid content_type provided";
    // if(title && typeof title !== "string") throw "Invalid title provided";
    // let fExt = name.split(".").pop()
    // if(content_type && name.split(".").length > 1 && fExt && fExt.length <= 4){
    //   type = {
    //     mime: content_type,
    //     ext: fExt,
    //     fileName: name,
    //   }
    // } else {
    //   type = await this.getMIME(data, name);//, ["png", "jpg", "ogg", "webm", "pdf", "doc"]);
    // }



 */ 
