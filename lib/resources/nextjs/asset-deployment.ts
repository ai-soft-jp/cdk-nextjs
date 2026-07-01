import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import * as deployment from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

interface NextAssetDeploymentProps {
  readonly appPath: string;
  readonly bucket: s3.IBucket;
}

export class NextAssetDeployment extends Construct {
  constructor(scope: Construct, id: string, props: NextAssetDeploymentProps) {
    super(scope, id);

    cdk.RemovalPolicies.of(this).destroy({ applyToResourceTypes: ['AWS::Logs::LogGroup'] });

    const assets = deployment.Source.asset(path.resolve(props.appPath, '.open-next/assets'), {
      followSymlinks: cdk.SymlinkFollowMode.ALWAYS,
    });

    new deployment.BucketDeployment(this, 'Next', {
      destinationBucket: props.bucket,
      sources: [assets],
      exclude: ['*'],
      include: ['_next/*'],
      cacheControl: [
        deployment.CacheControl.setPublic(),
        deployment.CacheControl.maxAge(cdk.Duration.days(365)),
        deployment.CacheControl.immutable(),
      ],
      prune: false,
    });

    new deployment.BucketDeployment(this, 'Static', {
      destinationBucket: props.bucket,
      sources: [assets],
      exclude: ['*'],
      include: ['_static/*'],
      cacheControl: [
        deployment.CacheControl.setPublic(),
        deployment.CacheControl.maxAge(cdk.Duration.days(7)),
        deployment.CacheControl.staleWhileRevalidate(cdk.Duration.days(7)),
      ],
      prune: false,
    });

    new deployment.BucketDeployment(this, 'Public', {
      destinationBucket: props.bucket,
      sources: [assets],
      exclude: ['_next/*', '_static/*'],
      cacheControl: [
        deployment.CacheControl.setPublic(),
        deployment.CacheControl.maxAge(cdk.Duration.hours(1)),
        deployment.CacheControl.sMaxAge(cdk.Duration.days(365)),
        deployment.CacheControl.mustRevalidate(),
      ],
      prune: false,
    });
  }
}
