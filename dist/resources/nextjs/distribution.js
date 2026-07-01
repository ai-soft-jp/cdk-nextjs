"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextDistribution = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const VIEWER_REQUEST_FUNCTION = `\
function handler(event) {
  var request = event.request;
  request.headers['x-forwarded-host'] = request.headers.host;
  return request;
}
`;
class NextDistribution extends constructs_1.Construct {
    distribution;
    constructor(scope, id, props) {
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
        cdk.Annotations.of(this).acknowledgeWarning('@aws-cdk/aws-cloudfront-origins:listBucketSecurityRisk', 'The Asset Origin is not associated to the default behavior.');
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
        const strictTransportSecurity = {
            accessControlMaxAge: cdk.Duration.days(365 * 2),
            includeSubdomains: true,
            preload: props.hstsPreload,
            override: true,
        };
        const customHeaders = [];
        if (props.xRobotsTag) {
            customHeaders.push({ header: 'x-robots-tag', value: props.xRobotsTag, override: false });
        }
        const contentSecurityPolicy = {
            contentSecurityPolicy: props.contentSecurityPolicy || "frame-ancestors 'self'; object-src 'none'; base-uri 'none'",
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
        const viewerRequest = {
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
exports.NextDistribution = NextDistribution;
//# sourceMappingURL=distribution.js.map