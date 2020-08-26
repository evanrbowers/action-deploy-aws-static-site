"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPageStack = void 0;
const cdk = __importStar(require("@aws-cdk/core"));
const s3 = __importStar(require("@aws-cdk/aws-s3"));
const lambda = __importStar(require("@aws-cdk/aws-lambda"));
const s3deploy = __importStar(require("@aws-cdk/aws-s3-deployment"));
const cloudfront = __importStar(require("@aws-cdk/aws-cloudfront"));
const utils_1 = require("./utils");
const env = {
    // Stack must be in us-east-1, because the ACM certificate for a
    // global CloudFront distribution must be requested in us-east-1.
    region: "us-east-1",
    account: (_a = process.env.CDK_DEFAULT_ACCOUNT) !== null && _a !== void 0 ? _a : "mock",
};
class StaticPageStack extends cdk.Stack {
    constructor(scope, id, { stackName, folder, fullDomain, domain, subdomain, behaviorArn, }) {
        super(scope, id, { stackName, env });
        if (!subdomain) {
            subdomain = utils_1.getSubdomain(fullDomain);
        }
        if (!domain) {
            domain = utils_1.getDomain(fullDomain);
        }
        const zone = utils_1.getDNSZone(this, domain);
        const certificate = utils_1.getCertificate(this, fullDomain, zone);
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket");
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "OAI", {
            comment: "Policy for Cloudfront CDN",
        });
        websiteBucket.grantRead(originAccessIdentity);
        let behavior = { isDefaultBehavior: true };
        if (behaviorArn) {
            //Create Cloudfront Distribution with Lambda function to handle directing to .html
            const lambdaVersion = lambda.Version.fromVersionArn(this, "LambdaRedirects", behaviorArn);
            behavior = {
                isDefaultBehavior: true,
                compress: true,
                minTtl: cdk.Duration.millis(1),
                maxTtl: cdk.Duration.millis(31536000),
                defaultTtl: cdk.Duration.millis(86400),
                lambdaFunctionAssociations: [
                    {
                        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                        lambdaFunction: lambdaVersion,
                    },
                ],
            };
        }
        const distribution = new cloudfront.CloudFrontWebDistribution(this, "Distribution", {
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
        });
        utils_1.setDNSRecord(this, subdomain, zone, distribution);
        new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
            sources: [s3deploy.Source.asset(folder)],
            destinationBucket: websiteBucket,
            distribution,
            distributionPaths: ["/*"],
        });
    }
}
exports.StaticPageStack = StaticPageStack;
