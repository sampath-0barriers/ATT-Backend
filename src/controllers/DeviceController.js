const DeviceRepo = require('../services/DeviceService.js');

async function getDeviceConfigs(request, response) {
  try {
    response.json({name: await DeviceRepo.getDeviceConfigs()});
  } catch (err) {
    console.log(err);
    response.status(500);
  }
}

module.exports = {getDeviceConfigs};
