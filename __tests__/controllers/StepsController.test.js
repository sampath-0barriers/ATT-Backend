const { getSteps } = require('../../src/controllers/StepsController');
const ScansSteps = require('../../src/services/ScansSteps');

jest.mock('../../src/services/ScansSteps');

describe('getSteps', () => {
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

  it('should return steps when ScansSteps resolves successfully', async () => {
    const mockSteps = [{ step: 'scan' }, { step: 'process' }];
    ScansSteps.getSteps.mockResolvedValue(mockSteps);

    await getSteps(mockRequest, mockResponse);

    expect(ScansSteps.getSteps).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({ steps: mockSteps });
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should handle errors and respond with status 500', async () => {
    const mockError = new Error('Service Failure');
    ScansSteps.getSteps.mockRejectedValue(mockError);

    await getSteps(mockRequest, mockResponse);

    expect(ScansSteps.getSteps).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should call ScansSteps.getSteps once per request', async () => {
    const mockSteps = [{ step: 'validate' }];
    ScansSteps.getSteps.mockResolvedValue(mockSteps);

    await getSteps(mockRequest, mockResponse);
    await getSteps(mockRequest, mockResponse);

    expect(ScansSteps.getSteps).toHaveBeenCalledTimes(2);
    expect(mockResponse.json).toHaveBeenCalledWith({ steps: mockSteps });
  });

  it('should not respond with json when an error occurs', async () => {
    const mockError = new Error('Unexpected Failure');
    ScansSteps.getSteps.mockRejectedValue(mockError);

    await getSteps(mockRequest, mockResponse);

    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should handle mixed responses in sequential calls', async () => {
    const mockSteps = [{ step: 'finalize' }];
    const mockError = new Error('Failure during steps retrieval');
    ScansSteps.getSteps
      .mockResolvedValueOnce(mockSteps)
      .mockRejectedValueOnce(mockError);

    await getSteps(mockRequest, mockResponse);
    expect(ScansSteps.getSteps).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({ steps: mockSteps });
    expect(mockResponse.status).not.toHaveBeenCalled();

    jest.clearAllMocks();

    await getSteps(mockRequest, mockResponse);
    expect(ScansSteps.getSteps).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
