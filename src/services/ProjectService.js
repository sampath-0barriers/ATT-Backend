const ProjectRepo = require('../repository/ProjectRepo');
const UserService = require('../services/UserService');

/**
 * Retrieves a paginated list of projects.
 *
 * This function fetches a specified number of projects (based on the `limit`) from the database
 * starting at an offset calculated from the given `page`. It also retrieves the total count of
 * projects for pagination purposes. For each project, the user IDs are replaced with user details
 * (user ID and username) for all associated users.
 *
 * @async
 * @function getAll
 *
 * @param {number} page - The page number for pagination (1-based).
 * @param {number} limit - The maximum number of projects to retrieve per page.
 *
 * @returns {Promise<Object>} An object containing:
 *   - `projectsWithUsernames` (Array): The list of projects for the specified page, where each project includes:
 *     - `_id` (string): The unique identifier of the project.
 *     - `name` (string): The name of the project.
 *     - `users` (Array): A list of users associated with the project, where each user includes:
 *       - `id` (string): The user ID.
 *       - `username` (string): The username of the user.
 *     - `active` (boolean): Indicates if the project is active.
 *     - `createdAt` (string): The creation date of the project in ISO format.
 *   - `total` (number): The total number of projects available.
 */
async function getAll(page, limit) {
  const offset = (page - 1) * limit;

  const projects = await ProjectRepo.getAll(limit, offset);

  // Loop through each project and fetch user details for each user ID
  const projectsWithUsernames = await Promise.all(
    projects.map(async (project) => {
      const usersWithNames = await Promise.all(
        project.users.map(async (userId) => {
          const user = await UserService.getByUserId(userId);
          return user ? { id: userId, username: user.username } : null;
        })
      );

      // Filter out any null user objects
      const filteredUsers = usersWithNames.filter(user => user !== null);

      return {
        ...project,
        users: filteredUsers,  // Replace user IDs with objects containing id and username
      };
    })
  );

  const total = await ProjectRepo.getTotalCount();

  return { projectsWithUsernames, total };
}

/**
 * Retrieves a project by its unique ID.
 *
 * This function fetches a project from the database using the provided project ID
 * by calling the `getAllByID` method in `ProjectRepo`. It returns the project object
 * if found or `null` if no project with the specified ID exists.
 *
 * @async
 * @function getProjectById
 *
 * @param {string} projectID - The unique identifier of the project to retrieve.
 *
 * @returns {Promise<Object|null>} The project object if found, or `null` if no project with
 * the specified ID exists.
 */
async function getProjectById(projectID) {
  const project = await ProjectRepo.getAllByID(projectID);
  return project;
}

async function getProjectsWithUserDetailsBy(query, options) {
  return await ProjectRepo.getProjectsWithUserDetailsBy(query, options);
}

async function getAllUsersByProjectId(projectID) {
  const project = await ProjectRepo.getAllByID(projectID);
  if (!project?.users || project.users.length === 0) {
    return [];
  }
  // Account for older projects where users are stored as objects
  if (typeof project.users[0] === 'object') {
    for (let i = 0; i < project.users.length; i++) {
      project.users[i] = project.users[i]._id;
    }
  }
  return project.users;
}

async function getAllByUser(username, page, limit) {
  console.log('Getting all projects for user:', username);

  const userId = await UserService.getByUsername(username);
  if (!userId) {
    return { projects: [], total: 0 };
  }

  const offset = (page - 1) * limit;

  const projects = await ProjectRepo.getProjectsByUser(userId._id, limit, offset);
  const projectsWithUsernames = await Promise.all(
    projects.map(async (project) => {
      const usersWithNames = await Promise.all(
        project.users.map(async (userId) => {
          const user = await UserService.getByUserId(userId);
          return user ? { id: userId, username: user.username } : null;
        })
      );

      // Filter out any null user objects
      const filteredUsers = usersWithNames.filter(user => user !== null);

      return {
        ...project,
        users: filteredUsers,  // Replace user IDs with objects containing id and username
      };
    })
  );

  const total = await ProjectRepo.getTotalCountByUser(userId._id);

  return { projectsWithUsernames, total };
}

async function countProjectsBy(query) {
  return await ProjectRepo.countBy(query);
}

async function getProjectsBy(query, options) {
  return await ProjectRepo.getProjectsBy(query, options);
}
/**
 * Creates a new project if a project with the same name does not already exist.
 *
 * This function checks if a project with the provided `name` already exists in the database.
 * If it does, the function returns `null` to indicate that a duplicate project cannot be created.
 * If no existing project is found, it creates a new project with the given `name`, `users`, and `active` status
 * and returns the ID of the newly created project.
 *
 * @async
 * @function create
 *
 * @param {Object} project - The project data to be created.
 *   @param {string} project.name - The name of the project.
 *   @param {Array<string>} project.users - Array of user IDs associated with the project.
 *   @param {boolean} project.active - Status indicating if the project is active.
 *
 * @returns {string|null} The ID of the newly created project if successful, or `null` if a project with the same name exists.
 *
 * @throws {Error} Throws an error if an issue occurs during the project creation process.
 */
async function create(project) {
  const { name, users, active } = project;

  try {
    existing_project = await ProjectRepo.getProjectByName(name);

    if (existing_project) {
      return null;
    }

    const newProjectId = await ProjectRepo.create({
      name,
      users,
      active,
    });

    return newProjectId;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Updates project
 * @param {} project project to edit with new information based on project name
 * @returns number of projects modified(1 or modified, 0 otherwise)
 */
async function edit(project) {
  return await ProjectRepo.edit(project);
}

/**
 * Deletes a project by its unique ID.
 *
 * This function calls the ProjectRepo to delete a project from the database
 * based on the provided project ID. It returns the result of the deletion operation.
 *
 * @async
 * @function deleteProject
 *
 * @param {string} projectId - The unique identifier of the project to be deleted.
 *
 * @returns {Promise<number>} The number of deleted documents:
 *   - 1 if the project was successfully deleted.
 *   - 0 if no project with the specified ID was found.
 */
async function deleteProject(projectId) {
  return await ProjectRepo.deleteProject(projectId);
}

module.exports = {
  getAll,
  getAllByUser,
  getAllUsersByProjectId,
  getProjectsBy,
  getProjectsWithUserDetailsBy,
  countProjectsBy,
  create,
  edit,
  deleteProject,
  getAllByUser,
  getProjectById
};
