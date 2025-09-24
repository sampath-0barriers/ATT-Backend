// this is only for development purposes, do not use this in production
const Auth = require("../auth/auth");

async function getJwtToken(request, response) {
  try {
    const { username } = request.body;
    const token = Auth.getAccessToken({ username });
    response.status(200).json({ token: token });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { getJwtToken };
