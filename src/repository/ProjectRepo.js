const { ObjectId } = require('mongodb');
const { client } = require('../dao/database');
const ScansRepo = require('./ScansRepo');

const db = client.db();

const COLLECTION_NAME = 'projects';

/**
 * Retrieves all projects with optional pagination.
 *
 * This function fetches a list of all projects, sorted by creation date in descending order.
 * If `limit` and `offset` are provided, it applies pagination.
 *
 * @async
 * @function getAll
 *
 * @param {number} [limit] - The maximum number of projects to retrieve.
 * @param {number} [offset] - The number of projects to skip for pagination.
 *
 * @returns {Promise<Array<Object>>} The list of projects, optionally paginated.
 *
 * @throws {Error} If an error occurs while fetching projects.
 */
async function getAll(limit, offset) {
  console.log('Getting all projects in repo');

  try {

    const collection = db.collection(COLLECTION_NAME);
    if (limit === undefined || offset === undefined) {
      return await collection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
    } else {
      return await collection
        .find()
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Retrieves the total count of all projects in the collection.
 *
 * This function counts all documents in the project collection to support pagination.
 *
 * @async
 * @function getTotalCount
 *
 * @returns {Promise<number>} The total number of projects in the collection.
 *
 * @throws {Error} If an error occurs while counting documents.
 */
async function getTotalCount() {
  const collection = db.collection(COLLECTION_NAME);
  return await collection.countDocuments();
}

/**
 * Retrieves projects associated with a specific user, with optional pagination.
 *
 * This function fetches projects for a specified user ID, sorted by creation date
 * in descending order. It applies pagination if `limit` and `offset` are provided.
 *
 * @async
 * @function getProjectsByUser
 *
 * @param {string} userId - The unique identifier of the user whose projects are to be retrieved.
 * @param {number} [limit] - The maximum number of projects to retrieve.
 * @param {number} [offset] - The number of projects to skip for pagination.
 *
 * @returns {Promise<Array<Object>>} The list of projects associated with the user, optionally paginated.
 *
 * @throws {Error} If an error occurs while fetching projects.
 */
async function getProjectsByUser(userId, limit, offset) {
  console.log('[ProjectRepo.getProjectsByUser] Getting projects by user:', userId);

  try {
    const collection = db.collection(COLLECTION_NAME);
    if (limit === undefined || offset === undefined) {
      return await collection.find({
        users: userId
      }).toArray();
    }

    const projects = await collection.find({
      users: userId
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

// Gets all projects with user details by query. useful for displaying user details in projects list
async function getProjectsWithUserDetailsBy(query = {}, options = {}) {
  console.log('Getting all projects with user details by query:', JSON.stringify({ query, options }));
  // get projects with aggregated user details
  const collection = db.collection(COLLECTION_NAME);
  const pipeline = [
    {
      $match: query
    },
    {
      $lookup: {
        from: 'users',
        localField: 'users',
        foreignField: '_id',
        as: 'users'
      }
    },
    {
      $project: {
        name: 1,
        users: {
          _id: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          username: 1
        },
        active: 1,
        createdAt: 1
      }
    },
    {
      $sort: options.sort || { createdAt: -1 }
    },
    {
      $skip: options.skip || 0
    },
    {
      $limit: options.limit || 10
    }
  ];

  const result = await collection.aggregate(pipeline).toArray();
  return result;
}

async function countBy(query) {
  console.log('[ProjectRepo.countBy] Counting projects by query:', query);
  const collection = db.collection(COLLECTION_NAME);
  return await collection.countDocuments(query);
}

async function getProjectsBy(query, options) {
  console.log('[ProjectRepo.getProjectsBy] Getting projects by query:', query);
  const collection = db.collection(COLLECTION_NAME);

  return await collection.find(query, options).toArray();
}

/**
 * Retrieves the total count of projects associated with a specific user.
 *
 * This function counts all projects for a specified user ID to support pagination.
 *
 * @async
 * @function getTotalCountByUser
 *
 * @param {string} userId - The unique identifier of the user whose project count is to be retrieved.
 *
 * @returns {Promise<number>} The total number of projects associated with the user.
 *
 * @throws {Error} If an error occurs while counting user-specific projects.
 */

async function getTotalCountByUser(userId) {
  const collection = db.collection(COLLECTION_NAME);

  return await collection.countDocuments({
    users: userId
  });
}

/**
 * Retrieves a project by its unique ID.
 *
 * This function fetches a single project from the database using the provided project ID.
 *
 * @async
 * @function getAllByID
 *
 * @param {string} projectId - The unique identifier of the project to retrieve.
 *
 * @returns {Promise<Object|null>} The project object if found, or `null` if no project with the specified ID exists.
 *
 * @throws {Error} If an error occurs while fetching the project.
 */
async function getAllByID(projectId) {
  console.log('[ProjectRepo.getAllByID] Getting project by ID:', projectId);

  try {

    const collection = db.collection(COLLECTION_NAME);

    return await collection.findOne({
      _id: new ObjectId(projectId),
    });
  } catch (error) {
    console.error('Error fetching project by ID:', error);
  }
}

/**
 * Retrieves a project by its name.
 *
 * This function fetches a single project from the database based on its name.
 *
 * @async
 * @function getProjectByName
 *
 * @param {string} projectName - The name of the project to retrieve.
 *
 * @returns {Promise<Object|null>} The project object if found, or `null` if no project with the specified name exists.
 *
 * @throws {Error} If an error occurs while fetching the project.
 */
async function getProjectByName(projectName) {
  console.log('[ProjectRepo.getProjectsByName] Getting project by name:', projectName);
  const collection = db.collection(COLLECTION_NAME);

  return await collection.findOne({
    name: projectName,
  });
}

/**
 * Inserts a new project document into the database.
 *
 * This function connects to the database, retrieves the specified collection, 
 * and inserts the provided project document. It returns the ID of the newly 
 * created document if the insertion is successful.
 *
 * @async
 * @function create
 *
 * @param {Object} project - The project data to be inserted into the collection.
 *
 * @returns {ObjectId} The ID of the newly inserted project document.
 *
 * @throws {Error} Throws an error if the database connection or insertion fails.
 */
async function create(project) {
  const collection = db.collection(COLLECTION_NAME);

  const projectWithTimestamp = {
    ...project,
    createdAt: new Date(), // Use the current date and time as the createdAt value
  };

  console.log('[ProjectRepo.create] Inserting new project:', projectWithTimestamp);

  const result = await collection.insertOne(projectWithTimestamp);
  return result.insertedId;
}

/**
 * Updates an existing project in the database with new data.
 *
 * This function takes a project object, retrieves the existing project
 * with the same name from the database, and replaces it with the updated
 * project data. Only fields present in the incoming project object will
 * be updated.
 *
 * @async
 * @function edit
 * @param {Object} project - The project object containing updated data.
 * @returns {Promise<number>} - The number of documents modified (0 if no matching project was found, 1 if updated successfully).
 */
async function edit(project) {
  const collection = db.collection(COLLECTION_NAME);

  const old_project = await collection.findOne({ name: project.name });
  const result = await collection.replaceOne(
    { name: project.name },
    { ...old_project, ...project }
  );
  return result.modifiedCount;  //should be only 0(no matching project) or 1
}

/**
 * Deletes a project by its unique ID.
 *
 * This function connects to the database, locates the specified project by its ID,
 * and deletes it. The function returns the number of deleted documents, which will
 * be `1` if the project was successfully deleted, or `0` if no project with the specified ID was found.
 * In case of an error, it logs the error and rethrows it for further handling.
 *
 * @async
 * @function deleteProject
 *
 * @param {string} projectId - The unique identifier of the project to be deleted.
 *
 * @returns {Promise<number>} The number of documents deleted:
 *   - `1` if the project was successfully deleted.
 *   - `0` if no project with the specified ID was found.
 *
 * @throws {Error} If an error occurs during the database connection or deletion.
 */
async function deleteProject(projectId) {
  try {
    const _projectId = ObjectId.createFromHexString(projectId);
    const collection = db.collection(COLLECTION_NAME);
    // delete all associated scans, their scanResults(handled internally) for this project
    await ScansRepo.deleteScansBy({ projectID: _projectId });
    // finally, delete project
    const result = await collection.deleteOne({
      _id: _projectId
    });
    return result.deletedCount;

  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

module.exports = {
  getAll,
  getTotalCount,
  getAllByID,
  create,
  edit,
  deleteProject,
  getProjectsByUser,
  getProjectsWithUserDetailsBy,
  countBy,
  getProjectsBy,
  getTotalCountByUser,
  getProjectByName
};
