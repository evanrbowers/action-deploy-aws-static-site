import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import { StaticPageStack } from "./static-page-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  const stack = new StaticPageStack(app, "MyTestStack", {
    fullDomain: "sub.example.com",
    folder: "./images",
    stackName: "MyTestStack",
    subdomain: undefined,
    domain: undefined,
    behaviorArn: undefined,
  });
  expectCDK(stack).to(haveResource("AWS::S3::Bucket"));
});
