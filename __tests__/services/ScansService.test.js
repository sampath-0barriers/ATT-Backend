const ScansService = require('../../src/services/ScansService');
const ScansRepo = require('../../src/repository/ScansRepo');
const DeviceConfigRepo = require('../../src/repository/DeviceConfigRepo');
const UserRepo = require('../../src/repository/UserRepo');
const helper = require('../../src/services/ScanServiceHelpers');
const puppeteer = require('puppeteer');

jest.mock('../../src/repository/ScansRepo');
jest.mock('../../src/repository/DeviceConfigRepo');
jest.mock('../../src/repository/UserRepo');
jest.mock('../../src/services/ScanServiceHelpers');
jest.mock('puppeteer');

describe('ScansService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScan', () => {
    it('should create a scan request and log URLs correctly', async () => {
      helper.extractBaseUrl.mockReturnValue('https://example.com');
      helper.isSameDomain.mockReturnValue(true);
      helper.countSlashes.mockReturnValue(2);
      helper.getWebsiteContent.mockResolvedValue('<html><a href="/page"></a></html>');
      helper.extractChildURLs.mockReturnValue(['https://example.com/page']);
      ScansRepo.createScanRequest.mockResolvedValue({ _id: '12345' });

      const result = await ScansService.createScan(
        'https://example.com',
        'wcag',
        2,
        'default',
        [],
        'Test Scan',
        'project1',
        'user1'
      );

      expect(helper.extractBaseUrl).toHaveBeenCalledWith('https://example.com');
      expect(helper.getWebsiteContent).toHaveBeenCalledWith('https://example.com');
      expect(helper.extractChildURLs).toHaveBeenCalledWith('<html><a href="/page"></a></html>', 'https://example.com');
      expect(ScansRepo.createScanRequest).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: '12345' });
    });
  });

  describe('getResults', () => {
    it('should return scan results for a given scan request ID', async () => {
      const mockResults = [{ id: 'result1' }, { id: 'result2' }];
      ScansRepo.getScanResults.mockResolvedValue(mockResults);

      const result = await ScansService.getResults('12345');

      expect(ScansRepo.getScanResults).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockResults);
    });
  });

  describe('calculateAccessibilityScore', () => {
    it('should calculate the accessibility score', async () => {
      const mockResults = {
        violations: [{ id: 'violation1' }],
        passes: [{ id: 'pass1' }, { id: 'pass2' }],
      };

      const score = await ScansService.calculateAccessibilityScore(mockResults);

      expect(score).toBe(66.67);
    });

    it('should return 100 when there are no violations or passes', async () => {
      const mockResults = { violations: [], passes: [] };

      const score = await ScansService.calculateAccessibilityScore(mockResults);

      expect(score).toBe(100);
    });
  });

  describe('getUrls', () => {
    it('should return flattened URLs for a given scan request ID', async () => {
      const mockURLs = [{ scanned_urls: ['url1', 'url2'] }, { scanned_urls: ['url3'] }];
      ScansRepo.getURLs.mockResolvedValue(mockURLs);

      const result = await ScansService.getUrls('12345');

      expect(ScansRepo.getURLs).toHaveBeenCalledWith('12345');
      expect(result).toEqual(['url1', 'url2', 'url3']);
    });
  });

  describe('scheduleScan', () => {
    it('should schedule a scan successfully', async () => {
      ScansRepo.scheduleScan.mockResolvedValue(true);

      const result = await ScansService.scheduleScan('2024-12-01T12:00:00Z', '12345');

      expect(ScansRepo.scheduleScan).toHaveBeenCalledWith('12345', expect.stringContaining('2024-12-01T12:00:00Z'));
      expect(result).toContain('Scan request with ID 12345 scheduled successfully.');
    });
  });
});
