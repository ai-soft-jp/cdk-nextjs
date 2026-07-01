import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { NextFunction } from './function';
interface NextRevalidationProps {
    readonly appPath: string;
}
export declare class NextRevalidation extends Construct {
    readonly queue: sqs.Queue;
    readonly cache: s3.Bucket;
    readonly table: dynamodb.TableV2;
    readonly function: NextFunction;
    constructor(scope: Construct, id: string, props: NextRevalidationProps);
}
export {};
