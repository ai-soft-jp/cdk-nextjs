import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { NextjsBaseProps, NextjsOptions } from './resources/nextjs';
export interface NextServerStackProps extends cdk.StackProps, NextjsBaseProps, NextjsOptions {
    /**
     * The ID of the Route53 hosted zone.
     * @default - No distribution records are created.
     */
    readonly hostedZoneId?: string;
    /**
     * Whether to create MX record and TXT record.
     * @default true
     */
    readonly mxRecords?: false;
}
export declare class NextServerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: NextServerStackProps);
}
