import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { globSync } from 'fast-glob';
import { NextAssetCleanup } from './nextjs/asset-cleanup';
import { NextAssetDeployment } from './nextjs/asset-deployment';
import { NextDistribution } from './nextjs/distribution';
import { NextImageOptimization } from './nextjs/image-optimization';
import { NextRevalidation } from './nextjs/revalidation';
import { NextServer } from './nextjs/server';
import { NextWarmer } from './nextjs/warmer';

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

interface NextjsProps extends NextjsBaseProps, NextjsOptions {}

export class Nextjs extends Construct {
  readonly distribution: cloudfront.IDistribution;

  constructor(scope: Construct, id: string, props: NextjsProps) {
    super(scope, id);

    const staticPaths =
      props.staticPaths ??
      globSync('*', {
        cwd: path.join(props.appPath, 'public'),
        ignore: ['favicon.*'],
        onlyFiles: false,
        objectMode: true,
      }).map((entry) => (entry.dirent.isDirectory() ? `/${entry.name}/*` : `/${entry.name}`));

    const asset = new s3.Bucket(this, 'AssetBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ abortIncompleteMultipartUploadAfter: cdk.Duration.days(1) }],
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const revalidation = new NextRevalidation(this, 'Revalidation', { appPath: props.appPath });
    const optimization = new NextImageOptimization(this, 'ImageOptimization', { appPath: props.appPath, asset });
    const server = new NextServer(this, 'Server', {
      appPath: props.appPath,
      appPolicyArn: props.appPolicyArn,
      revalidation,
      timeout: props.timeout,
    });
    if (props.concurrency) {
      new NextWarmer(this, 'Warmer', { appPath: props.appPath, server, concurrency: props.concurrency });
    }

    const deployment = new NextAssetDeployment(this, 'AssetDeployment', { appPath: props.appPath, bucket: asset });
    server.function.node.addDependency(deployment);
    optimization.function.node.addDependency(deployment);

    const distribution = new NextDistribution(this, 'Distribution', {
      certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn),
      domainName: props.domainName,
      asset,
      optimization,
      server,
      staticPaths,
      cacheHeaders: props.cacheHeaders || [],
      cacheCookies: props.cacheCookies || [],
      xRobotsTag: props.xRobotsTag,
      hstsPreload: props.hstsPreload,
      contentSecurityPolicy: props.contentSecurityPolicy,
    });

    if (props.assetCleanup ?? true) {
      const cleaner = new NextAssetCleanup(this, 'AssetCleanup', {
        wait: cdk.Duration.days(1),
        expires: cdk.Duration.days(1),
        distribution: distribution.distribution,
        bucket: asset,
      });
      cleaner.addDependency(deployment);
    }

    this.distribution = distribution.distribution;
  }
}
