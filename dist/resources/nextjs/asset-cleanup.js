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
exports.NextAssetCleanup = void 0;
const path = __importStar(require("node:path"));
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const sfn = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const tasks = __importStar(require("aws-cdk-lib/aws-stepfunctions-tasks"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class NextAssetCleanup extends constructs_1.Construct {
    resource;
    constructor(scope, id, props) {
        super(scope, id);
        cdk.RemovalPolicies.of(this).destroy({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });
        const invalidateTask = tasks.CallAwsService.jsonata(this, 'InvalidateCache', {
            service: 'CloudFront',
            action: 'createInvalidation',
            parameters: {
                DistributionId: props.distribution.distributionId,
                InvalidationBatch: {
                    Paths: { Items: ['/*'], Quantity: 1 },
                    CallerReference: '{% $states.context.Execution.Name %}',
                },
            },
            iamResources: [props.distribution.distributionArn],
        });
        const waitTask = sfn.Wait.jsonata(this, 'Wait', { time: sfn.WaitTime.duration(props.wait) });
        const cleanupFunc = new lambda.Function(this, 'CleanupFunc', {
            description: `[${cdk.Stack.of(this).stackName}] cleanup asset files`,
            code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions/asset-cleanup')),
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_24_X,
            architecture: lambda.Architecture.ARM_64,
            environment: { NODE_OPTIONS: '--enable-source-maps' },
            timeout: cdk.Duration.minutes(5),
        });
        props.bucket.grantRead(cleanupFunc);
        props.bucket.grantDelete(cleanupFunc);
        const cleanupTask = tasks.LambdaInvoke.jsonata(this, 'Cleanup', {
            lambdaFunction: cleanupFunc,
            payload: sfn.TaskInput.fromObject({
                threshold: '{% $states.context.Execution.Input.threshold %}',
                bucketName: props.bucket.bucketName,
            }),
        });
        const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
            comment: `[${cdk.Stack.of(this).stackName}] invalidate and cleanup after ${props.wait}`,
            definitionBody: sfn.DefinitionBody.fromChainable(invalidateTask.next(waitTask).next(cleanupTask)),
        });
        const starterFunc = new lambda.Function(this, 'StarterFunc', {
            description: `[${cdk.Stack.of(this).stackName}] invoke cleanup state machine ${stateMachine.stateMachineName}`,
            code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions/start-asset-cleanup')),
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_24_X,
            architecture: lambda.Architecture.ARM_64,
            environment: { NODE_OPTIONS: '--enable-source-maps' },
            timeout: cdk.Duration.seconds(10),
        });
        stateMachine.grant(starterFunc, 'states:ListExecutions', 'states:StartExecution');
        stateMachine.grantExecution(starterFunc, 'states:StopExecution');
        const provider = new cr.Provider(this, 'StarterProvider', {
            onEventHandler: starterFunc,
        });
        this.resource = new cdk.CustomResource(this, 'Starter', {
            resourceType: 'Custom::NextAssetCleanup',
            serviceToken: provider.serviceToken,
            properties: {
                Timestamp: Date.now(),
                StateMachineArn: stateMachine.stateMachineArn,
                Expires: props.expires.toMilliseconds(),
            },
            serviceTimeout: cdk.Duration.minutes(1),
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
    }
    addDependency(...deps) {
        this.resource.node.addDependency(...deps);
    }
}
exports.NextAssetCleanup = NextAssetCleanup;
//# sourceMappingURL=asset-cleanup.js.map