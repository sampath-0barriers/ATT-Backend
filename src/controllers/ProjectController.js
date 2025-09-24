const { ObjectId } = require("mongodb");
const ProjectService = require("../services/ProjectService");
const UserService = require("../services/UserService");
const assert = require('assert');


function validatePositiveInteger(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : defaultValue;
}
/**
 * Retrieves a paginated list of projects based on user access privileges.
 *
 * This function fetches a paginated list of projects based on the authenticated user's role.
 * If the requester is an admin, it retrieves all projects. If the requester is not an admin,
 * it retrieves only the projects that the requester is part of. The function checks for valid
 * pagination parameters (`page` and `limit`) and returns a 400 response if they are missing or invalid.
 *
 * Additionally, for each project, the response includes user details (both user ID and username)
 * for users associated with the project.
 *
 * @async
 * @function getAll
 *
 * @param {Object} req - Express request object containing:
 *   @param {Object} req.query - The query parameters for pagination.
 *   @param {number} req.query.page - The page number for pagination (1-based).
 *   @param {number} req.query.limit - The maximum number of projects to retrieve per page.
 *   @param {Object} req.user - Object containing authenticated user information.
 *   @param {string} req.user.username - Username of the authenticated user making the request.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with:
 *   - 200 status and a paginated list of projects along with pagination details (total, totalPages, currentPage).
 *   - 400 status if `page` or `limit` query parameters are missing or invalid.
 *
 * The response structure includes:
 *   - `projects` (Array): The list of projects for the specified page, where each project includes:
 *     - `_id` (string): The unique identifier of the project.
 *     - `name` (string): The name of the project.
 *     - `users` (Array): A list of users associated with the project, where each user includes:
 *       - `id` (string): The user ID.
 *       - `username` (string): The username of the user.
 *     - `active` (boolean): Indicates if the project is active.
 *     - `createdAt` (string): The creation date of the project in ISO format.
 *   - `total` (number): The total number of projects available for the requester.
 *   - `totalPages` (number): The total number of pages available based on the `limit`.
 *   - `currentPage` (number): The current page number in the pagination.
 */
async function getAll(req, res) {
  const user = req.user;
  const isAdmin = user.admin;
  // Validate the page and limit query parameters (default to 1 and 10, respectively)
  const page = validatePositiveInteger(req.query.page, 1);
  const limit = validatePositiveInteger(req.query.limit, 10);

  // If the requester is not an admin, return only the projects they are a part of
  if (!isAdmin) {
    const { projectsWithUsernames, total } = await ProjectService.getAllByUser(
      req.user.username,
      page,
      limit
    );
    res.status(200).json({
      projects: projectsWithUsernames,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } else {
    const { projectsWithUsernames, total } = await ProjectService.getAll(
      page,
      limit
    );
    res.status(200).json({
      projects: projectsWithUsernames,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  }
}

async function getAllBy(req, res) {
  // get limit, sort, skip from query(default limit 10, sort by createdAt, skip 0)
  // get user from req.user
  // if user is admin, get all projects
  // else get projects belong to user
  try {
    const user = req.user;
    const isAdmin = user.admin;
    const page = validatePositiveInteger(req.query.page, 1);
    const limit = validatePositiveInteger(req.query.limit, 10);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "-createdAt";
    // Determine the sort field and order
    const sortField = sort.startsWith("-") ? sort.slice(1) : sort; // Remove the leading '-' if present
    const sortOrder = sort.startsWith("-") ? -1 : 1; // -1 for descending, 1 for ascending
    // if user is not admin, get active projects belong to user
    // const query = isAdmin ? {} : { users: user._id.toString(), active: true };
    // const projects = await ProjectService.getProjectsBy(query, { limit, skip, sort });
    const query = isAdmin ? {} : { users: user._id, active: true };
    const projects = await ProjectService.getProjectsWithUserDetailsBy(query, { limit, skip, sort: { [sortField]: sortOrder } });
    // get projects with user details using agg
    const total = await ProjectService.countProjectsBy(query);
    res.status(200).json({
      projects,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error getting projects:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

/**
 * Sanitizes and validates the incoming project data.
 *
 * This function checks that the project data includes a valid `name`, `users`, and `active` status.
 * If any required field is missing or invalid, it returns `null`. Otherwise, it returns an object
 * containing the sanitized `name`, `users`, and `active` status.
 *
 * @function sanitizeNewProject
 *
 * @param {Object} project - The project data to be sanitized.
 *   @param {string} project.name - The name of the project.
 *   @param {Array<string>} project.users - Array of user IDs associated with the project.
 *   @param {boolean} project.active - Status indicating if the project is active.
 *
 * @returns {Object|null} Returns the sanitized project data if valid; otherwise, `null`.
 */
function sanitizeNewProject(project) {
  const { name, users, active } = project;

  // Ensure all required fields are present and valid
  if (!name || active === undefined || users.length === 0) {
    return null;
  } else {
    return { name, users, active };
  }
}

/**
 * Creates a new project if the requester has admin privileges.
 *
 * This function first sanitizes and validates the incoming project data. Then, it checks if the requester
 * has admin privileges. It verifies the existence of each user ID specified in the project data and ensures
 * the project name is unique. If all conditions are met, it creates the project in the system.
 *
 * @async
 * @function create
 *
 * @param {Object} req - Express request object containing:
 *   @param {Object} req.body - The request body with the new project data.
 *   @param {Object} req.user - Object containing authenticated user information.
 *   @param {string} req.user.username - Username of the authenticated user making the request.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with:
 *   - 200 status and new project ID if creation is successful.
 *   - 403 status if the requester is not an admin.
 *   - 400 status if project data is invalid.
 *   - 404 status if one or more specified users do not exist.
 *   - 409 status if a project with the same name already exists.
 *   - 500 status if an internal server error occurs.
 */
async function create(req, res) {
  const sanitizedProject = sanitizeNewProject(req.body);
  const requester = await UserService.getByUsername(req.user.username);

  // Check if the requester has admin privileges
  if (requester.admin === false) {
    return res
      .status(403)
      .json({ message: "You must be an admin to create a project." });
  }

  // Validate the sanitized project data
  if (sanitizedProject === null) {
    return res
      .status(400)
      .json({ message: "One or more project properties is invalid." });
  }

  try {
    // Retrieve user IDs associated with the project
    const users = sanitizedProject.users;

    // Check if each user ID exists in the system
    const existing_users = await Promise.all(
      users.map(async (user_id) => {
        return await UserService.getByUserId(user_id);
      })
    );

    // If any user does not exist, return a 404 Not Found status
    if (existing_users.includes(null)) {
      return res
        .status(404)
        .json({ " message": "One or more users do not exist." });
    }

    // convert userId strings to objectIds inorder to make it work for aggregation query to fetch user details
    sanitizedProject.users = users.map(userId => ObjectId.createFromHexString(userId));

    // Attempt to create the new project
    const newProjectId = await ProjectService.create(sanitizedProject);
    if (newProjectId === null) {
      return res
        .status(409)
        .json({ message: "A project with that name already exists." });
    } else {
      return res.status(200).json({
        message: "Project created successfully.",
        projectId: newProjectId,
      });
    }
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

function sanitizeEditProjectData(project) {
  const { id, name, active, users } = project;
  if (!id) {
    return null;
  }
  return {
    id,
    ...(name && { name }),
    ...(active !== undefined && { active }),
    ...(users && { users }),
  };
}

/**
 * Edits an existing project.
 *
 * This function checks if the requester has admin privileges before allowing
 * any modifications to the project. It sanitizes the input project data and
 * updates the project if the data is valid. Returns a success message with
 * the count of modified projects or an error message if the requester is not
 * an admin or if the input data is invalid.
 *
 * @async
 * @function edit
 * @param {Object} req - Express request object containing project data for editing.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with custom error message and code:
 *   - 200 status and new project ID if creation is successful.
 *   - 403 status if the requester is not an admin.
 *   - 400 status if project data is invalid.
 *   - 404 status if one or more specified users do not exist, or project is missing
 *   - 409 status if a project with the same name already exists.
 *   - 500 status if an internal server error occurs.
 */
async function edit(req, res) {
  const sanitizedProject = sanitizeEditProjectData(req.body);
  const requester = await UserService.getByUsername(req.user.username);
  if (!requester.admin) {
    return res
      .status(403)
      .json({ message: "You must be an admin to edit a project." });
  }

  if (!sanitizedProject) {
    return res
      .status(400)
      .json({ message: "One or more project properties is invalid." });
  }

  try {
    // Retrieve user IDs associated with the project
    const users = sanitizedProject.users;

    // Check if each user ID exists in the system
    const existing_users = await Promise.all(
      users.map(async (user_id) => {
        return await UserService.getByUserId(user_id);
      })
    );

    // If any user does not exist, return a 404 Not Found status
    if (existing_users.includes(null)) {
      return res
        .status(404)
        .json({ message: "One or more users do not exist." });
    }

    // convert userId strings to objectIds inorder to make it work for aggregation query to fetch user details
    sanitizedProject.users = users.map(userId => ObjectId.createFromHexString(userId));

    const modified_count = await ProjectService.edit(sanitizedProject);

    if (modified_count == 1) {
      res.status(200);
      res.send("Modified project: " + sanitizedProject.name);
    } else if (modified_count == 0) {
      return res
        .status(404)
        .json({ message: "No project with that name found." });
    } else {
      assert(false, 'Modified count is ' + modified_count);  //should not reach here. If so, internal server error
    }
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

/**
 * Deletes a project if the requester has admin privileges.
 *
 * This function checks if the authenticated user has admin privileges before proceeding.
 * If the requester is not an admin, the deletion is blocked with a 403 response.
 * The function then verifies if a valid project ID is provided. If the project ID is not found,
 * it sends a 404 response. If deletion is successful, a 200 response is returned.
 *
 * @async
 * @function deleteProject
 *
 * @param {Object} req - Express request object containing:
 *   @param {Object} req.body - The request body with the project ID to delete.
 *   @param {string} req.body.projectId - The unique identifier of the project to be deleted.
 *   @param {Object} req.user - Object containing authenticated user information.
 *   @param {string} req.user.username - Username of the authenticated user making the request.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with:
 *   - 200 status and success message if deletion is successful.
 *   - 403 status if the requester is not an admin.
 *   - 400 status if no project ID is provided.
 *   - 404 status if the project with the specified ID is not found.
 *   - 500 status if an internal server error occurs.
 */
async function deleteProject(req, res) {
  const requester = await UserService.getByUsername(req.user.username);
  if (requester.admin === false) {
    res
      .status(403)
      .json({ message: "You must be an admin to delete a project." });
    return;
  }

  if (!req.body.projectId) {
    res
      .status(400)
      .json({ message: "You must provide a project ID to be deleted." });
  }

  const projectId = req.body.projectId;
  const result = await ProjectService.deleteProject(projectId);
  if (result !== 1) {
    res.status(404).json({ message: "No project with that name found." });
  } else {
    res
      .status(200)
      .json({
        messsage: "Project deleted successfully.",
        projectId: projectId,
      });
  }
}

/**
 * Retrieves a project by its unique ID and returns project details.
 *
 * This function retrieves a project based on the provided ID in the query parameters. If no project
 * is found with the specified ID, it sends a 404 response. If the project is found, it retrieves
 * the usernames of all users associated with the project and sends a 200 response with the project details.
 *
 * @async
 * @function getProjectById
 *
 * @param {Object} req - Express request object containing:
 *   @param {Object} req.query - The query parameters of the request.
 *   @param {string} req.query.id - The unique identifier of the project to retrieve.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with:
 *   - 200 status and project details (name, associated usernames, active status) if found.
 *   - 404 status if no project with the specified ID is found.
 *   - 500 status if an internal server error occurs.
 */
async function getProjectById(req, res) {
  const id = req.query.id;

  const project = await ProjectService.getProjectById(id);
  if (project === null) {
    return res.status(404).json({ message: "No project with that ID found." });
  } else {
    const users = await Promise.all(
      project.users.map(async (user_id) => {
        const user = await UserService.getByUserId(user_id);
        return user.username;
      })
    );

    return res.status(200).json({
      name: project.name,
      users: users,
      active: project.active,
    });
  }
}

module.exports = {
  getAll,
  getAllBy,
  create,
  edit,
  deleteProject,
  getProjectById,
};
