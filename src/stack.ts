import * as cdk from "@aws-cdk/core";
import { StaticPageStack } from "./static-page-stack";

const app = new cdk.App();
const { DOMAIN, FOLDER, ROOTDOMAIN, SUBDOMAIN, BEHAVIORARN } = process.env;
let fullDomain = DOMAIN;
if (SUBDOMAIN !== undefined && ROOTDOMAIN !== undefined) {
  fullDomain = SUBDOMAIN + ROOTDOMAIN;
}
if (fullDomain === undefined) {
  throw new Error("domain has not been defined");
}
if (FOLDER === undefined) {
  throw new Error("publish_dir has not been defined");
}

new StaticPageStack(app, `StaticPage`, {
  stackName: `StaticPage-${DOMAIN}`.split(".").join("-"),
  folder: FOLDER,
  fullDomain,
  domain: ROOTDOMAIN,
  subdomain: SUBDOMAIN,
  behaviorArn: BEHAVIORARN,
});
