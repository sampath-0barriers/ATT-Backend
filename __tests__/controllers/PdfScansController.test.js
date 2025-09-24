jest.mock('../../src/services/PdfScansService', () => ({
    createPdfScan: jest.fn(),
    deletePdfScan: jest.fn(),
    getAllPdfScans: jest.fn(),
    getPdfScanById: jest.fn(),
    runPdfScan: jest.fn(),
    getScanResults: jest.fn(),
    getScanResultById: jest.fn()
}));

jest.mock('fs', () => ({
    promises: {
        unlink: jest.fn().mockResolvedValue(undefined)
    }
}));

const PdfScansController = require('../../src/controllers/PdfScansController');
const PdfScansService = require('../../src/services/PdfScansService');

describe('PdfScansController', () => {
    let mockRequest;
    let mockResponse;
    let originalConsoleError;
    let originalConsoleLog;

    beforeAll(() => {
        // Store original console methods
        originalConsoleError = console.error;
        originalConsoleLog = console.log;
        // Silence console
        console.error = jest.fn();
        console.log = jest.fn();
    });
    afterAll(() => {
        // Restore console methods
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            params: {},
            user: { username: 'testuser' },
            file: null
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        mockRequest = {
            params: {},
            user: { username: 'testuser' },
            file: null
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    describe('createPdfScan', () => {
        it('should return 400 if no file is uploaded', async () => {
            await PdfScansController.createPdfScan(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No PDF file uploaded' });
        });

        it('should create PDF scan successfully', async () => {
            // Mock the file upload
            mockRequest.file = {
                path: '/tmp/test.pdf',
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024
            };

            // Mock the service response
            const mockServiceResponse = { id: 'pdf123', status: 'created' };
            PdfScansService.createPdfScan.mockResolvedValue(mockServiceResponse);

            await PdfScansController.createPdfScan(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'PDF scan created successfully',
                ...mockServiceResponse
            });
        });

        it('should handle service errors', async () => {
            mockRequest.file = {
                path: '/tmp/test.pdf',
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024
            };

            PdfScansService.createPdfScan.mockRejectedValue(new Error('Service error'));

            await PdfScansController.createPdfScan(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to create PDF scan' });
        });
    });

    describe('getPdfScanById', () => {
        it('should return 400 if pdfScanId is missing', async () => {
            mockRequest.params.pdfScanId = ':pdfScanId';

            await PdfScansController.getPdfScanById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'pdfScanId is required' });
        });

        it('should get PDF scan successfully', async () => {
            mockRequest.params.pdfScanId = 'pdf123';
            const mockScan = { id: 'pdf123', status: 'completed' };

            PdfScansService.getPdfScanById.mockResolvedValue(mockScan);

            await PdfScansController.getPdfScanById(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(mockScan);
        });

        it('should handle not found error', async () => {
            mockRequest.params.pdfScanId = 'nonexistent';

            PdfScansService.getPdfScanById.mockRejectedValue(new Error('PDF scan not found'));

            await PdfScansController.getPdfScanById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'PDF scan not found' });
        });
    });

    describe('getAllPdfScans', () => {
        it('should get all PDF scans successfully', async () => {
            const mockScans = [
                { id: 'pdf123', status: 'completed' },
                { id: 'pdf456', status: 'pending' }
            ];

            PdfScansService.getAllPdfScans.mockResolvedValue(mockScans);

            await PdfScansController.getAllPdfScans(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(mockScans);
        });

        it('should handle service errors', async () => {
            PdfScansService.getAllPdfScans.mockRejectedValue(new Error('Service error'));

            await PdfScansController.getAllPdfScans(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch PDF scans' });
        });
    });
});