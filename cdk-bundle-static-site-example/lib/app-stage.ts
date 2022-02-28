// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import { StaticSiteStack } from './static-site-stack';
import { Construct } from 'constructs';

export interface AppStageProps extends cdk.StageProps {
  apiUrl: string;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    new StaticSiteStack(this, 'StaticSite', {
      buildEnvironment: {
        API_URL: props.apiUrl,
      }
    });
  }
}

