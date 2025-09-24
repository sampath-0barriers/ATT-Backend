const { generate } = require('../../src/utils/csvReportGenerator'); 
const fs = require('fs');

// Mocking fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFile: jest.fn((path, data, callback) => callback(null)),
}));

describe('generate function', () => {
  const cleaned_data = {
    baseUrl: 'http://example.com',
    scanResults: [
      {
        scanRequestId: '123',
        score: 95,
        testEngine: { name: 'EngineName', version: '1.0' },
        testRunner: { name: 'RunnerName' },
        testEnvironment: {
          userAgent: 'UserAgentString',
          windowWidth: 1920,
          windowHeight: 1080,
          orientationAngle: 0,
          orientationType: 'landscape-primary',
        },
        timestamp: '2021-01-01T00:00:00Z',
        url: '/page1',
        inapplicable: [
          { id: 'inapplicable1', tags: ['tag3'], description: 'Inapplicable description', help: 'Inapplicable help' }
        ],
        passes: [
          { id: 'pass1', tags: ['tag1', 'tag2'], description: 'Pass description', help: 'Pass help' }
        ],
        incomplete: [
          { id: 'incomplete1', tags: ['tag4'], description: 'Incomplete description', help: 'Incomplete help' }
        ],
        violations: [
          { id: 'violation1', tags: ['tag5'], description: 'Violation description', help: 'Violation help' }
        ],
      },
    ],
    violations: [
      {
        id: 'violation1',
        tags: ['tag5'],
        description: 'Violation description',
        help: 'Violation help',
        disabilities: ['Visual Impairment'],
        helpUrl: 'http://example.com/violation1_help',
        howToFix: 'Fix description for violation1',
        whyItMatters: 'Explanation for violation1',
      },
    ],
  
    tableData: {
      uniqueRuleIds: ["violation1", "violation2"],
      urls: ["http://example.com/page1", "http://example.com/page2"],
      ruleToUrlsMap: {
        "violation1": ["http://example.com/page1", "http://example.com/page2"],
        "violation2": ["http://example.com/page1"]
      },
      scores: {
        "violation1": "0",
        "violation2": "50"
      },
      urlScores: [
        { url: "http://example.com/page1", score: 80 },
        { url: "http://example.com/page2", score: 90 }
      ]
    },
    impactStats: [
      { category: "Critical", value: 1 },
      { category: "Serious", value: 1 },
      { category: "Needs review", value: 1}
    ],
    disabilitiesStats: {}
  };
  

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should generate a CSV file and resolve with the file path', async () => {
    fs.existsSync.mockReturnValue(false); // Simulate output directory does not exist

    const result = await generate(cleaned_data);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    expect(result).toContain('scanResults.csv'); // Check if the result contains the expected file path
  });

  it('should handle errors when writing the CSV file', async () => {
    fs.writeFile.mockImplementation((path, data, callback) => {
      callback(new Error('Failed to write file'));
    });

    await expect(generate(cleaned_data)).rejects.toMatch('Error writing CSV file');
  });
  
});