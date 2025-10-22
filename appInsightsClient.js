// appInsightsClient.js
const appInsights = require("applicationinsights");

let insightsClient = null;

if (
  process.env.NODE_ENV === "production" &&
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
) {
  appInsights
    .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .start();

  insightsClient = appInsights.defaultClient;
  console.log("✅ Application Insights initialized in production mode");
} else {
  console.log(
    "⚠️ Application Insights disabled (not in production or missing connection string)"
  );
}

module.exports = insightsClient;
