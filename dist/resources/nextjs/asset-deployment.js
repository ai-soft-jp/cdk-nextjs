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
exports.NextAssetDeployment = void 0;
const path = __importStar(require("node:path"));
const cdk = __importStar(require("aws-cdk-lib"));
const deployment = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const constructs_1 = require("constructs");
class NextAssetDeployment extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        cdk.RemovalPolicies.of(this).destroy({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });
        const assets = deployment.Source.asset(path.resolve(props.appPath, '.open-next/assets'), {
            followSymlinks: cdk.SymlinkFollowMode.ALWAYS,
        });
        new deployment.BucketDeployment(this, 'Next', {
            destinationBucket: props.bucket,
            sources: [assets],
            exclude: ['*'],
            include: ['_next/*'],
            cacheControl: [
                deployment.CacheControl.setPublic(),
                deployment.CacheControl.maxAge(cdk.Duration.days(365)),
                deployment.CacheControl.immutable(),
            ],
            prune: false,
        });
        new deployment.BucketDeployment(this, 'Static', {
            destinationBucket: props.bucket,
            sources: [assets],
            exclude: ['*'],
            include: ['_static/*'],
            cacheControl: [
                deployment.CacheControl.setPublic(),
                deployment.CacheControl.maxAge(cdk.Duration.days(7)),
                deployment.CacheControl.staleWhileRevalidate(cdk.Duration.days(7)),
            ],
            prune: false,
        });
        new deployment.BucketDeployment(this, 'Public', {
            destinationBucket: props.bucket,
            sources: [assets],
            exclude: ['_next/*', '_static/*'],
            cacheControl: [
                deployment.CacheControl.setPublic(),
                deployment.CacheControl.maxAge(cdk.Duration.hours(1)),
                deployment.CacheControl.sMaxAge(cdk.Duration.days(365)),
                deployment.CacheControl.mustRevalidate(),
            ],
            prune: false,
        });
    }
}
exports.NextAssetDeployment = NextAssetDeployment;
//# sourceMappingURL=asset-deployment.js.map