const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { client } = require("../dao/database");
const UserService = require("../services/UserService");

const db = client.db();

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "59m" });
}

function validateLicense(req, res, next) {
  console.log("Validating license...");
  const license = req?.user?.license;
  if (!license) return res.status(403).json({ error: "No active license found. Please purchase a plan." });
  if (new Date(license?.expiresOn) < new Date()) {
    return res.status(403).json({ error: "License expired. Please renew your plan." });
  }
  next();
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({
    error: "Auth token is required"
  });

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // convert user _id to ObjectId for authorId queries/mutations
    user._id = ObjectId.createFromHexString(user._id);
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Auth token is invalid or expired" });
  }
}

async function login(req, res) {
  const user = await UserService.getByUsername(req.body.username);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) return res.status(401).json({ error: "Incorrect username or password" });
  if (!user.verified) return res.status(401).json({ error: "Your account is not verified yet. Please check your email" });
  if (!user.approved) return res.status(401).json({ error: "Your account is not approved yet. Please wait for approval" });

  const { email, password, phone, ...userObj } = user;
  const accessToken = generateAccessToken(userObj);
  const refreshToken = jwt.sign(
    userObj,
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const refresh_collection = db.collection("refresh_tokens");
  await refresh_collection.insertOne({ token: refreshToken });

  res.status(200).json({ accessToken: accessToken, refreshToken: refreshToken, user: userObj });
}

async function refresh(req, res) {
  const refreshToken = req.body.token;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token is required" });
  const refresh_collection = db.collection("refresh_tokens");
  const valid = await refresh_collection.countDocuments({
    token: refreshToken,
  });
  if (!valid) return res.status(403).json({ error: "Refresh token is invalid" });
  try {
    const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = generateAccessToken(user);
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error(error);
    return res.status(403).json({ error: "Refresh token is invalid or expired" });
  }
}

async function logout(req, res) {
  const refresh_collection = db.collection("refresh_tokens");
  await refresh_collection.deleteOne({ token: req.body.token });
  res.sendStatus(204);
}

module.exports = {
  login,
  logout,
  refresh,
  authenticateToken,
  getAccessToken,
  validateLicense
};

// TODO: delete
function getAccessToken(user) {
  return generateAccessToken(user);
}
