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
exports.NextServerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const nextjs_1 = require("./resources/nextjs");
class NextServerStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        cdk.RemovalPolicies.of(this).retainOnUpdateOrDelete({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });
        const nextjs = new nextjs_1.Nextjs(this, 'Nextjs', {
            appPath: props.appPath,
            staticPaths: props.staticPaths,
            certificateArn: props.certificateArn,
            appPolicyArn: props.appPolicyArn,
            domainName: props.domainName,
            concurrency: props.concurrency,
            cacheHeaders: props.cacheHeaders,
            cacheCookies: props.cacheCookies,
            xRobotsTag: props.xRobotsTag,
            hstsPreload: props.hstsPreload,
            contentSecurityPolicy: props.contentSecurityPolicy,
        });
        if (props.hostedZoneId) {
            const zone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', props.hostedZoneId);
            const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(nextjs.distribution));
            const recordName = props.domainName;
            for (const type of ['ARecord', 'AaaaRecord', 'HttpsRecord']) {
                new route53[type](this, type, { zone, recordName, target });
            }
            if (props.mxRecords ?? true) {
                new route53.MxRecord(this, 'MxRecord', { zone, recordName, values: [{ priority: 0, hostName: '.' }] });
                new route53.TxtRecord(this, 'SpfRecord', { zone, recordName, values: ['v=spf1 -all'] });
            }
        }
    }
}
exports.NextServerStack = NextServerStack;
//# sourceMappingURL=next-server-stack.js.map