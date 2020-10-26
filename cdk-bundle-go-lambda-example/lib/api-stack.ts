// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';
import * as path from 'path';
import { spawnSync, SpawnSyncOptions } from 'child_process';

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entry = path.join(__dirname, '../functions/hello');
    const environment = {
      CGO_ENABLED: '0',
      GOOS: 'linux',
      GOARCH: 'amd64',
    };

    const handler = new lambda.Function(this, 'GolangFunction', {
      code: lambda.Code.fromAsset(entry, {
        bundling: {
          // try to bundle on the local machine
          local: {
            tryBundle(outputDir: string) {

              // make sure that we have all the required
              // dependencies to build the executable locally.
              // In this case we just check to make sure we have
              // go installed
              try {
                exec('go version', {
                  stdio: [ // show output
                    'ignore', //ignore stdio
                    process.stderr, // redirect stdout to stderr
                    'inherit' // inherit stderr
                  ],
                });
              } catch {
                // if we don't have go installed return false which
                // tells the CDK to try Docker bundling
                return false
              }

              exec(
                [
                  'go test -v', // run tests first
                  `go build -mod=vendor -o ${path.join(outputDir, 'bootstrap')}`
                ].join(' && '),
                {
                  env: { ...process.env, ...environment }, // environment variables to use when running the build command
                  stdio: [ // show output
                    'ignore', //ignore stdio
                    process.stderr, // redirect stdout to stderr
                    'inherit' // inherit stderr
                  ],
                  cwd: entry, // where to run the build command from
                },
              );
              return true
            },
          },
          image: lambda.Runtime.GO_1_X.bundlingDockerImage, // lambci/lambda:build-go1.x
          command: [
            'bash', '-c', [
              'go test -v',
              'go build -mod=vendor -o /asset-output/bootstrap',
            ].join(' && ')
          ],
          environment: environment,
        },
      }),
      handler: 'bootstrap', // if we name our handler 'bootstrap' we can also use the 'provided' runtime
      runtime: lambda.Runtime.GO_1_X,
    });

    const api = new apigatewayv2.HttpApi(this, 'HelloApi', {
      createDefaultStage: true,
      corsPreflight: {
        allowMethods: [ apigatewayv2.HttpMethod.GET ],
        allowOrigins: ['*']
      }
    });

    api.addRoutes({
      path: '/hello',
      integration: new apigatewayv2.LambdaProxyIntegration({
        handler
      }),
      methods: [apigatewayv2.HttpMethod.GET]
    });

    new cdk.CfnOutput(this, 'ApiUrlOutput', { value: api.url! });
  }
}


function exec(command: string, options?: SpawnSyncOptions) {
  const proc = spawnSync('bash', ['-c', command], options);

  if (proc.error) {
    throw proc.error;
  }

  if (proc.status != 0) {
    if (proc.stdout || proc.stderr) {
      throw new Error(`[Status ${proc.status}] stdout: ${proc.stdout?.toString().trim()}\n\n\nstderr: ${proc.stderr?.toString().trim()}`);
    }
    throw new Error(`go exited with status ${proc.status}`);
  }

  return proc;
}
