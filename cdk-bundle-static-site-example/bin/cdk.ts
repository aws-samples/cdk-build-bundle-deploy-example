#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';
import { AppStage } from '../lib/app-stage';

const app = new cdk.App();

const delivery = new PipelineStack(app, 'Frontend-DeliveryPipeline', {
  name: 'Frontend',
  env: {
    account: 'REPLACE_WITH_PIPELINE_ACCOUNT',
    region: 'REPLACE_WITH_PIPELINE_REGION'
  }
});

delivery.pipeline.addApplicationStage(
  new AppStage(app, 'App', {
    apiUrl: 'REPLACE_WITH_API_URL', // this should be the HTTP API url from the cdk-bundle-go-lambda-example app
    env: {
      account: 'REPLACE_WITH_APP_ACCOUNT',
      region: 'us-east-1',
    },
  })
);
