import { DeleteObjectsCommand, paginateListObjectsV2, S3Client } from '@aws-sdk/client-s3';
import type { Handler } from 'aws-lambda';

export interface InputPayload {
  readonly bucketName: string;
  readonly threshold: number;
}

const s3 = new S3Client();

export const handler: Handler = async (event: InputPayload) => {
  console.log(`bucketName=${event.bucketName} threashold=${new Date(event.threshold)}`);

  for await (const res of paginateListObjectsV2({ client: s3 }, { Bucket: event.bucketName })) {
    const objs = res.Contents?.filter((obj) => obj.LastModified!.getTime() < event.threshold);
    if (!objs?.length) continue;

    for (const obj of objs) {
      console.log(`delete: ${obj.Key}`);
    }
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: event.bucketName,
        Delete: { Objects: objs.map((obj) => ({ Key: obj.Key })), Quiet: true },
      }),
    );
  }
};
