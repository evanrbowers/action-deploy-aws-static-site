import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

import {
  getDNSZone,
  getCertificate,
  setDNSRecord,
  getSubdomain,
  getDomain,
} from "./utils";

const env = {
  // Stack must be in us-east-1, because the ACM certificate for a
  // global CloudFront distribution must be requested in us-east-1.
  region: "us-east-1",
  account: process.env.CDK_DEFAULT_ACCOUNT ?? "mock",
};

export class StaticPageStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    {
      stackName,
      folder,
      fullDomain,
      domain,
      subdomain,
      behaviorArn,
    }: {
      stackName: string;
      folder: string;
      fullDomain: string;
      domain: string | undefined;
      subdomain: string | undefined;
      behaviorArn: string | undefined;
    }
  ) {
    super(scope, id, { stackName, env });

    if (!subdomain) {
      subdomain = getSubdomain(fullDomain);
    }

    if (!domain) {
      domain = getDomain(fullDomain);
    }

    const zone = getDNSZone(this, domain);
    const certificate = getCertificate(this, fullDomain, zone);

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket");

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OAI",
      {
        comment: "Policy for Cloudfront CDN",
      }
    );
    websiteBucket.grantRead(originAccessIdentity);

    let behavior: cloudfront.Behavior = { isDefaultBehavior: true };

    if (behaviorArn) {
      //Create Cloudfront Distribution with Lambda function to handle directing to .html
      const lambdaVersion = lambda.Version.fromVersionArn(
        this,
        "LambdaRedirects",
        behaviorArn
      );
      behavior = {
        isDefaultBehavior: true,
        compress: true,
        minTtl: cdk.Duration.seconds(1),
        maxTtl: cdk.Duration.seconds(31536000),
        defaultTtl: cdk.Duration.seconds(86400),
        lambdaFunctionAssociations: [
          {
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            lambdaFunction: lambdaVersion,
          },
        ],
      };
    }

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: websiteBucket,
              originAccessIdentity,
            },
            behaviors: [behavior],
          },
        ],
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        viewerCertificate: certificate,
        comment: `CDN for static page on ${fullDomain}`,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      }
    );

    setDNSRecord(this, subdomain, zone, distribution);

    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset(folder)],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ["/*"],
    });
  }
}
