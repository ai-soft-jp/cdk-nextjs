import type * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import type { NextImageOptimization } from './image-optimization.js';
import type { NextServer } from './server.js';
interface NextDistributionProps {
    readonly certificate?: acm.ICertificateRef;
    readonly domainName?: string;
    readonly asset: s3.IBucket;
    readonly server: NextServer;
    readonly optimization: NextImageOptimization;
    readonly staticPaths?: readonly string[];
    readonly cacheHeaders: readonly string[];
    readonly cacheCookies: readonly string[];
    readonly xRobotsTag?: string;
    readonly hstsPreload?: boolean;
    readonly contentSecurityPolicy?: string;
}
export declare class NextDistribution extends Construct {
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: NextDistributionProps);
}
export {};
