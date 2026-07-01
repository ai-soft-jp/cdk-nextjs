"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3 = new client_s3_1.S3Client();
const handler = async (event) => {
    console.log(`bucketName=${event.bucketName} threashold=${new Date(event.threshold)}`);
    for await (const res of (0, client_s3_1.paginateListObjectsV2)({ client: s3 }, { Bucket: event.bucketName })) {
        const objs = res.Contents?.filter((obj) => obj.LastModified.getTime() < event.threshold);
        if (!objs?.length)
            continue;
        for (const obj of objs) {
            console.log(`delete: ${obj.Key}`);
        }
        await s3.send(new client_s3_1.DeleteObjectsCommand({
            Bucket: event.bucketName,
            Delete: { Objects: objs.map((obj) => ({ Key: obj.Key })), Quiet: true },
        }));
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map