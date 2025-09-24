const { ObjectId } = require("mongodb");
const { client } = require("../dao/database");

const db = client.db();

const licensePlans = [
  {
    id: "nebula-001-30",
    name: "Nebula",
    description: "Moly Reporter Nebula License(Trial) - 30 days",
    images: ["https://picsum.photos/id/20/300"],
    price: 0, // usd
    duration: 30, // days
    restrictions: {
      maxUsers: 1,
      maxProjects: 1,
      maxScans: 20
    }
  },
  {
    id: "andromeda-002-180",
    name: "Andromeda",
    description: "Moly Reporter Andromeda License - 180 days",
    images: ["https://picsum.photos/id/53/300"],
    price: 100,
    duration: 180,
    restrictions: {
      maxUsers: 5,
      maxProjects: 5,
      maxScans: 500
    }
  },
  {
    id: "orion-003-365",
    name: "Orion",
    description: "Moly Reporter Orion License - 365 days",
    images: ["https://picsum.photos/id/184/200"],
    price: 200,
    duration: 365,
    restrictions: {
      maxUsers: 10,
      maxProjects: 10,
      maxScans: 1000
    }
  }
];

const COLLECTION_NAME = "licenses";

/**
 * Retrieves licenses with optional query and options.
 * @async
 * @function getBy
 * @param {Object} [query] - The filter criteria.
 * @param {Object} [options] - The options to apply to the query.
 * @returns {Promise<Array<Object>>} The list of licenses, optionally paginated.
 * @throws {Error} If an error occurs while fetching licenses.
 * @example
 * // Usage
 * const licenses = await LicenseRepo.getBy({ authorId: "user1" }, { limit: 10, skip:0, sort: "-createdAt" });
 *
 */

async function getBy(query = {}, options = {}) {
  console.log("Getting licenses with query, options:", JSON.stringify({ query, options }));

  try {
    const collection = db.collection(COLLECTION_NAME);
    const results = await collection.find(query, options).toArray();
    return results;
  } catch (error) {
    console.error("Error fetching licenses:", error);
    throw error;
  }
}


/**
 * Retrieves the total count of all licenses in the collection.
 *
 * This function counts all documents in the license collection to support pagination.
 *
 * @async
 * @function getTotalCount
 * @param {Object} [filter] - The filter criteria.
 * @param {Object} [options] - The count options.
 *
 * @returns {Promise<number>} The total number of licenses in the collection.
 *
 * @throws {Error} If an error occurs while counting documents.
 */

async function getTotalCount(filter, options) {
  console.log("Counting licenses with filter:", JSON.stringify(filter));

  try {
    const collection = db.collection(COLLECTION_NAME);
    return await collection.countDocuments(filter, options);
  } catch (error) {
    console.error("Error counting licenses:", error);
    throw error;
  }
}

/**
 * Get license by query
 * @param {Object} query - The query to retrieve the license.
 * @param {Object} [options] - The options to apply to the query.
 * @returns {Promise<Object>} The license document.
 * @throws {Error} If an error occurs while fetching the license.
 * @async
 * @function getBy
 * 
 */

async function getOneBy(query, options = {}) {
  console.log("Getting license by query, options:", JSON.stringify({ query, options }));
  const { sort } = options;
  try {
    const collection = db.collection(COLLECTION_NAME);
    return await collection.findOne(query, { sort });
  } catch (error) {
    console.error("Error fetching license by query:", error);
    return null;
  }
}

// save, update, delete

async function create(licenseData) {
  console.log("Creating license:", JSON.stringify(licenseData));
  try {
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.insertOne({
      ...licenseData,
      createdAt: new Date()
    });
    return result.insertedId;
  } catch (error) {
    console.error("Error creating license:", error);
    throw error;
  }
}

async function update(id, licenseData) {
  console.log(`Updating license with ID: ${id}`);
  try {
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.updateOne(
      { _id: id },
      { $set: { ...licenseData, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  } catch (error) {
    console.error("Error updating license:", error);
    throw error;
  }
}

async function remove(id) {
  console.log(`Deleting license with ID: ${id}`);
  try {
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: ObjectId(id) });
    return result.deletedCount;
  } catch (error) {
    console.error("Error deleting license:", error);
    throw error;
  }
}

async function deleteLicensesBy(query) {
  console.log(`Deleting licenses by query: ${JSON.stringify(query)}`);
  try {
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteMany(query);
    return result.deletedCount;
  } catch (error) {
    console.error("Error deleting license by query:", error);
    throw error;
  }
}

module.exports = {
  licensePlans,
  getBy,
  getOneBy,
  getTotalCount,
  create,
  update,
  remove,
  deleteLicensesBy
};
