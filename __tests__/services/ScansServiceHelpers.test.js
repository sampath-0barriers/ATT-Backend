const {
    extractChildURLs,
    isSameDomain,
    getWebsiteContent,
    countSlashes,
    extractBaseUrl,
  } = require('../../src/utils/websiteUtils');
  const puppeteer = require('puppeteer');
  const cheerio = require('cheerio');
  
  jest.mock('puppeteer');
  
  describe('Website Utilities', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    describe('getWebsiteContent', () => {
      it('should fetch and return the website content', async () => {
        const mockContent = '<html><body><h1>Hello World</h1></body></html>';
        const mockPage = {
          goto: jest.fn(),
          content: jest.fn().mockResolvedValue(mockContent),
        };
        const mockBrowser = {
          newPage: jest.fn().mockResolvedValue(mockPage),
          close: jest.fn(),
        };
  
        puppeteer.launch.mockResolvedValue(mockBrowser);
  
        const result = await getWebsiteContent('https://example.com');
  
        expect(puppeteer.launch).toHaveBeenCalledTimes(1);
        expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
        expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
        expect(mockPage.content).toHaveBeenCalledTimes(1);
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockContent);
      });
    });
  
    describe('isSameDomain', () => {
      it('should return true for URLs in the same domain', () => {
        const baseDomain = 'https://example.com';
        const url = 'https://example.com/page';
  
        const result = isSameDomain(baseDomain, url);
  
        expect(result).toBe(true);
      });
  
      it('should return false for URLs in a different domain', () => {
        const baseDomain = 'https://example.com';
        const url = 'https://different.com/page';
  
        const result = isSameDomain(baseDomain, url);
  
        expect(result).toBe(false);
      });
    });
  
    describe('extractChildURLs', () => {
      it('should extract and return absolute child URLs', () => {
        const mockContent = `
          <html>
            <body>
              <a href="/page1">Page 1</a>
              <a href="https://example.com/page2">Page 2</a>
            </body>
          </html>`;
        const baseUrl = 'https://example.com';
  
        const result = extractChildURLs(mockContent, baseUrl);
  
        expect(result).toEqual([
          'https://example.com/page1',
          'https://example.com/page2',
        ]);
      });
  
      it('should return an empty array if no links are present', () => {
        const mockContent = '<html><body>No links here</body></html>';
        const baseUrl = 'https://example.com';
  
        const result = extractChildURLs(mockContent, baseUrl);
  
        expect(result).toEqual([]);
      });
    });
  
    describe('countSlashes', () => {
      it('should count the number of slashes in a string', () => {
        const str = 'https://example.com/page1/subpage';
  
        const result = countSlashes(str);
  
        expect(result).toBe(4);
      });
  
      it('should return 0 for a string with no slashes', () => {
        const str = 'noSlashesHere';
  
        const result = countSlashes(str);
  
        expect(result).toBe(0);
      });
    });
  
    describe('extractBaseUrl', () => {
      it('should extract the base URL from a full URL', () => {
        const fullUrl = 'https://example.com/page1/subpage';
  
        const result = extractBaseUrl(fullUrl);
  
        expect(result).toBe('https://example.com');
      });
  
      it('should handle URLs with ports correctly', () => {
        const fullUrl = 'http://localhost:3000/page1';
  
        const result = extractBaseUrl(fullUrl);
  
        expect(result).toBe('http://localhost:3000');
      });
    });
  });
  