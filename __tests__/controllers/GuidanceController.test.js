const { getGuidanceLevels } = require('../../src/controllers/GuidanceController');
const GuidanceService = require('../../src/services/GuidanceService');

jest.mock('../../src/services/GuidanceService');

describe('getGuidanceLevels', () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return guidance levels when GuidanceService resolves successfully', async () => {
    const mockGuidanceLevels = [{ level: 'low' }, { level: 'high' }];
    GuidanceService.getGuidanceLevels.mockResolvedValue(mockGuidanceLevels);

    await getGuidanceLevels(mockRequest, mockResponse);

    expect(GuidanceService.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({
      guidance_levels: mockGuidanceLevels,
    });
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should handle errors and respond with status 500', async () => {
    const mockError = new Error('Service Failure');
    GuidanceService.getGuidanceLevels.mockRejectedValue(mockError);

    await getGuidanceLevels(mockRequest, mockResponse);

    expect(GuidanceService.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle multiple calls and responses independently', async () => {
    const mockGuidanceLevels = [{ level: 'medium' }];
    const mockError = new Error('Another Failure');
    GuidanceService.getGuidanceLevels
      .mockResolvedValueOnce(mockGuidanceLevels)
      .mockRejectedValueOnce(mockError);

    await getGuidanceLevels(mockRequest, mockResponse);
    expect(GuidanceService.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({
      guidance_levels: mockGuidanceLevels,
    });
    expect(mockResponse.status).not.toHaveBeenCalled();

    jest.clearAllMocks();

    await getGuidanceLevels(mockRequest, mockResponse);
    expect(GuidanceService.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should not call response.json on error', async () => {
    const mockError = new Error('Unexpected Error');
    GuidanceService.getGuidanceLevels.mockRejectedValue(mockError);

    await getGuidanceLevels(mockRequest, mockResponse);

    expect(GuidanceService.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
