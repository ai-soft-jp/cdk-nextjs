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
exports.NextFunction = void 0;
const path = __importStar(require("node:path"));
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const constructs_1 = require("constructs");
class NextFunction extends constructs_1.Construct {
    function;
    grantPrincipal;
    constructor(scope, id, { appPath, name, ...props }) {
        super(scope, id);
        const source = path.resolve(appPath, '.open-next', name);
        // bundles zipfile with symlink support (-y option)
        const zipName = `NextFunction-${cdk.Names.uniqueResourceName(this, {})}.zip`;
        const zipPath = path.resolve(cdk.Stage.of(scope).assetOutdir, zipName);
        this.function = new lambda.Function(this, 'Default', {
            ...props,
            description: `[${cdk.Stack.of(scope).stackName}] open-next ${name} handler`,
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_24_X,
            code: lambda.Code.fromCustomCommand(zipPath, ['zip', '-ry', zipPath, '.'], {
                commandOptions: { cwd: source },
            }),
            handler: 'index.handler',
            loggingFormat: lambda.LoggingFormat.TEXT,
        });
        this.grantPrincipal = this.function.grantPrincipal;
    }
}
exports.NextFunction = NextFunction;
//# sourceMappingURL=function.js.map