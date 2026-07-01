import * as cdk from 'aws-cdk-lib';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { NextFunction } from './function';

interface NextImageOptimizationProps {
  readonly appPath: string;
  readonly asset: s3.IBucket;
}

export class NextImageOptimization extends Construct {
  readonly function: lambda.Function;
  readonly functionUrl: lambda.FunctionUrl;
  readonly timeout: cdk.Duration;

  constructor(scope: Construct, id: string, props: NextImageOptimizationProps) {
    super(scope, id);

    const timeout = cdk.Duration.seconds(30);
    const func = new NextFunction(this, 'Function', {
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
