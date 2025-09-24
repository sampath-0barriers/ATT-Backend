const GuidanceService = require('../services/GuidanceService');

async function getGuidanceLevels(request, response) {
  try {
    response.json({
      guidance_levels: await GuidanceService.getGuidanceLevels(),
    });
  } catch (err) {
    console.log(err);
    response.status(500);
  }
}

module.exports = {getGuidanceLevels};
