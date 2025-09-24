const { client } = require('../dao/database');

const db = client.db();

async function getGuidanceLevels() {
  const collection = db.collection('guidance_levels');
  return collection.find().toArray();
}

module.exports = { getGuidanceLevels };
