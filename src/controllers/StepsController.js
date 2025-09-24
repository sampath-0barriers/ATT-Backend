const ScansSteps = require('../services/ScansSteps');

async function getSteps(request, response) {
  try {
    response.json({steps: await ScansSteps.getSteps()});
  } catch (err) {
    console.log(err);
    response.status(500);
  }
}

module.exports = {getSteps};
