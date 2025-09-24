const { ObjectId } = require('mongodb');
const { client } = require('../dao/database');
const LicenseRepo = require('./LicenseRepo');
const ScansRepo = require('./ScansRepo');
const PdfScansRepo = require('./PdfScansRepo');

const db = client.db();
const COLLECTION_NAME = 'users';

async function create(user) {
  const collection = db.collection(COLLECTION_NAME);
  const admin = user.role === 'admin' ? true : false;
  // create a userId
  const userId = new ObjectId();

  // attach nebula freetrial plan to new user
  const planInfo = LicenseRepo.licensePlans.find(plan => plan.id === "nebula-001-30");
  const currentDate = new Date();
  const expiresOn = new Date();
  expiresOn.setDate(currentDate.getDate() + planInfo.duration);
  user.license = {
    availedFreeTrial: true,
    plan: planInfo,
    price: 0,
    purchasedOn: currentDate,
    validFrom: currentDate,
    expiresOn,
    authorId: userId,
  };

  // insert user license to license collection
  await LicenseRepo.create(user.license);

  const result = await collection.insertOne({
    _id: userId,
    ...user,
    timezone: "America/Toronto",
    avatar: "",
    admin: admin,
    approved: false,
    verified: false
  });
  return result;
}

async function getByUsername(username) {
  const collection = db.collection(COLLECTION_NAME);
  return collection.findOne({ username });
}

// Add a new function to retrieve a user by their email address
async function getByEmail(email) {
  const collection = db.collection(COLLECTION_NAME);

  return collection.findOne({ email });
}

async function getByUserId(userId) {
  console.log("Getting user by userId: ", userId);
  const collection = db.collection(COLLECTION_NAME);
  return collection.findOne({ _id: new ObjectId(userId) });
}

async function approve_user(username) {
  const collection = db.collection(COLLECTION_NAME);
  return (
    await collection.updateOne({ username }, { $set: { approved: true } })
  ).modifiedCount;
}

async function verify_user(username) {
  const collection = db.collection(COLLECTION_NAME);
  return (
    await collection.updateOne({ username }, { $set: { verified: true } })
  ).modifiedCount;
}

async function edit_user(user) {
  const collection = db.collection(COLLECTION_NAME);
  const old_user = await collection.findOne({ username: user.username });
  const modified_user = { ...old_user, ...user };
  return collection.findOneAndReplace(
    { username: user.username },
    modified_user,
    { returnDocument: 'after' },
  );
}

async function deleteUser(userId) {
  const collection = db.collection(COLLECTION_NAME);
  // delete all pdf scans, scan results for this user(both handled internally)
  await PdfScansRepo.deleteBy({ authorId: userId });
  // delete all scans, associated scan results for this user(both handled internally)
  await ScansRepo.deleteScansBy({ authorId: userId });
  // delete all licenses for this user
  await LicenseRepo.deleteLicensesBy({ authorId: userId });
  // finally, delete user
  const result = await collection.deleteOne({ _id: userId });
  return result.deletedCount;
}


async function updateOneBy(query, updateData) {
  console.log("Updating user by query with data: ", query, updateData);
  const collection = db.collection(COLLECTION_NAME);
  const res = await collection.updateOne(query, { $set: updateData });
  return res.modifiedCount;
}

async function getAll(limit, offset) {
  const collection = db.collection(COLLECTION_NAME);


  try {
    if (limit === undefined || offset === undefined) {
      const users = await collection.find({}).toArray();
      return users;
    } else {
      const users = await collection.find({})
        .skip(offset)
        .limit(limit)
        .toArray();

      return users;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function getTotalCount() {
  const collection = db.collection(COLLECTION_NAME);

  // Get the total count of documents (users) in the collection
  return await collection.countDocuments();
}


module.exports = {
  create,
  getByUsername,
  getByEmail,
  approve_user,
  verify_user,
  edit_user,
  updateOneBy,
  deleteUser,
  getAll,
  getTotalCount,
  getByUserId
};
