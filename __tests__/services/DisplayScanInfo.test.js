const { getRuleFromId, getRulesFromIdList, createScanDetails } = require('../../src/services/DisplayScanInfo');
const ScansRepo = require('../../src/repository/ScansRepo');
const rulesData = require('../../src/utils/rules.json');

jest.mock('../../src/repository/ScansRepo');
jest.mock('../../src/utils/rules.json', () => ({
  rule1: {
    id: 'rule1',
    ruleId: '1',
    userImpact: 'high',
    wcag: '2.1.1',
    howToFixTheProblem: 'Fix this problem by doing X',
    whyItMatters: 'This is why it matters.',
    ruleDescription: 'This is a description of the rule.',
    theAlgorithm: 'Algorithm description.',
    disabilitiesAffected: ['visual'],
    requirements: ['Requirement 1'],
    wcagSuccessCriteria: ['2.1.1'],
    section508Guidelines: ['1194.21'],
  },
  rule2: {
    id: 'rule2',
    ruleId: '2',
    userImpact: 'low',
    wcag: '2.2.2',
    howToFixTheProblem: 'Fix this problem by doing Y',
    whyItMatters: 'This is why it matters.',
    ruleDescription: 'This is a description of the rule.',
    theAlgorithm: 'Algorithm description.',
    disabilitiesAffected: ['hearing'],
    requirements: ['Requirement 2'],
    wcagSuccessCriteria: ['2.2.2'],
    section508Guidelines: ['1194.22'],
  },
}));

describe('ScansService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRuleFromId', () => {
    it('should return a Rule object for a valid rule ID', () => {
      const rule = getRuleFromId('rule1');
      expect(rule).toEqual({
        id: 'rule1',
        ruleId: '1',
        userImpact: 'high',
        wcag: '2.1.1',
        howToFixTheProblem: 'Fix this problem by doing X',
        whyItMatters: 'This is why it matters.',
        ruleDescription: 'This is a description of the rule.',
        theAlgorithm: 'Algorithm description.',
        disabilitiesAffected: ['visual'],
        requirements: ['Requirement 1'],
        wcagSuccessCriteria: ['2.1.1'],
        section508Guidelines: ['1194.21'],
      });
    });

    it('should return an error object for an invalid rule ID', () => {
      const rule = getRuleFromId('invalidRule');
      expect(rule).toEqual({ error: 'Rule not found' });
    });
  });

  describe('getRulesFromIdList', () => {
    it('should return an array of Rule objects for valid rule IDs', () => {
      const rules = getRulesFromIdList(['rule1', 'rule2']);
      expect(rules).toEqual([
        {
          id: 'rule1',
          ruleId: '1',
          userImpact: 'high',
          wcag: '2.1.1',
          howToFixTheProblem: 'Fix this problem by doing X',
          whyItMatters: 'This is why it matters.',
          ruleDescription: 'This is a description of the rule.',
          theAlgorithm: 'Algorithm description.',
          disabilitiesAffected: ['visual'],
          requirements: ['Requirement 1'],
          wcagSuccessCriteria: ['2.1.1'],
          section508Guidelines: ['1194.21'],
        },
        {
          id: 'rule2',
          ruleId: '2',
          userImpact: 'low',
          wcag: '2.2.2',
          howToFixTheProblem: 'Fix this problem by doing Y',
          whyItMatters: 'This is why it matters.',
          ruleDescription: 'This is a description of the rule.',
          theAlgorithm: 'Algorithm description.',
          disabilitiesAffected: ['hearing'],
          requirements: ['Requirement 2'],
          wcagSuccessCriteria: ['2.2.2'],
          section508Guidelines: ['1194.22'],
        },
      ]);
    });

    it('should skip invalid rule IDs and return only valid Rule objects', () => {
      const rules = getRulesFromIdList(['rule1', 'invalidRule']);
      expect(rules).toEqual([
        {
          id: 'rule1',
          ruleId: '1',
          userImpact: 'high',
          wcag: '2.1.1',
          howToFixTheProblem: 'Fix this problem by doing X',
          whyItMatters: 'This is why it matters.',
          ruleDescription: 'This is a description of the rule.',
          theAlgorithm: 'Algorithm description.',
          disabilitiesAffected: ['visual'],
          requirements: ['Requirement 1'],
          wcagSuccessCriteria: ['2.1.1'],
          section508Guidelines: ['1194.21'],
        },
      ]);
    });
  });

  describe('createScanDetails', () => {
    it('should create and return a ScanDetails object', async () => {
      const mockScanResult = {
        _id: 'scan1',
        timestamp: '2024-11-15T10:00:00Z',
        url: 'https://example.com',
        inapplicable: ['rule3'],
        passes: ['rule1'],
        violations: { v1: { id: 'rule2' } },
      };
      ScansRepo.getScanResults.mockResolvedValue(mockScanResult);

      const scanDetails = await createScanDetails('scan1');

      expect(ScansRepo.getScanResults).toHaveBeenCalledWith('scan1');
      expect(scanDetails.getId()).toBe('scan1');
      expect(scanDetails.getTimestamp()).toBe('2024-11-15T10:00:00Z');
      expect(scanDetails.getUrl()).toBe('https://example.com');
      expect(scanDetails.getInapplicable()).toEqual(['rule3']);
      expect(scanDetails.getPasses()).toEqual(['rule1']);
      expect(scanDetails.getViolations()).toEqual([
        {
          id: 'rule2',
          ruleId: '2',
          userImpact: 'low',
          wcag: '2.2.2',
          howToFixTheProblem: 'Fix this problem by doing Y',
          whyItMatters: 'This is why it matters.',
          ruleDescription: 'This is a description of the rule.',
          theAlgorithm: 'Algorithm description.',
          disabilitiesAffected: ['hearing'],
          requirements: ['Requirement 2'],
          wcagSuccessCriteria: ['2.2.2'],
          section508Guidelines: ['1194.22'],
        },
      ]);
    });

    it('should throw an error if repository throws an error', async () => {
      const mockError = new Error('Repository Error');
      ScansRepo.getScanResults.mockRejectedValue(mockError);

      await expect(createScanDetails('scan1')).rejects.toThrow('Repository Error');
    });
  });
});
