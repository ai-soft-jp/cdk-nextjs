import * as cdk from 'aws-cdk-lib';
import type * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
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

const VIEWER_REQUEST_FUNCTION = `\
function handler(event) {
  var request = event.request;
  request.headers['x-forwarded-host'] = request.headers.host;
  return request;
}
`;

export class NextDistribution extends Construct {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: NextDistributionProps) {
    super(scope, id);

    const originAccessControl = new cloudfront.FunctionUrlOriginAccessControl(this, 'OriginAccessControl');
    const serverOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(props.server.functionUrl, {
      originId: 'ServerFunction',
      originShieldEnabled: false,
      readTimeout: props.server.timeout,
      originAccessControl,
      ipAddressType: cloudfront.OriginIpAddressType.DUALSTACK,
    });
    const optimizationOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(props.optimization.functionUrl, {
      originId: 'ImageOptimizationFunction',
      originShieldRegion: cdk.Stack.of(props.optimization).region,
      readTimeout: props.optimization.timeout,
      originAccessControl,
      ipAddressType: cloudfront.OriginIpAddressType.DUALSTACK,
    });
    const assetOrigin = origins.S3BucketOrigin.withOriginAccessControl(props.asset, {
      originId: 'AssetBucket',
      originAccessLevels: [cloudfront.AccessLevel.READ, cloudfront.AccessLevel.LIST],
    });
    cdk.Annotations.of(this).acknowledgeWarning(
      '@aws-cdk/aws-cloudfront-origins:listBucketSecurityRisk',
      'The Asset Origin is not associated to the default behavior.',
    );

    const nextHeaders = [
      'next-router-prefetch',
      'next-router-segment-prefetch',
      'next-router-state-tree',
      'next-url',
      'rsc',
    ];
    const pageCachePolicy = new cloudfront.CachePolicy(this, 'PageCachePolicy', {
      comment: 'Next.js SSR pages cache policy',
      defaultTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(...nextHeaders, ...props.cacheHeaders),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: props.cacheCookies.length
        ? cloudfront.CacheCookieBehavior.allowList(...props.cacheCookies)
        : cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
    const imageCachePolicy = new cloudfront.CachePolicy(this, 'ImageCachePolicy', {
      comment: 'Next.js Image optimizer cache policy',
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('accept', 'origin'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('q', 'w', 'url'),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const strictTransportSecurity: cloudfront.ResponseHeadersStrictTransportSecurity = {
      accessControlMaxAge: cdk.Duration.days(365 * 2),
      includeSubdomains: true,
      preload: props.hstsPreload,
      override: true,
    };
    const customHeaders: cloudfront.ResponseCustomHeader[] = [];
    if (props.xRobotsTag) {
      customHeaders.push({ header: 'x-robots-tag', value: props.xRobotsTag, override: false });
    }
    const contentSecurityPolicy: cloudfront.ResponseHeadersContentSecurityPolicy = {
      contentSecurityPolicy:
        props.contentSecurityPolicy || "frame-ancestors 'self'; object-src 'none'; base-uri 'none'",
      override: false,
    };
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'DefaultResponsePolicy', {
      comment: 'Next.js Default response headers policy',
      securityHeadersBehavior: { contentSecurityPolicy, strictTransportSecurity },
      customHeadersBehavior: { customHeaders },
    });

    const viewerRequestFunc = new cloudfront.Function(this, 'SetForwardedHost', {
      code: cloudfront.FunctionCode.fromInline(VIEWER_REQUEST_FUNCTION),
      comment: 'Set X-Forwarded-Host',
    });
    const viewerRequest: cloudfront.FunctionAssociation = {
      function: viewerRequestFunc,
      eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
    };

    const distribution = new cloudfront.Distribution(this, 'Default', {
      certificate: props.certificate,
      domainNames: props.domainName ? [props.domainName] : undefined,
      comment: props.domainName,
      defaultBehavior: {
        origin: serverOrigin,
        cachePolicy: pageCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy,
        functionAssociations: [viewerRequest],
      },
      additionalBehaviors: {
        '/_next/image*': {
          origin: optimizationOrigin,
          cachePolicy: imageCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
        },
        '/_next/data/*': {
          origin: serverOrigin,
          cachePolicy: pageCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
          functionAssociations: [viewerRequest],
        },
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });
    ['/_next/*', '/_static/*', '/favicon.*', ...(props.staticPaths || [])].forEach((path) => {
      distribution.addBehavior(path, assetOrigin, {
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy,
      });
    });

    // https://github.com/aws/aws-cdk/issues/35872
    for (const func of [props.server, props.optimization]) {
      func.function.addPermission('AllowCloudFrontInvoke', {
        principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
        action: 'lambda:InvokeFunction',
        sourceArn: distribution.distributionArn,
        invokedViaFunctionUrl: true,
      });
    }

    this.distribution = distribution;
  }
}
