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
exports.NextImageOptimization = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const function_1 = require("./function");
class NextImageOptimization extends constructs_1.Construct {
    function;
    functionUrl;
    timeout;
    constructor(scope, id, props) {
        super(scope, id);
        const timeout = cdk.Duration.seconds(30);
        const func = new function_1.NextFunction(this, 'Function', {
            appPath: props.appPath,
            name: 'image-optimization-function',
            memorySize: 512,
            timeout,
            environment: {
                BUCKET_NAME: props.asset.bucketName,
            },
        });
        props.asset.grantRead(func);
        this.function = func.function;
        this.functionUrl = func.function.addFunctionUrl();
        this.timeout = timeout;
    }
}
exports.NextImageOptimization = NextImageOptimization;
//# sourceMappingURL=image-optimization.js.map