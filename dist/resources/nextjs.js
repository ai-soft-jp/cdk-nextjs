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
exports.Nextjs = void 0;
const path = __importStar(require("node:path"));
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const constructs_1 = require("constructs");
const fast_glob_1 = require("fast-glob");
const asset_cleanup_1 = require("./nextjs/asset-cleanup");
const asset_deployment_1 = require("./nextjs/asset-deployment");
const distribution_1 = require("./nextjs/distribution");
const image_optimization_1 = require("./nextjs/image-optimization");
const revalidation_1 = require("./nextjs/revalidation");
const server_1 = require("./nextjs/server");
const warmer_1 = require("./nextjs/warmer");
class Nextjs extends constructs_1.Construct {
    distribution;
    constructor(scope, id, props) {
        super(scope, id);
        const staticPaths = props.staticPaths ??
            (0, fast_glob_1.globSync)('*', {
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
        const revalidation = new revalidation_1.NextRevalidation(this, 'Revalidation', { appPath: props.appPath });
        const optimization = new image_optimization_1.NextImageOptimization(this, 'ImageOptimization', { appPath: props.appPath, asset });
        const server = new server_1.NextServer(this, 'Server', {
            appPath: props.appPath,
            appPolicyArn: props.appPolicyArn,
            revalidation,
            timeout: props.timeout,
        });
        if (props.concurrency) {
            new warmer_1.NextWarmer(this, 'Warmer', { appPath: props.appPath, server, concurrency: props.concurrency });
        }
        const deployment = new asset_deployment_1.NextAssetDeployment(this, 'AssetDeployment', { appPath: props.appPath, bucket: asset });
        server.function.node.addDependency(deployment);
        optimization.function.node.addDependency(deployment);
        const distribution = new distribution_1.NextDistribution(this, 'Distribution', {
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
            const cleaner = new asset_cleanup_1.NextAssetCleanup(this, 'AssetCleanup', {
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
exports.Nextjs = Nextjs;
//# sourceMappingURL=nextjs.js.map