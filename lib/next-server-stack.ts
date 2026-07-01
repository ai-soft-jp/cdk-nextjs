import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import type { Construct } from 'constructs';
import type { NextjsBaseProps, NextjsOptions } from './resources/nextjs';
import { Nextjs } from './resources/nextjs';

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

export class NextServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextServerStackProps) {
    super(scope, id, props);

    cdk.RemovalPolicies.of(this).retainOnUpdateOrDelete({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });

    const nextjs = new Nextjs(this, 'Nextjs', {
      appPath: props.appPath,
      staticPaths: props.staticPaths,
      certificateArn: props.certificateArn,
      appPolicyArn: props.appPolicyArn,
      domainName: props.domainName,
      concurrency: props.concurrency,
      cacheHeaders: props.cacheHeaders,
      cacheCookies: props.cacheCookies,
      xRobotsTag: props.xRobotsTag,
      hstsPreload: props.hstsPreload,
      contentSecurityPolicy: props.contentSecurityPolicy,
    });

    if (props.hostedZoneId) {
      const zone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', props.hostedZoneId);
      const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(nextjs.distribution));
      const recordName = props.domainName;
      for (const type of ['ARecord', 'AaaaRecord', 'HttpsRecord'] as const) {
        new route53[type](this, type, { zone, recordName, target });
      }
      if (props.mxRecords ?? true) {
        new route53.MxRecord(this, 'MxRecord', { zone, recordName, values: [{ priority: 0, hostName: '.' }] });
        new route53.TxtRecord(this, 'SpfRecord', { zone, recordName, values: ['v=spf1 -all'] });
      }
    }
  }
}
