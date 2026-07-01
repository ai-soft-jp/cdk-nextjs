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
exports.NextRevalidation = void 0;
const path = __importStar(require("node:path"));
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const events = __importStar(require("aws-cdk-lib/aws-lambda-event-sources"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const deployment = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
const function_1 = require("./function");
class NextRevalidation extends constructs_1.Construct {
    queue;
    cache;
    table;
    function;
    constructor(scope, id, props) {
        super(scope, id);
        const queue = new sqs.Queue(this, 'Queue', {
            fifo: true,
        });
        const table = new dynamodb.TableV2(this, 'TableV2', {
            partitionKey: { name: 'tag', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'path', type: dynamodb.AttributeType.STRING },
            billing: dynamodb.Billing.onDemand(),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        table.addGlobalSecondaryIndex({
            indexName: 'revalidate',
            partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'revalidatedAt', type: dynamodb.AttributeType.NUMBER },
        });
        const bucket = new s3.Bucket(this, 'Cache', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            lifecycleRules: [
                {
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                    transitions: [{ storageClass: s3.StorageClass.INTELLIGENT_TIERING, transitionAfter: cdk.Duration.days(30) }],
                },
            ],
            autoDeleteObjects: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const func = new function_1.NextFunction(this, 'Function', {
            appPath: props.appPath,
            name: 'revalidation-function',
            timeout: cdk.Duration.seconds(10),
        });
        func.function.addEventSource(new events.SqsEventSource(queue));
        bucket.grantWrite(func);
        const deploy = new deployment.BucketDeployment(this, 'CacheDeployment', {
            destinationBucket: bucket,
            sources: [deployment.Source.asset(path.resolve(props.appPath, '.open-next/cache'))],
        });
        func.node.addDependency(deploy);
        cdk.RemovalPolicies.of(deploy).destroy();
        new DynamoDBProvider(this, 'DynamoDBProvider', { appPath: props.appPath, table });
        this.queue = queue;
        this.cache = bucket;
        this.table = table;
        this.function = func;
    }
}
exports.NextRevalidation = NextRevalidation;
class DynamoDBProvider extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const handler = new function_1.NextFunction(this, 'Handler', {
            appPath: props.appPath,
            name: 'dynamodb-provider',
            timeout: cdk.Duration.minutes(1),
            environment: {
                CACHE_DYNAMO_TABLE: props.table.tableName,
            },
        });
        props.table.grantWriteData(handler);
        const dynamodbProvider = new cr.Provider(this, 'Provider', {
            onEventHandler: handler.function,
        });
        new cdk.CustomResource(this, 'Resource', {
            resourceType: 'Custom::OpenNextDynamoDBProvider',
            serviceToken: dynamodbProvider.serviceToken,
            properties: { hash: String(Date.now()) },
            serviceTimeout: cdk.Duration.minutes(1),
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
    }
}
//# sourceMappingURL=revalidation.js.map