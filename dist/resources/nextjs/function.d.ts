import type * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
interface NextFunctionProps extends Omit<lambda.FunctionProps, 'architecture' | 'runtime' | 'code' | 'handler'> {
    readonly appPath: string;
    readonly name: string;
}
export declare class NextFunction extends Construct implements iam.IGrantable {
    readonly function: lambda.Function;
    readonly grantPrincipal: iam.IPrincipal;
    constructor(scope: Construct, id: string, { appPath, name, ...props }: NextFunctionProps);
}
export {};
