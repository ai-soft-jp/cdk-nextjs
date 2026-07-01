import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as targets from 'aws-cdk-lib/aws-scheduler-targets';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { NextFunction } from './function';
import type { NextServer } from './server';

interface NextWarmerProps {
  readonly appPath: string;
  readonly server: NextServer;
  readonly concurrency: number;
}

export class NextWarmer extends Construct {
  constructor(scope: Construct, id: string, props: NextWarmerProps) {
    super(scope, id);

    const func = new NextFunction(this, 'Function', {
      appPath: props.appPath,
      name: 'warmer-function',
      environment: {
        FUNCTION_NAME: props.server.function.functionName,
        CONCURRENCY: `${props.concurrency}`,
      },
      timeout: cdk.Duration.seconds(15),
      retryAttempts: 0,
    });
    props.server.function.grantInvoke(func);

    new scheduler.Schedule(this, 'Cron', {
      description: `[${cdk.Stack.of(this).stackName}] invoke warmer every 5 minutes`,
      schedule: scheduler.ScheduleExpression.rate(cdk.Duration.minutes(5)),
      target: new targets.LambdaInvoke(func.function, { retryAttempts: 0 }),
    });

    new cr.AwsCustomResource(this, 'Prewarm', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({ actions: ['lambda:InvokeFunction'], resources: [func.function.functionArn] }),
      ]),
      onUpdate: {
        service: 'lambda',
        action: 'invoke',
        parameters: {
          FunctionName: func.function.functionName,
          InvocationType: 'Event',
          Payload: JSON.stringify({ now: Date.now() }),
        },
        physicalResourceId: cr.PhysicalResourceId.of(func.function.functionName),
      },
      serviceTimeout: cdk.Duration.minutes(5),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
