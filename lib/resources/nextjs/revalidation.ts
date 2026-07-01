import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { NextFunction } from './function';

interface NextRevalidationProps {
  readonly appPath: string;
}

interface DynamoDBProviderProps {
  readonly appPath: string;
  readonly table: dynamodb.ITable;
}

export class NextRevalidation extends Construct {
  readonly queue: sqs.Queue;
  readonly cache: s3.Bucket;
  readonly table: dynamodb.TableV2;
  readonly function: NextFunction;

  constructor(scope: Construct, id: string, props: NextRevalidationProps) {
    super(scope, id);

    const queue = new sqs.Queue(this, 'Queue', {
      fifo: true,
    });

    const table = new dynamodb.TableV2(this, 'TableV2', {
      partitionKey: { name: 'tag', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'path', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'revalidate',
      partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'revalidatedAt', type: dynamodb.AttributeType.NUMBER },
    });

    const bucket = new s3.Bucket(this, 'Cache', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          transitions: [{ storageClass: s3.StorageClass.INTELLIGENT_TIERING, transitionAfter: cdk.Duration.days(30) }],
        },
      ],
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const func = new NextFunction(this, 'Function', {
      appPath: props.appPath,
      name: 'revalidation-function',
      timeout: cdk.Duration.seconds(10),
    });
    func.function.addEventSource(new events.SqsEventSource(queue));
    bucket.grantWrite(func);

    const deploy = new deployment.BucketDeployment(this, 'CacheDeployment', {
      destinationBucket: bucket,
      sources: [deployment.Source.asset(path.resolve(props.appPath, '.open-next/cache'))],
    });
    func.node.addDependency(deploy);
    cdk.RemovalPolicies.of(deploy).destroy();

    new DynamoDBProvider(this, 'DynamoDBProvider', { appPath: props.appPath, table });

    this.queue = queue;
    this.cache = bucket;
    this.table = table;
    this.function = func;
  }
}

class DynamoDBProvider extends Construct {
  constructor(scope: Construct, id: string, props: DynamoDBProviderProps) {
    super(scope, id);

    const handler = new NextFunction(this, 'Handler', {
      appPath: props.appPath,
      name: 'dynamodb-provider',
      timeout: cdk.Duration.minutes(1),
      environment: {
        CACHE_DYNAMO_TABLE: props.table.tableName,
      },
    });
    props.table.grantWriteData(handler);
    const dynamodbProvider = new cr.Provider(this, 'Provider', {
      onEventHandler: handler.function,
    });
    new cdk.CustomResource(this, 'Resource', {
      resourceType: 'Custom::OpenNextDynamoDBProvider',
      serviceToken: dynamodbProvider.serviceToken,
      properties: { hash: String(Date.now()) },
      serviceTimeout: cdk.Duration.minutes(1),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
