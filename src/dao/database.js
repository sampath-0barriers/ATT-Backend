const { MongoClient } = require('mongodb');
require("dotenv").config();

const conn_string = process.env.MONGODB_URI;
const client = new MongoClient(conn_string);

client.connect()
  .then(() => {
    const db = client.db();
    console.log("Database has been connected:", db.databaseName);
  }).catch((err) => {
    console.log("Failed to connect to Database:", err.message);
  });

module.exports = {
  client
};
