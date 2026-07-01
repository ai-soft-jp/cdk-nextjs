import type * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
interface NextAssetDeploymentProps {
    readonly appPath: string;
    readonly bucket: s3.IBucket;
}
export declare class NextAssetDeployment extends Construct {
    constructor(scope: Construct, id: string, props: NextAssetDeploymentProps);
}
export {};
