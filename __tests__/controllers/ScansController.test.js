const ScansController = require('../../src/controllers/ScansController');
const ScansService = require('../../src/services/ScansService');
const ScanRepo = require('../../src/repository/ScansRepo');

jest.mock('../../src/services/ScansService');
jest.mock('../../src/repository/ScansRepo');

describe('ScansController', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
            user: { username: 'testuser' }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    describe('createScan', () => {
        it('should create a scan successfully', async () => {
            mockRequest.body = {
                scan_url: 'https://example.com',
                guidance: 'WCAG2.1',
                depth: 2,
                device_config: {},
                steps: [],
                name: 'Test Scan',
                projectID: '123'
            };

            ScansService.createScan.mockResolvedValue('scan123');

            await ScansController.createScan(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({ request_id: 'scan123' });
        });

        it('should return 400 if required fields are missing', async () => {
            mockRequest.body = {};

            await ScansController.createScan(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getResults', () => {
        it('should get scan results successfully', async () => {
            mockRequest.query.scanRequestId = 'scan123';
            const mockResults = { data: 'test results' };

            ScansService.getResults.mockResolvedValue(mockResults);

            await ScansController.getResults(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(mockResults);
        });

        it('should return 400 if scanRequestId is missing', async () => {
            await ScansController.getResults(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
});