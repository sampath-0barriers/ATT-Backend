const { generateReport } = require('../../src/controllers/ReportsController');
const ReportsService = require('../../src/services/ReportService');
const fs = require('fs');

// Mocks
jest.mock('../../src/services/ReportService', () => ({
  generateReport: jest.fn(),
}));
jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn(),
  }),
}));

describe('generateReport', () => {
  let mockRequest;
  let mockResponse;
  let responseSendSpy;
  let responseStatusSpy;
  let setHeaderSpy;

  beforeEach(() => {
    mockRequest = {
      params: { scanRequestId: '123' },
      query: {},
      user: { username: 'testuser' }, // Added missing user object
    };
    mockResponse = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      pipe: jest.fn(),  // Add pipe method if needed
    };
    responseSendSpy = jest.spyOn(mockResponse, 'send');
    responseStatusSpy = jest.spyOn(mockResponse, 'status');
    setHeaderSpy = jest.spyOn(mockResponse, 'setHeader');
    jest.clearAllMocks();
  });

  it('should require a scanRequestId', async () => {
    mockRequest.params.scanRequestId = undefined;
    await generateReport(mockRequest, mockResponse);
    expect(responseStatusSpy).toHaveBeenCalledWith(400);
    expect(responseSendSpy).toHaveBeenCalledWith('Please provide a scanRequestId.');
  });

  it('should handle CSV format correctly', async () => {
    const fakeFilePath = 'path/to/report.csv';
    ReportsService.generateReport.mockResolvedValue(fakeFilePath);
    mockRequest.query.format = 'csv';

    await generateReport(mockRequest, mockResponse);

    expect(ReportsService.generateReport).toHaveBeenCalledWith(
        '123',
        'csv',
        'testuser'
    );
    expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(setHeaderSpy).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-123.csv'
    );
    expect(fs.createReadStream).toHaveBeenCalledWith(fakeFilePath);
  });

  it('should handle PDF format correctly', async () => {
    const fakeFilePath = 'path/to/report.pdf';
    ReportsService.generateReport.mockResolvedValue(fakeFilePath);
    mockRequest.query.format = 'pdf';

    await generateReport(mockRequest, mockResponse);

    expect(ReportsService.generateReport).toHaveBeenCalledWith(
        '123',
        'pdf',
        'testuser'
    );
    expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(setHeaderSpy).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-123.pdf'
    );
    expect(fs.createReadStream).toHaveBeenCalledWith(fakeFilePath);
  });

  it('should handle unsupported formats by sending a 400 status', async () => {
    mockRequest.query.format = 'unsupported_format';
    await generateReport(mockRequest, mockResponse);
    expect(responseStatusSpy).toHaveBeenCalledWith(400);
    expect(responseSendSpy).toHaveBeenCalledWith('Unsupported report format.');
  });

  it('should handle HTML format correctly', async () => {
    const fakeFilePath = 'path/to/report.html';
    ReportsService.generateReport.mockResolvedValue(fakeFilePath);
    mockRequest.query.format = 'html';

    await generateReport(mockRequest, mockResponse);

    expect(ReportsService.generateReport).toHaveBeenCalledWith(
        '123',
        'html',
        'testuser'
    );
    expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(setHeaderSpy).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-123.html'
    );
    expect(fs.createReadStream).toHaveBeenCalledWith(fakeFilePath);
  });

  it('should handle errors during report generation', async () => {
    ReportsService.generateReport.mockRejectedValue(new Error('Test error'));
    await generateReport(mockRequest, mockResponse);
    expect(responseStatusSpy).toHaveBeenCalledWith(500);
    expect(responseSendSpy).toHaveBeenCalledWith('Error generating report.');
  });
});