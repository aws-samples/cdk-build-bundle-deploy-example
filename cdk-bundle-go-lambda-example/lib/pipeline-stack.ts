// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs';

export interface PipelineStackProps extends cdk.StackProps {
  name: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    this.pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      synth: new pipelines.ShellStep('synth', {
        input: pipelines.CodePipelineSource.connection('REPLACE_WITH_OWNER/cdk-bundle-go-lambda-example', 'main', {
          connectionArn: 'REPLACE_WITH_CONNECTION_ARN',
        }),
        commands: [
          'npm ci',
          'npx cdk synth',
        ],
      }),
      crossAccountKeys: true,
      dockerEnabledForSynth: true,
    });
  }
}
