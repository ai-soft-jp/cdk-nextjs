import * as cdk from 'aws-cdk-lib';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
interface NextImageOptimizationProps {
    readonly appPath: string;
    readonly asset: s3.IBucket;
}
export declare class NextImageOptimization extends Construct {
    readonly function: lambda.Function;
    readonly functionUrl: lambda.FunctionUrl;
    readonly timeout: cdk.Duration;
    constructor(scope: Construct, id: string, props: NextImageOptimizationProps);
}
export {};
