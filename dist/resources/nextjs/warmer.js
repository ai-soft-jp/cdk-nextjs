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
exports.NextWarmer = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const scheduler = __importStar(require("aws-cdk-lib/aws-scheduler"));
const targets = __importStar(require("aws-cdk-lib/aws-scheduler-targets"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
const function_1 = require("./function");
class NextWarmer extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const func = new function_1.NextFunction(this, 'Function', {
            appPath: props.appPath,
            name: 'warmer-function',
            environment: {
                FUNCTION_NAME: props.server.function.functionName,
                CONCURRENCY: `${props.concurrency}`,
            },
            timeout: cdk.Duration.seconds(15),
            retryAttempts: 0,
        });
        props.server.function.grantInvoke(func);
        new scheduler.Schedule(this, 'Cron', {
            description: `[${cdk.Stack.of(this).stackName}] invoke warmer every 5 minutes`,
            schedule: scheduler.ScheduleExpression.rate(cdk.Duration.minutes(5)),
            target: new targets.LambdaInvoke(func.function, { retryAttempts: 0 }),
        });
        new cr.AwsCustomResource(this, 'Prewarm', {
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({ actions: ['lambda:InvokeFunction'], resources: [func.function.functionArn] }),
            ]),
            onUpdate: {
                service: 'lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: func.function.functionName,
                    InvocationType: 'Event',
                    Payload: JSON.stringify({ now: Date.now() }),
                },
                physicalResourceId: cr.PhysicalResourceId.of(func.function.functionName),
            },
            serviceTimeout: cdk.Duration.minutes(5),
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
    }
}
exports.NextWarmer = NextWarmer;
//# sourceMappingURL=warmer.js.map