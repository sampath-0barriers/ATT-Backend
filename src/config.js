require('dotenv').config();

const APP_URL = process.env.APP_URL;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET;

module.exports = {
  APP_URL,
  ACCESS_TOKEN_SECRET,
  RESEND_API_KEY,
  RESEND_SENDER_EMAIL,
  STRIPE_SECRET_KEY,
  STRIPE_ENDPOINT_SECRET
};