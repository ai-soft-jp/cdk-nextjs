import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import type * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface NextFunctionProps extends Omit<lambda.FunctionProps, 'architecture' | 'runtime' | 'code' | 'handler'> {
  readonly appPath: string;
  readonly name: string;
}

export class NextFunction extends Construct implements iam.IGrantable {
  readonly function: lambda.Function;
  readonly grantPrincipal: iam.IPrincipal;

  constructor(scope: Construct, id: string, { appPath, name, ...props }: NextFunctionProps) {
    super(scope, id);

    const source = path.resolve(appPath, '.open-next', name);

    // bundles zipfile with symlink support (-y option)
    const zipName = `NextFunction-${cdk.Names.uniqueResourceName(this, {})}.zip`;
    const zipPath = path.resolve(cdk.Stage.of(scope)!.assetOutdir, zipName);
    this.function = new lambda.Function(this, 'Default', {
      ...props,
      description: `[${cdk.Stack.of(scope).stackName}] open-next ${name} handler`,
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_24_X,
      code: lambda.Code.fromCustomCommand(zipPath, ['zip', '-ry', zipPath, '.'], {
        commandOptions: { cwd: source },
      }),
      handler: 'index.handler',
      loggingFormat: lambda.LoggingFormat.TEXT,
    });

    this.grantPrincipal = this.function.grantPrincipal;
  }
}
