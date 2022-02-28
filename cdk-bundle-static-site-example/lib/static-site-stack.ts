// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs-extra';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import { spawnSync, SpawnSyncOptions } from 'child_process';


export interface StaticSiteStackProps extends cdk.StackProps {
  buildEnvironment?: { [key: string]: string };
}

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StaticSiteStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'HostingStorage', {
      bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrlOutput', { value: distribution.distributionDomainName });

    const entry = path.join(__dirname, '../frontend'); // path to the Nuxt.js app
    new s3_deployment.BucketDeployment(this, 'Deployment', {
      sources: [
        s3_deployment.Source.asset(entry, {
          bundling: {
            // try to bundle on the local machine
            local: {
              tryBundle(outputDir: string) {
                // make sure we have all the required
                // dependencies to build the site locally.
                // In this case we just check to make sure
                // we have yarn installed
                try {
                  exec('yarn --version', {
                    stdio: [ // show output
                      'ignore', //ignore stdio
                      process.stderr, // redirect stdout to stderr
                      'inherit' // inherit stderr
                    ],
                  });
                } catch {
                  // if we don't have yarn installed return false
                  // which tells the CDK to try Docker bundling
                  return false
                }

                try {
                  exec(
                    [
                      'yarn install',
                      'yarn generate'
                    ].join(' && '),
                    {
                      env: { ...process.env, ...props?.buildEnvironment ?? {} }, // environment variables to use when running the build command
                      stdio: [ // show output
                        'ignore', //ignore stdio
                        process.stderr, // redirect stdout to stderr
                        'inherit' // inherit stderr
                      ],
                      cwd: entry // where to run the build command from, i.e. the directory where our nuxt.js app is located
                    }
                  )

                } catch {
                  return false
                }

                try {
                  // copy the dist directory that is created with 'yarn generate'
                  // to the cdk outDir
                  fs.copySync(path.join(entry, 'dist'), outputDir);
                } catch {
                  return false
                }

                return true
              },
            },
            image: cdk.DockerImage.fromRegistry('node:lts'),
            command: [
              'bash', '-c', [
                'cd /asset-input',
                'yarn install',
                'yarn generate',
                'cp -r /asset-input/dist/* /asset-output/',
              ].join(' && ')
            ],
            environment: props?.buildEnvironment
          }
        })
      ],
      destinationBucket: bucket,
      distribution,
      memoryLimit: 256,
    });
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
    throw new Error(`exited with status ${proc.status}`);
  }

  return proc;
}
