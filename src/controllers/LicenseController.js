const { STRIPE_SECRET_KEY, STRIPE_ENDPOINT_SECRET } = require("../config");
const stripe = require("stripe")(STRIPE_SECRET_KEY);
const LicenseService = require("../services/LicenseService");
const UserService = require("../services/UserService");
const { APP_URL } = require("../config");
const { ObjectId } = require("mongodb");

async function createCheckoutSession(req, res) {
  const planId = req.body.planId;
  if (!planId) return res.status(400).json({ error: "Plan ID is required" });
  const planInfo = LicenseService.getPlanById(planId);
  if (!planInfo) return res.status(400).json({ error: "Invalid Plan ID" });

  // check if user is trying to avail freetrial again
  const userId = req.user._id;
  const freetrialLicense = await LicenseService.getLicenseCount({
    authorId: userId,
    "plan.id": "nebula-001-30",
  });

  if (planId === "nebula-001-30" && freetrialLicense) return res.status(400).json({ error: "You have already availed the free trial. Purchase a plan" });
  const paymentSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: planInfo.name,
            description: planInfo.description,
            images: planInfo.images
          },
          unit_amount: planInfo.price * 100 // 100 cents = 1 USD (Stripe accepts amount in cents)
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      metadata: {
        userId: userId.toString(), // convert to string for stripe metadata
        planInfo: JSON.stringify(planInfo) // { name, description, price, duration
      } // add user info, plan details here for later use in webhook
    },
    mode: "payment",
    success_url: `${APP_URL}/license/purchase-success`,
    cancel_url: `${APP_URL}/license/purchase-cancel`
  });

  res.json({ id: paymentSession.id, url: paymentSession.url });
}

async function handlePaymentWebhook(req, res) {
  console.log("Received stripe webhook event");
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // raw request body. if express.raw() middleware is used, use req.body
      sig,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (err) {
    console.log("Webhook Error: ", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  if (event.type === "payment_intent.succeeded") {
    //  Handle the payment_intent.succeeded event
    console.log("Received payment_intent.succeeded event");
    const paymentIntent = event.data.object;
    // get plan details, userinfo from payment intent metadata
    const metadata = paymentIntent.metadata;
    console.log("Payment success intent. metadata: ", metadata);
    const userId = metadata.userId;
    // convert userId to ObjectId
    const _userId = ObjectId.createFromHexString(userId);
    const planInfo = JSON.parse(metadata.planInfo);

    // TODO:save plan details, userinfo to database
    const currentDate = new Date();
    let validFrom = currentDate;
    let expiresOn = new Date();
    expiresOn.setDate(currentDate.getDate() + planInfo.duration);
    // check if user already has a most latest valid license
    // if yes, extend the license validity
    const existingLicense = await LicenseService.getLicenseBy(
      { authorId: _userId, expiresOn: { $gt: currentDate } },
      { sort: { expiresOn: -1 } }
    );
    // if valid license found, extend the validity
    if (existingLicense) {
      console.log("Existing license found. Extending validity...");
      const existingExpiry = new Date(existingLicense.expiresOn);
      validFrom = existingExpiry;
      expiresOn = new Date(existingExpiry);
      expiresOn.setDate(existingExpiry.getDate() + planInfo.duration);
    }
    // create new license extending the validity if existing license found
    const licenseInfo = {
      availedFreeTrial: true, // should be default true validate plans in ui
      plan: planInfo,
      price: planInfo.price,
      paymentIntentId: paymentIntent.id,
      paymentStatus: "succeeded",
      purchasedOn: currentDate,
      validFrom,
      expiresOn,
      authorId: _userId,
    };
    await LicenseService.createLicense(licenseInfo);
    // update user object with license info for handy validations
    await UserService.updateOneUserBy({ _id: _userId }, { license: licenseInfo });
  } else {
    console.log(`Unhandled event type: ${event.type}`);
  }
  res.status(200).json({ received: true });
}

async function getAllLicenses(req, res) {
  const user = req.user;
  const isAdmin = user.admin;
  const query = isAdmin ? {} : { authorId: user._id };
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const sort = req.query.sort ? req.query.sort : "-createdAt";
  const skip = (page - 1) * limit;
  const licenses = await LicenseService.getAllLicenses(query, { limit, skip, sort });
  res.status(200).json(licenses);
}

function getAllLicensePlans(req, res) {
  const plans = LicenseService.getAllPlans();
  res.status(200).json(plans);
}

// Middleware to validate user license
async function validateLicense(req, res, next) {
  console.log("Validating license...");
  const userId = req.user._id;
  // get valid user license count
  const license = await LicenseService.getLicenseCount({ authorId: userId, expiresOn: { $gt: new Date() } });
  if (!license) return res.status(403).json({ error: "No active license found. Please purchase a plan." });
  req.license = license;
  next();
}

module.exports = {
  createCheckoutSession,
  handlePaymentWebhook,
  getAllLicenses,
  getAllLicensePlans,
  validateLicense
};
