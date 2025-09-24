
const ScansService = require('../../src/services/ScansService.js');
const htmlReportGenerator = require('../../src/utils/htmlReportGenerator.js');
const csvReportGenerator = require('../../src/utils/csvReportGenerator');
const pdfReportGenerator = require('../../src/utils/pdfReportGenerator');
const ReportService = require('../../src/services/ReportService.js');
const {getRule} = require('../../src/repository/RulesRepo')


// Mock the external dependencies
jest.mock('../../src/repository/RulesRepo', () => ({
  getRule: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/services/ScansService.js');
jest.mock('../../src/utils/htmlReportGenerator.js');
jest.mock('../../src/utils/csvReportGenerator');
jest.mock('../../src/utils/pdfReportGenerator');


const sampleData = [
  {
    "timestamp": 1625190000000,
    "score": 80,
    "url": "http://example.com/page1",
    "violations": [
      {
        "id": "violation1",
        "description": "Images without alt text",
        "impact": "medium",
        "tags": ["WCAG 2.1 A", "1.1.1 Non-text Content"],
        "helpUrl": "http://example.com/violation1_help",
        "nodes": [
          {
            "target": ["#imageWithoutAlt"],
            "html": "<img src='image.jpg'>"
          }
        ]
      },
      {
        "id": "violation2",
        "description": "Input fields without labels",
        "impact": "high",
        "tags": ["WCAG 2.1 AA", "3.3.2 Labels or Instructions"],
        "helpUrl": "http://example.com/violation2_help",
        "nodes": [
          {
            "target": ["#nameInput"],
            "html": "<input type='text' id='nameInput'>"
          }
        ]
      }
    ]
  },
  {
    "timestamp": 1625193600000,
    "score": 90,
    "url": "http://example.com/page2",
    "violations": [
      {
        "id": "violation1",
        "description": "Images without alt text",
        "impact": "medium",
        "tags": ["WCAG 2.1 A", "1.1.1 Non-text Content"],
        "helpUrl": "http://example.com/violation1_help",
        "nodes": [
          {
            "target": ["#anotherImageWithoutAlt"],
            "html": "<img src='anotherImage.jpg'>"
          }
        ]
      }
    ]
  }
]

const sampleRule = {
  ruleId: "color-contrast",
  name: "Color Contrast",
  description: "Text and images of text have a contrast ratio of at least 4.5:1, except for large text, incidental text, or logotypes.",
  disabilitiesAffected: ["Visual Impairment"],
  howToFix: "Increase the contrast between foreground text and its background to at least 4.5:1 for normal text and 3:1 for large text.",
  successCriteria: [
    {
      version: "WCAG 2.1",
      level: "AA",
      criteria: "1.4.3 Contrast (Minimum)"
    }
  ],
  helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html"
}


const cleanedDataMock = {
  averageScore: 85,
  violations: [
    {
      id: "violation1",
      description: "Images without alt text",
      impact: "medium",
      helpUrl: "http://example.com/violation1_help",
    },
  ],
  scanResults: sampleData, 
};



describe('ReportService.generateReport', () => {
  const scanRequestId = '123';

  beforeEach(() => {
    ScansService.getResults.mockResolvedValue(sampleData);
    htmlReportGenerator.generate.mockResolvedValue('HTML Report');
    csvReportGenerator.generate.mockResolvedValue('CSV Report');
    pdfReportGenerator.generate.mockResolvedValue('PDF Report');
    getRule.mockResolvedValue(sampleRule);

  });

  afterEach(() => {
    jest.clearAllMocks();
  })


  test('generates HTML report successfully using original scan results', async () => {

    const report = await ReportService.generateReport(scanRequestId, 'html');
    expect(report).toEqual('HTML Report');
    expect(htmlReportGenerator.generate).toHaveBeenCalled();
    console.log(sampleData)
  });

  test('generates CSV report successfully using cleaned data', async () => {
    const report = await ReportService.generateReport(scanRequestId + 1, 'csv');
    expect(report).toEqual('CSV Report');
    expect(csvReportGenerator.generate).toHaveBeenCalled();
  });

  test('generates PDF report successfully using cleaned data', async () => {
    const report = await ReportService.generateReport(scanRequestId, 'pdf');
    expect(report).toEqual('PDF Report');
    expect(pdfReportGenerator.generate).toHaveBeenCalled();

  });

  test('throws error for unsupported report format', async () => {
    await expect(ReportService.generateReport(scanRequestId, 'unsupported')).rejects.toThrow('Unsupported report format: unsupported');
  });

  test('throws error when no scan results are found', async () => {
    ScansService.getResults.mockResolvedValue([]);
    await expect(ReportService.generateReport(scanRequestId, 'html')).rejects.toThrow('No scan results found for the provided scanRequestId.');
  });

  test('handles error from ScansService.getResults', async () => {
    ScansService.getResults.mockRejectedValue(new Error('Service error'));
    await expect(ReportService.generateReport(scanRequestId, 'html')).rejects.toThrow('Service error');
  });
});



describe('ReportService.cleanData', () => {
  

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    getRule.mockResolvedValue(sampleRule);

  });

  afterEach(() => {
    // Restore the original implementations
    jest.restoreAllMocks();
  });

  test('should calculate average score correctly', async () => {
    const result = await ReportService.cleanData(sampleData);
    expect(result.averageScore).toBe(85);
  });

  
  test('should return expected output structure', async () => {
    const result = await ReportService.cleanData(sampleData);
    expect(result).toHaveProperty('averageScore');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('scanResults');
    expect(result).toHaveProperty('disabilitiesStats');
    expect(result).toHaveProperty('impactStats');
    expect(result).toHaveProperty('tableData');
    expect(result).toHaveProperty('baseUrl');
  });

  // Add more tests as needed to cover different aspects and edge cases
});


describe('cleanDataForTable', () => {
  test('should return structured data for table display correctly', async () => {
    const expected = {
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
    };
    
    
    const result = ReportService.cleanDataForTable(sampleData);
    expect(result).toEqual(expected);
  });
});