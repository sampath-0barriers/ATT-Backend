const LicenseRepo = require("../repository/LicenseRepo");

function getPlanById(id) {
  return LicenseRepo.licensePlans.find((plan) => plan.id === id);
}

async function getAllLicenses(query, options) {
  return await LicenseRepo.getBy(query, options);
}

async function getLicenseBy(query, options) {
  return await LicenseRepo.getOneBy(query, options);
}

function getAllPlans() {
  return LicenseRepo.licensePlans;
}

async function getLicenseCount(filter, options) {
  return await LicenseRepo.getTotalCount(filter, options);
}

async function createLicense(licenseInfo) {
  return await LicenseRepo.create(licenseInfo);
};

async function updateLicense(licenseId, licenseInfo) {
  return await LicenseRepo.update(licenseId, licenseInfo);
}

async function deleteLicense(licenseId) {
  return await LicenseRepo.remove(licenseId);
}

module.exports = {
  getAllPlans,
  getPlanById,
  getLicenseCount,
  getAllLicenses,
  getLicenseBy,
  createLicense,
  updateLicense,
  deleteLicense
};
