const ScansRepo = require('../repository/ScansRepo');
const rulesData = require('../utils/rules.json');

function ScanDetails(_id, timestamp, url, inapplicable, passes, violations) {
  this._id = _id;
  this.timestamp = timestamp;
  this.url = url;
  this.inapplicable = inapplicable;
  this.passes = passes;
  const violationsList = [];
  for (const violation in violations) {
    violationsList.push(violations[violation].id);
  }
  this.violations = getRulesFromIdList(violationsList);
}

ScanDetails.prototype.getId = function() {
  return this._id;
};
ScanDetails.prototype.getTimestamp = function() {
  return this.timestamp;
};
ScanDetails.prototype.getUrl = function() {
  return this.url;
};
ScanDetails.prototype.getInapplicable = function() {
  return this.inapplicable;
};
ScanDetails.prototype.getPasses = function() {
  return this.passes;
};
ScanDetails.prototype.getViolations = function() {
  return this.violations;
};

function Rule(ruleData) {
  this.id = ruleData.id;
  this.ruleId = ruleData.ruleId;
  this.userImpact = ruleData.userImpact;
  this.wcag = ruleData.wcag;
  this.howToFixTheProblem = ruleData.howToFixTheProblem;
  this.whyItMatters = ruleData.whyItMatters;
  this.ruleDescription = ruleData.ruleDescription;
  this.theAlgorithm = ruleData.theAlgorithm;
  this.disabilitiesAffected = ruleData.disabilitiesAffected;
  this.requirements = ruleData.requirements;
  this.wcagSuccessCriteria = ruleData.wcagSuccessCriteria;
  this.section508Guidelines = ruleData.section508Guidelines;
}

function getRuleFromId(ruleId) {
  const ruleData = rulesData[ruleId];
  if (ruleData) {
    return new Rule(ruleData);
  } else {
    return {error: 'Rule not found'};
  }
}

function getRulesFromIdList(ruleIds) {
  const ruleObjects = [];

  for (const ruleId of ruleIds) {
    const ruleData = rulesData[ruleId];
    if (ruleData) {
      ruleObjects.push(new Rule(ruleData));
    }
  }

  return ruleObjects;
}

async function createScanDetails(scanRequestId) {
  const scan_result = await ScansRepo.getScanResults(scanRequestId);
  return new ScanDetails(
      scan_result._id,
      scan_result.timestamp,
      scan_result.url,
      scan_result.inapplicable,
      scan_result.passes,
      scan_result.violations,
  );
}

function displayPassedRules(scanDetails) {
  scanDetails.getPasses;
}

module.exports = {getRuleFromId, getRulesFromIdList, createScanDetails};
