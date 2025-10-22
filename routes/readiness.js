var express = require("express");
var router = express.Router();
const insightsClient = require("../appInsightsClient");

// GET home page
router.get("/", (req, res, next) => {
  if (req.session.token) {
    res.redirect("/success");
  } else {
    if (insightsClient) {
      insightsClient.trackEvent({
        name: "ReadinessPageVisited",
        properties: {
          page: req.originalUrl,
          referrer: req.get("Referrer") || "direct",
          userAgent: req.get("User-Agent"),
        },
      });
    }
    res.render("readiness", {
      title: "Access Package Builder - Readiness Check",
      description:
        "Check your environment's readiness for Access Package automation in Microsoft Entra ID.",
      canonical: "https://accesspackagebuilder.dev/readiness",
    });
  }
});

module.exports = router;
