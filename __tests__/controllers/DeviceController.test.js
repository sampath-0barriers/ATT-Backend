const { getDeviceConfigs } = require('../../src/controllers/DeviceController.js');
const DeviceRepo = require('../../src/services/DeviceService.js');

jest.mock('../../src/services/DeviceService.js');

describe('getDeviceConfigs', () => {
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

  it('should respond with device configurations when successful', async () => {
    const mockConfig = { key: 'value' };
    DeviceRepo.getDeviceConfigs.mockResolvedValue(mockConfig);

    await getDeviceConfigs(mockRequest, mockResponse);

    expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({ name: mockConfig });
  });

  it('should respond with status 500 on error', async () => {
    const mockError = new Error('Something went wrong');
    DeviceRepo.getDeviceConfigs.mockRejectedValue(mockError);

    await getDeviceConfigs(mockRequest, mockResponse);

    expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

    it('should handle multiple calls and responses independently', async () => {
        const mockConfig = { key: 'value' };
        const mockError = new Error('Another error');
        DeviceRepo.getDeviceConfigs
        .mockResolvedValueOnce(mockConfig)
        .mockRejectedValueOnce(mockError);
    
        await getDeviceConfigs(mockRequest, mockResponse);
        expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
        expect(mockResponse.json).toHaveBeenCalledWith({ name: mockConfig });
        expect(mockResponse.status).not.toHaveBeenCalled();
    
        jest.clearAllMocks();
    });
});
