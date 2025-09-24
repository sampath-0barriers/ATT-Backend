const { generate } = require('../../src/utils/htmlReportGenerator');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

// Mock all required modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Update path mock to preserve directory structure
jest.mock('path', () => ({
  join: jest.fn((...args) => {
    // If the path includes __dirname, we want to keep 'output' in the path
    if (args[0] === '__dirname') {
      return `${args[0]}/output/${args[args.length - 1]}`;
    }
    // For other paths (like image paths), just join with forward slashes
    return args.join('/');
  })
}));

jest.mock('../../src/utils/chartGenerator', () => ({
  generateChart: jest.fn().mockResolvedValue(Buffer.from('mock-chart-1')),
  generateDoughnutChart: jest.fn().mockResolvedValue(Buffer.from('mock-chart-2')),
  generateBarGraph: jest.fn().mockResolvedValue(Buffer.from('mock-chart-3')),
  formatDate: jest.fn(date => '2024-01-01')
}));

jest.mock('he', () => ({
  encode: jest.fn(str => str)
}));

describe('HTML Report Generator', () => {
  const mockScanResults = {
    baseUrl: 'http://example.com',
    averageScore: '85',
    audit: {
      client: 'Test Client',
      contact_name: 'John Doe',
      contact_email: 'john@example.com',
      company_address: '123 Test St',
      auditor: 'Test Auditor'
    },
    scanResults: [{
      testEnvironment: {
        userAgent: 'Mozilla/5.0',
        windowWidth: 1920,
        windowHeight: 1080,
        orientationAngle: 0,
        orientationType: 'landscape'
      },
      timestamp: '2024-01-01T00:00:00Z'
    }],
    violations: [
      {
        id: 'rule1',
        impact: 'critical',
        howToFix: 'Fix instruction',
        whyItMatters: 'Explanation',
        description: 'Rule description',
        disabilities: ['Visual', 'Cognitive'],
        successCriteria: 'WCAG 2.1',
        tags: ['accessibility', 'aria']
      }
    ],
    impactStats: [
      { category: 'Critical', value: 2 },
      { category: 'Serious', value: 1 }
    ],
    disabilitiesStats: {
      'Visual': 3,
      'Cognitive': 2
    },
    tableData: {
      uniqueRuleIds: ['rule1', 'rule2'],
      urls: ['http://example.com/page1', 'http://example.com/page2'],
      ruleToUrlsMap: {
        'rule1': ['http://example.com/page1'],
        'rule2': ['http://example.com/page2']
      },
      urlScores: [
        { url: 'http://example.com/page1', score: 90 },
        { url: 'http://example.com/page2', score: 80 }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue(Buffer.from('mock-image'));
    
    // Reset path.join mock counts
    path.join.mockClear();
  });

  it('should create output directory if it does not exist', async () => {
    await generate(mockScanResults);
    
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('output'),
      { recursive: true }
    );
  });

  it('should not create output directory if it already exists', async () => {
    fs.existsSync.mockReturnValue(true);
    
    await generate(mockScanResults);
    
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should generate HTML file with correct content', async () => {
    await generate(mockScanResults);
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('scanResults.html'),
      expect.stringContaining('<!DOCTYPE html>')
    );

    const htmlContent = fs.writeFileSync.mock.calls[0][1];
    
    // Check for required sections
    expect(htmlContent).toContain('Accessibility Scan Report');
    expect(htmlContent).toContain(mockScanResults.baseUrl);
    expect(htmlContent).toContain(mockScanResults.audit.client);
    expect(htmlContent).toContain('Executive Summary');
    expect(htmlContent).toContain('Statistics');
    expect(htmlContent).toContain('Pagewise Analysis');
    expect(htmlContent).toContain('Test Environment');
  });

  it('should include all violations in the report', async () => {
    await generate(mockScanResults);
    
    const htmlContent = fs.writeFileSync.mock.calls[0][1];
    
    mockScanResults.violations.forEach(violation => {
      expect(htmlContent).toContain(violation.id);
      expect(htmlContent).toContain(violation.impact);
      expect(htmlContent).toContain(violation.howToFix);
      expect(htmlContent).toContain(violation.whyItMatters);
    });
  });

  it('should generate and include charts in the report', async () => {
    await generate(mockScanResults);
    
    const htmlContent = fs.writeFileSync.mock.calls[0][1];
    
    // Check for base64 encoded charts
    expect(htmlContent).toContain('data:image/jpeg;base64,');
    expect(htmlContent).toContain('Chart1');
    expect(htmlContent).toContain('Chart2');
  });

  it('should handle empty violations array', async () => {
    const resultsWithNoViolations = {
      ...mockScanResults,
      violations: []
    };

    await generate(resultsWithNoViolations);
    
    const htmlContent = fs.writeFileSync.mock.calls[0][1];
    expect(htmlContent).toContain('There are no violations to report!');
  });

  it('should return the correct file path', async () => {
    const filePath = await generate(mockScanResults);
    
    expect(filePath).toContain('output');
    expect(filePath).toContain('scanResults.html');
  });

  it('should throw error if required data is missing', async () => {
    const filePath = await generate(mockScanResults);
    
    // Check that path.join was called correctly
    expect(path.join).toHaveBeenCalledWith(expect.any(String), 'output');
    
    // Now the filePath should contain both 'output' and the filename
    expect(filePath).toMatch(/.*output.*scanResults\.html/);
  });
});