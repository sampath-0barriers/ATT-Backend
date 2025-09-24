const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = require('../config');
const UserService = require('../services/UserService');
const { ObjectId } = require('mongodb');

/**
 * Sanitizes the registration data by validating the presence of essential fields.
 *
 * This function extracts essential fields from the user object and ensures they are
 * non-null and valid. If any required fields are missing, it returns `null`.
 *
 * @function sanitizeRegistration
 *
 * @param {Object} user - The user object containing registration details.
 * @param {string} user.username - Username for the new user.
 * @param {string} user.first_name - First name of the user.
 * @param {string} user.last_name - Last name of the user.
 * @param {string} user.email - Email address of the user.
 * @param {string} user.password - Plaintext password for the new user.
 *
 * @returns {Object|null} - The sanitized user object if valid, or `null` if invalid.
 */
function sanitizeRegistration(user) {
  const {
    first_name,
    last_name,
    username,
    email,
    password,
  } = user;
  if (
    !first_name ||
    !last_name ||
    !username ||
    !email ||
    !password
  ) {
    return null;
  } else {
    return {
      first_name,
      last_name,
      username,
      email,
      password
    };
  }
}

function sanitizeClientRegistration(user) {
  const {
    first_name,
    last_name,
    username,
    email,
    role,
    is_active
  } = user;
  if (
    !first_name ||
    !last_name ||
    !username ||
    !email ||
    !role ||
    !is_active
  ) {
    return null;
  } else {
    return {
      first_name,
      last_name,
      username,
      email,
      role,
      is_active
    };
  }
}

/**
 * Registers a new user after validating and sanitizing input data.
 *
 * This function uses `sanitizeRegistration` to validate user data, then attempts to
 * register the user using `UserService`. Sends an error message if registration fails
 * due to invalid data or duplicate username.
 *
 * @async
 * @function register
 *
 * @param {Object} req - Express request object containing user data.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a response indicating success or failure of registration.
 */
async function register(req, res) {
  try {
    const user = sanitizeRegistration(req.body);

    if (user == null) {
      res.status(400).send('First Name, Last Name, Username, Email, and Password are required.');
      return;
    }

    const password = req.body.password;

    // Password must have at least one digit [0-9],
    // one lowercase character [a-z],
    // one uppercase character [A-Z],
    // one special character [*!@#$%], 
    // and be between 8 and 32 characters
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*!@#$%]).{8,32}$/;

    if (!passwordRegex.test(password)) {
      const validations = [
        'Password must have at least one digit [0-9].',
        'Password must have at least one lowercase character [a-z].',
        'Password must have at least one uppercase character [A-Z].',
        'Password must have at least one special character [*!@#$%].',
        'Password must be between 8 and 32 characters long.',
      ];
      res.status(401).send(`Password is weak. Requirements:\n${validations.join('\n')}`);
      return;
    }

    if (req.body?.country_code) {
      user.country_code = req.body.country_code;
    }
    if (req.body?.phone) {
      user.phone = req.body.phone;
    }
    if (req.body?.company) {
      user.company = req.body.company;
    }

    const user_id = await UserService.register(user);

    if (user_id === "username") {
      res.status(408).send('A user with that username already exists.');
    } else if (user_id === "email") {
      res.status(409).send('A user with that email already exists.');
    } else {
      res.status(201).send('User created successfully with id: ' + user_id);
    }
  } catch (error) {
    console.error("Failed to register user:", error);
    res.status(500).send('Internal server error');
  }
}


/**
 * Registers a new user after validating and sanitizing input data.
 *
 * This function uses `sanitizeRegistration` to validate user data, then attempts to
 * register the user using `UserService`. Sends an error message if registration fails
 * due to invalid data or duplicate username.
 *
 * @async
 * @function register
 *
 * @param {Object} req - Express request object containing user data.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a response indicating success or failure of registration.
 */
async function registerClient(req, res) {
  try {
    const user = sanitizeClientRegistration(req.body);
    if (user == null) {
      res.status(400);
      res.send('User properties are invalid');
    }

    const user_id = await UserService.registerClient(user);

    // If the user_id is a string, then it is an error message
    if (user_id == "username") {
      res.status(408);
      res.send('A user with that username already exists.');
    } else if (user_id == "email") {
      res.status(409);
      res.send('A user with that email already exists.');
    } else {
      res.status(201);
      res.send('User created successfully with id: ' + user_id);
    }
  } catch (error) {
    console.error("Failed to register user:", error);
    res.status(500).send('Internal server error');
  }
}

/**
 * Approves a user account, requiring admin privileges.
 *
 * This function checks if the requester has admin rights before approving a specified
 * user account. If the user is successfully approved, a confirmation message is sent;
 * otherwise, an error message is returned.
 *
 * @async
 * @function approve
 *
 * @param {Object} req - Express request object containing the username to approve.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a response indicating success or failure of the approval.
 */
async function approve(req, res) {
  const userIdToApprove = req.body.userId;
  if (!userIdToApprove) return res.status(400).send('UserId is required.');
  try {
    const user = req.user;
    const isAdmin = user.admin;
    if (!isAdmin) return res.status(403).send("You are not authorized to approve a user.");
    const _userIdToApprove = ObjectId.createFromHexString(userIdToApprove);
    const approved_count = await UserService.updateOneUserBy({ _id: _userIdToApprove }, { approved: true });
    if (!approved_count) return res.status(404).send("No unapproved user found to approve");
    return res.status(200).send('User approved successfully.');
  } catch (error) {
    console.log("Failed to approve user:", error);
    return res.status(500).send('Internal server error');
  }
}

/**
  * Verify user email by user himself 
  * This function verifies the user email
  * It decodes the verification token and gets the user id
  * It updates the user verified field to true
  * 
  * @async
  * @function verify
  * 
  * @param {Object} req - Express request object containing verification token
  * @param {Object} res - Express response object for sending responses
  * @returns {void} Sends a response indicating success or failure of verification
  */

async function verify(req, res) {
  try {
    // Check if the verification token present in request
    const verificationToken = req.body.verificationToken;
    if (!verificationToken) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    const decoded = jwt.verify(verificationToken, ACCESS_TOKEN_SECRET);
    const _userId = ObjectId.createFromHexString(decoded.id);
    const modifiedCount = await UserService.updateOneUserBy({ _id: _userId }, { verified: true });
    if (!modifiedCount) return res.status(404).json({ message: 'No unverified user found to verify' });
    return res.status(200).json({ message: 'User verified successfully' });
  } catch (error) {
    console.log("Failed to verify user:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Edits an existing user's profile, allowing for avatar updates.
 *
 * This function verifies permissions and checks if the user exists. It allows the requester
 * to update their profile or other users if they have admin rights. If a file is provided,
 * it generates an avatar URL.
 *
 * @async
 * @function edit
 *
 * @param {Object} req - Express request object containing user data for editing.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a response with updated user data or error messages.
 */
async function edit(req, res) {
  try {
    const requester = await UserService.getByUsername(req.user.username);
    console.log("Requester:", requester);

    // Cannot edit someone else's profile if you are not an admin
    if (requester.username != req.body.username && requester.admin === false) {
      return res.sendStatus(403);
    }

    if (!req.body.username) {
      res.status(400);
      res.send('Username not found.');
      return;
    }

    const target = await UserService.getByUsername(req.body.username);
    if (!target) {
      res.status(404);
      res.send('User does not exist.');
      return;
    }
    // If there is an file in the request, then create a URL for the avatar.
    if (req.file) {
      const baseUrl = 'http://localhost:8080';
      let avatarUrl = baseUrl + `/uploads/images/${req.file.filename}`;
      req.body.avatar = avatarUrl;
    }
    console.log("BODY:", req.body);

    res.status(200);
    res.json(await UserService.edit(req.body));
  } catch (error) {
    console.error("Failed to edit user:", error);
    res.status(500);
    res.send('Internal server error');
  }
}

/**
 * Deletes a user account, requiring admin privileges.
 *
 * This function checks if the requester has admin rights before deleting a user.
 * If the user exists, it deletes them from the system.
 *
 * @async
 * @function deleteUser
 *
 * @param {Object} req - Express request object containing username to delete.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a response indicating success or failure of deletion.
 */
async function deleteUser(req, res) {
  const userIdToDelete = req.body.userId;
  if (!userIdToDelete) return res.status(400).send('UserId is required.');
  try {
    const user = req.user;
    const isAdmin = user.admin;
    if (!isAdmin) return res.status(403).send("You are not authorized to delete a user.");
    // Convert the userId to an ObjectId
    const _userIdToDelete = ObjectId.createFromHexString(userIdToDelete);
    const deleted_count = await UserService.deleteUser(_userIdToDelete);
    if (!deleted_count) return res.status(404).send("User not found.");
    return res.status(200).send('User deleted successfully.');
  } catch (error) {
    console.log("Failed to delete user:", error);
    return res.status(500).send('Internal server error');
  }
}

/**
 * Retrieves the details of the currently authenticated user.
 *
 * This function fetches user details based on the username stored in the
 * authentication token and returns them if found.
 *
 * @async
 * @function getUsername
 *
 * @param {Object} req - Express request object containing the username.
 * @param {Object} res - Express response object for sending responses.
 *
 * @returns {void} Sends a JSON response with user details or a 404 error if not found.
 */
async function getUsername(req, res) {
  const username = req.user.username;
  const user = await UserService.getByUsername(username);
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).send('User not found.');
  }
}

/**
 * Handles an HTTP request to retrieve a paginated list of users from the database.
 *
 * This function checks if the requester has admin privileges before proceeding to retrieve users.
 * It supports pagination through `page` and `limit` query parameters and returns the user list,
 * total count of users, total pages, and current page. If the requester is not an admin, the 
 * function sends a 403 status code response.
 *
 * @async
 * @function getAll
 *
 * @param {Object} request
 * @param {Object} request.user
 * @param {Object} request.query
 * @param {number} [request.query.page=1]
 * @param {number} [request.query.limit=5]
 *
 * @param {Object} response
 *
 * @returns {void} Sends a JSON response containing the paginated list of users, total count, total pages,
 *                 and current page. Sends an error message in case of failure.
 *
 * @throws Will send a 403 status code if the requester is not an admin.
 *         Will send a 500 status code if the database operation fails.
 *
 * @example
 * Request URL:
 * // GET /users?page=2&limit=5
 *
 * // Successful Response:
 * // {
 * //   "users": [{ "id": "1", "name": "User 1" }, { "id": "2", "name": "User 2" }, ...],
 * //   "total": 100,
 * //   "totalPages": 20,
 * //   "currentPage": 2
 * // }
 */
async function getAll(req, res) {
  const requester = await UserService.getByUsername(req.user.username);

  if (requester.admin === false) {
    return res.sendStatus(403); // Forbidden
  }

  // Get page and limit from query parameters, with default values
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);

  try {
    // Call the service function with pagination parameters
    const { users, total } = await UserService.getAll(page, limit);

    res.json({
      users,
      total,                    // Total number of users in the system
      totalPages: Math.ceil(total / limit), // Total pages based on the limit
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
}


module.exports = {
  register,
  registerClient,
  approve,
  verify,
  edit,
  deleteUser,
  getAll,
  getUsername
};
