import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NextFunction } from './function';
import type { NextRevalidation } from './revalidation';

interface NextServerProps {
  readonly appPath: string;
  readonly appPolicyArn?: string;
  readonly revalidation: NextRevalidation;
  readonly timeout?: cdk.Duration;
}

export class NextServer extends Construct {
  readonly function: lambda.Function;
  readonly functionUrl: lambda.FunctionUrl;
  readonly timeout: cdk.Duration;

  constructor(scope: Construct, id: string, props: NextServerProps) {
    super(scope, id);

    const timeout = props.timeout ?? cdk.Duration.seconds(30);
    const func = new NextFunction(this, 'Function', {
      appPath: props.appPath,
      name: 'server-functions/default',
      memorySize: 512,
      timeout,
      environment: {
        CACHE_BUCKET_NAME: props.revalidation.cache.bucketName,
        CACHE_BUCKET_REGION: props.revalidation.cache.env.region,
        REVALIDATION_QUEUE_URL: props.revalidation.queue.queueUrl,
        REVALIDATION_QUEUE_REGION: props.revalidation.queue.env.region,
        CACHE_DYNAMO_TABLE: props.revalidation.table.tableName,
      },
    });
    if (props.appPolicyArn) {
      const appPolicy = iam.ManagedPolicy.fromManagedPolicyArn(this, 'AppPolicy', props.appPolicyArn);
      func.function.role!.addManagedPolicy(appPolicy);
    }
    props.revalidation.cache.grantRead(func);
    props.revalidation.cache.grantWrite(func, '*', ['s3:PutObject']);
    props.revalidation.queue.grantSendMessages(func);
    props.revalidation.table.grantReadData(func);
    func.node.addDependency(props.revalidation.function);

    this.function = func.function;
    this.functionUrl = func.function.addFunctionUrl();
    this.timeout = timeout;
  }
}
