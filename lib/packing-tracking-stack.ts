import * as cdk from '@aws-cdk/core';
import rds = require('@aws-cdk/aws-rds')
import ec2 = require('@aws-cdk/aws-ec2')

export class PackingTrackingStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'PackingTrackingVPC', {
      cidr: '10.0.0.0/16',
    })

    // The code that defines your stack goes here
    const dbInstance = new rds.DatabaseInstance(this, 'PackingTrackingInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      // optional, defaults to m5.large
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret('hasuraConfigSecret'), // Optional - will default to 'admin' username and generated password
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      },
      deletionProtection: false,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
  }
}
