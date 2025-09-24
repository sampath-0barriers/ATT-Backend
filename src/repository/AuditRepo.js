const { client } = require('../dao/database');

const db = client.db();

// Define a constant for the MongoDB collection name to be used.
const COLLECTION_NAME = 'audit_data';


const audit_data = {
  _id: "660b74b044ca08fa7fc6330c",
  client: "Foundation",
  contact_name: "Santosh",
  contact_email: "skumar@0barriers.org",
  company_address: "8 Trent Avenue",
  auditor: "Auditor Name"
};

// Async function to create a new audit data in the database.
async function create(data) {
  // Connect to the database.
  // Access the specified collection within the database.
  const collection = db.collection(COLLECTION_NAME);
  // Insert the new rule document into the collection.
  const result = await collection.insertOne(data);
  // Return the ID of the inserted document.
  return result.insertedId;
}

// Async function to retrieve a specific audit data from the database by its ID.
async function get(id) {
  // Connect to the database.
  // Access the specified collection within the database.
  // const result_collection = db.collection(COLLECTION_NAME);

  // Find one document in the collection that matches the specified id.
  // return await result_collection.findOne({
  //   _id: new ObjectId(id),
  // });
  // for now return the hardcoded data
  return audit_data;
}

// Export the functions to be used in other parts of the application.
module.exports = {
  get,
  create
};
