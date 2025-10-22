var express = require("express");
var router = express.Router();
const insightsClient = require("../appInsightsClient");

// GET home page
router.get("/", (req, res, next) => {
  // Check if the user is logged in (i.e., if there's a token in the session)
  if (req.session.token) {
    // If the user is already logged in, redirect them to the success page
    res.redirect("/success"); // Automatically redirect to the success page after login
  } else {
    if (insightsClient) {
      insightsClient.trackEvent({
        name: "LandingPageVisited",
        properties: {
          page: req.originalUrl,
          referrer: req.get("Referrer") || "direct",
          userAgent: req.get("User-Agent"),
        },
      });
    }
    res.render("index", {
      title: "Access Package Builder",
      description:
        "Quickly analyze Microsoft Entra ID users / groups with Access Package Builder – the simplest way to start with identity governance.",
      canonical: "https://accesspackagebuilder.dev/",
    }); 
  }
});

module.exports = router;
