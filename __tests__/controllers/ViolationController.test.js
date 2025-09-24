jest.mock('csv-parse');
jest.mock('fs');
jest.mock('util');
jest.mock('../../src/repository/ViolationDescriptionRepo');

const csv = require('csv-parse');
const fs = require('fs');
const { promisify } = require('util');
const {
    storeCustomDescriptions,
    applyCustomDescriptions,
    getCustomDescriptions: getDescriptions
} = require('../../src/repository/ViolationDescriptionRepo');

const {
    uploadViolationDescriptions,
    applyCustomViolationDescriptions,
    getCustomDescriptions
} = require('../../src/controllers/ViolationController');

describe('Violation Descriptions Controller', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
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
        // Reset all mocks
        jest.clearAllMocks();

        // Mock fs.promises.unlink
        promisify.mockReturnValue(jest.fn().mockResolvedValue(undefined));

        // Mock request object
        mockRequest = {
            file: {
                path: '/tmp/test.csv',
                mimetype: 'text/csv'
            },
            user: {
                username: 'testuser'
            }
        };

        // Mock response object
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {}
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('uploadViolationDescriptions', () => {
        it('should return 400 if no file is uploaded', async () => {
            mockRequest.file = null;

            await uploadViolationDescriptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'No file uploaded'
            });
        });

        it('should return 400 for invalid file type', async () => {
            mockRequest.file.mimetype = 'application/pdf';

            await uploadViolationDescriptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid file type. Please upload a CSV file.'
            });
        });

        it('should process valid CSV file successfully', async () => {
            // Mock file reading and parsing
            const mockFileContent = 'test content';
            const mockRecords = [
                { violation_id: '1', new_description: 'Test description 1' },
                { violation_id: '2', new_description: 'Test description 2' }
            ];

            promisify.mockImplementation((fn) => {
                if (fn === fs.readFile) return jest.fn().mockResolvedValue(mockFileContent);
                if (fn === csv.parse) return jest.fn().mockResolvedValue(mockRecords);
                return jest.fn().mockResolvedValue(undefined);
            });

            storeCustomDescriptions.mockResolvedValue(undefined);

            await uploadViolationDescriptions(mockRequest, mockResponse);

            expect(storeCustomDescriptions).toHaveBeenCalledWith('testuser', {
                '1': 'Test description 1',
                '2': 'Test description 2'
            });
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Violation descriptions updated successfully',
                updatedCount: 2
            });
        });

        it('should handle invalid CSV format', async () => {
            promisify.mockImplementation((fn) => {
                if (fn === fs.readFile) return jest.fn().mockResolvedValue('test content');
                if (fn === csv.parse) return jest.fn().mockRejectedValue(new Error('Parse error'));
                return jest.fn().mockResolvedValue(undefined);
            });

            await uploadViolationDescriptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid CSV format. Please check your file.'
            });
        });
    });

    describe('applyCustomViolationDescriptions', () => {
        it('should apply custom descriptions when scan results exist', async () => {
            const mockScanResults = { violations: [] };
            const mockUpdatedResults = { violations: [], customized: true };

            mockResponse.locals.scanResults = mockScanResults;
            applyCustomDescriptions.mockResolvedValue(mockUpdatedResults);

            await applyCustomViolationDescriptions(mockRequest, mockResponse, mockNext);

            expect(applyCustomDescriptions).toHaveBeenCalledWith(
                mockScanResults,
                'testuser'
            );
            expect(mockResponse.locals.scanResults).toBe(mockUpdatedResults);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should skip applying descriptions when no scan results exist', async () => {
            await applyCustomViolationDescriptions(mockRequest, mockResponse, mockNext);

            expect(applyCustomDescriptions).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors properly', async () => {
            mockResponse.locals.scanResults = { violations: [] };
            const testError = new Error('Test error');
            applyCustomDescriptions.mockRejectedValue(testError);

            await applyCustomViolationDescriptions(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalledWith(testError);
        });
    });

    describe('getCustomDescriptions', () => {
        it('should return custom descriptions successfully', async () => {
            const mockDescriptions = {
                '1': 'Custom description 1',
                '2': 'Custom description 2'
            };

            getDescriptions.mockResolvedValue(mockDescriptions);

            await getCustomDescriptions(mockRequest, mockResponse);

            expect(getDescriptions).toHaveBeenCalledWith('testuser');
            expect(mockResponse.json).toHaveBeenCalledWith(mockDescriptions);
        });

        it('should handle errors properly', async () => {
            getDescriptions.mockRejectedValue(new Error('Test error'));

            await getCustomDescriptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Failed to fetch custom descriptions'
            });
        });
    });
});