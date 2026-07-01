import type { Handler } from 'aws-lambda';
export interface InputPayload {
    readonly bucketName: string;
    readonly threshold: number;
}
export declare const handler: Handler;
