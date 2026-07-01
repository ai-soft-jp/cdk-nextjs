import * as cdk from 'aws-cdk-lib';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import type { NextRevalidation } from './revalidation';
interface NextServerProps {
    readonly appPath: string;
    readonly appPolicyArn?: string;
    readonly revalidation: NextRevalidation;
    readonly timeout?: cdk.Duration;
}
export declare class NextServer extends Construct {
    readonly function: lambda.Function;
    readonly functionUrl: lambda.FunctionUrl;
    readonly timeout: cdk.Duration;
    constructor(scope: Construct, id: string, props: NextServerProps);
}
export {};
