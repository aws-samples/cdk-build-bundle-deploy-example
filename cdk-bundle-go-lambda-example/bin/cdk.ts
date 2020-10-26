#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AppStage } from '../lib/app-stage';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

const delivery = new PipelineStack(app, 'Api-DeliveryPipeline', {
  name: 'Api',
  env: {
    account: 'REPLACE_WITH_PIPELINE_ACCOUNT',
    region: 'REPLACE_WITH_PIPELINE_REGION'
  }
});

delivery.pipeline.addApplicationStage(
  new AppStage(app, 'App', {
    env: {
      account: 'REPLACE_WITH_APP_ACCOUNT',
      region: 'REPLACE_WITH_APP_REGION',
    },
  })
);
