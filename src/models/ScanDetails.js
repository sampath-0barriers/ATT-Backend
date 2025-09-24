function ScanDetails(_id, timestamp, url, inapplicable, passes, violations, projectId, username) {
  this._id = _id;
  this.timestamp = timestamp;
  this.url = url;
  this.inapplicable = inapplicable;
  this.passes = passes;
  this.violations = violations;
  this.accessibilityScore = CalcAccessibilityScore(passes, violations);
  this.projectId = projectId; 
  this.username = username;

  this.getId = function() {
    return this._id;
  };
  this.getTimestamp = function() {
    return this.timestamp;
  };
  this.getUrl = function() {
    return this.url;
  };
  this.getInpplicable = function() {
    return this.inapplicable;
  };
  this.getPasses = function() {
    return this.passes;
  };
  this.getViolations = function() {
    return this.violations;
  };
  this.getAccessibilityScore = function() {
    return this.accessibilityScore;
  };
  this.getProjectId = function() {
    return this.projectId;
  };
  this.getUsername = function() {
    return this.username;
  };
}

function CalcAccessibilityScore(passes, violations) {
  const totalChecks = violations.length + passes.length;
  const passedChecks = passes.length;

  if (totalChecks === 0) {
    return 100;
  }

  const accessibilityScore = (passedChecks / totalChecks) * 100;
  return parseFloat(accessibilityScore.toFixed(2));
}
