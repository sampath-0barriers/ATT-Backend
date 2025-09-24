const { client } = require('../dao/database');

const db = client.db();

async function getDeviceConfigByName(deviceName) {

  try {
    const collection = db.collection('device_configs');

    return await collection.findOne({ name: deviceName });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getDeviceConfigs() {
  const collection = db.collection('device_configs');

  return collection.find().toArray();
}

module.exports = { getDeviceConfigByName, getDeviceConfigs };
