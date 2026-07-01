import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cr from 'aws-cdk-lib/custom-resources';
import type { IDependable } from 'constructs';
import { Construct } from 'constructs';

interface NextAssetCleanupProps {
  readonly wait: cdk.Duration;
  readonly expires: cdk.Duration;
  readonly distribution: cloudfront.IDistribution;
  readonly bucket: s3.IBucket;
}

export class NextAssetCleanup extends Construct {
  readonly resource: Construct;

  constructor(scope: Construct, id: string, props: NextAssetCleanupProps) {
    super(scope, id);

    cdk.RemovalPolicies.of(this).destroy({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });

    const invalidateTask = tasks.CallAwsService.jsonata(this, 'InvalidateCache', {
      service: 'CloudFront',
      action: 'createInvalidation',
      parameters: {
        DistributionId: props.distribution.distributionId,
        InvalidationBatch: {
          Paths: { Items: ['/*'], Quantity: 1 },
          CallerReference: '{% $states.context.Execution.Name %}',
        },
      },
      iamResources: [props.distribution.distributionArn],
    });

    const waitTask = sfn.Wait.jsonata(this, 'Wait', { time: sfn.WaitTime.duration(props.wait) });

    const cleanupFunc = new lambda.Function(this, 'CleanupFunc', {
      description: `[${cdk.Stack.of(this).stackName}] cleanup asset files`,
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions/asset-cleanup')),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(5),
    });
    props.bucket.grantRead(cleanupFunc);
    props.bucket.grantDelete(cleanupFunc);
    const cleanupTask = tasks.LambdaInvoke.jsonata(this, 'Cleanup', {
      lambdaFunction: cleanupFunc,
      payload: sfn.TaskInput.fromObject({
        threshold: '{% $states.context.Execution.Input.threshold %}',
        bucketName: props.bucket.bucketName,
      }),
    });

    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      comment: `[${cdk.Stack.of(this).stackName}] invalidate and cleanup after ${props.wait}`,
      definitionBody: sfn.DefinitionBody.fromChainable(invalidateTask.next(waitTask).next(cleanupTask)),
    });

    const starterFunc = new lambda.Function(this, 'StarterFunc', {
      description: `[${cdk.Stack.of(this).stackName}] invoke cleanup state machine ${stateMachine.stateMachineName}`,
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions/start-asset-cleanup')),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
        EXPIRES: String(props.expires.toMilliseconds()),
      } satisfies import('./functions/start-asset-cleanup').Env,
      timeout: cdk.Duration.seconds(10),
    });
    stateMachine.grant(starterFunc, 'states:ListExecutions', 'states:StartExecution');
    stateMachine.grantExecution(starterFunc, 'states:StopExecution');

    const provider = new cr.Provider(this, 'StarterProvider', {
      onEventHandler: starterFunc,
    });
    this.resource = new cdk.CustomResource(this, 'Starter', {
      resourceType: 'Custom::NextAssetCleanup',
      serviceToken: provider.serviceToken,
      properties: { timestamp: Date.now() },
      serviceTimeout: cdk.Duration.minutes(1),
    });
  }

  addDependency(...deps: IDependable[]) {
    this.resource.node.addDependency(...deps);
  }
}
