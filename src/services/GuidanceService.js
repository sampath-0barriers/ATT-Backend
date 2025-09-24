const GuidanceRepo = require('../repository/GuidanceRepo');

async function getGuidanceLevels() {
  const results = await GuidanceRepo.getGuidanceLevels();
  console.log("Raw guidance levels:", results);
  return results.map((doc) => doc.level);
}

module.exports = {getGuidanceLevels};
