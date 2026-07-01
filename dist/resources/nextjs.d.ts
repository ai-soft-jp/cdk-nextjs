import * as cdk from 'aws-cdk-lib';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
export interface NextjsBaseProps {
    /**
     * The path of the Next.js application.
     */
    readonly appPath: string;
    /**
     * The ARN of the certificate associated to the CloudFront distribution.
     */
    readonly certificateArn: string;
    /**
     * The ARN of the IAM managed policy attached to the Next.js server function.
     * @default - No managed policy is attached.
     */
    readonly appPolicyArn?: string;
    /**
     * Whether to cleanup assets
     * @default true
     */
    readonly assetCleanup?: boolean;
}
export interface NextjsOptions {
    /**
     * The domain name of the Next.js application.
     */
    readonly domainName: string;
    /**
     * The number of warmers.
     * @default - No warmers are activated.
     */
    readonly concurrency?: number;
    /**
     * The static paths routed to the assets bucket.
     * @default - Determined from the public directory.
     */
    readonly staticPaths?: readonly string[];
    /**
     * The HTTP headers excluded from cache
     * @default - Only Next.js headers.
     */
    readonly cacheHeaders?: readonly string[];
    /**
     * The HTTP cookies excluded from cache
     * @default - No cookies.
     */
    readonly cacheCookies?: readonly string[];
    /**
     * The value of x-robots-tag response header.
     * @default - No x-robots-tag header.
     */
    readonly xRobotsTag?: string;
    /**
     * Whether to add preload flag to the HSTS response header.
     * @default false
     */
    readonly hstsPreload?: boolean;
    /**
     * The value of CSP response header.
     * @default "frame-ancestors 'self'; object-src 'none'; base-uri 'none'"
     */
    readonly contentSecurityPolicy?: string;
    /**
     * The timeout duration of the Next.js server function.
     * @default cdk.Duration.seconds(30)
     */
    readonly timeout?: cdk.Duration;
}
interface NextjsProps extends NextjsBaseProps, NextjsOptions {
}
export declare class Nextjs extends Construct {
    readonly distribution: cloudfront.IDistribution;
    constructor(scope: Construct, id: string, props: NextjsProps);
}
export {};
