const { client } = require('../dao/database');

const db = client.db();

async function getSteps() {
  const collection = db.collection('steps');
  return collection.find().toArray();
}

module.exports = { getSteps };
