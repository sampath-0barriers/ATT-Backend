const DeviceRepo = require('../repository/DeviceConfigRepo');

async function getDeviceConfigs() {
  const results = await DeviceRepo.getDeviceConfigs();
   console.log("Raw Device levels:", results);
  const sanitized = results.map((doc) => doc.name);
  console.log("lgiyugig",sanitized);
  return sanitized;
}

module.exports = {getDeviceConfigs};
