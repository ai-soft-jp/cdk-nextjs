import type { Handler } from 'aws-lambda';
export type Env = {
    readonly STATE_MACHINE_ARN: string;
    readonly EXPIRES: string;
};
export declare const handler: Handler;
