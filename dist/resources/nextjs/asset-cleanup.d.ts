import * as cdk from 'aws-cdk-lib';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type { IDependable } from 'constructs';
import { Construct } from 'constructs';
interface NextAssetCleanupProps {
    readonly wait: cdk.Duration;
    readonly expires: cdk.Duration;
    readonly distribution: cloudfront.IDistribution;
    readonly bucket: s3.IBucket;
}
export declare class NextAssetCleanup extends Construct {
    readonly resource: Construct;
    constructor(scope: Construct, id: string, props: NextAssetCleanupProps);
    addDependency(...deps: IDependable[]): void;
}
export {};
