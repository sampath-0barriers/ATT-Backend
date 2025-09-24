const { getDeviceConfigs } = require('../../src/services/DeviceService');
const DeviceRepo = require('../../src/repository/DeviceConfigRepo');

jest.mock('../../src/repository/DeviceConfigRepo');

describe('DeviceService - getDeviceConfigs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return sanitized device config names when repository resolves successfully', async () => {
    const mockDeviceConfigs = [
      { name: 'Device A', id: 1 },
      { name: 'Device B', id: 2 },
      { name: 'Device C', id: 3 },
    ];
    DeviceRepo.getDeviceConfigs.mockResolvedValue(mockDeviceConfigs);

    const result = await getDeviceConfigs();

    expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['Device A', 'Device B', 'Device C']);
  });

  it('should handle an empty repository response gracefully', async () => {
    DeviceRepo.getDeviceConfigs.mockResolvedValue([]);

    const result = await getDeviceConfigs();

    expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should throw an error if repository throws an error', async () => {
    const mockError = new Error('Repository Error');
    DeviceRepo.getDeviceConfigs.mockRejectedValue(mockError);

    await expect(getDeviceConfigs()).rejects.toThrow('Repository Error');
    expect(DeviceRepo.getDeviceConfigs).toHaveBeenCalledTimes(1);
  });

  it('should log the sanitized results', async () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockDeviceConfigs = [
      { name: 'Device X' },
      { name: 'Device Y' },
    ];
    DeviceRepo.getDeviceConfigs.mockResolvedValue(mockDeviceConfigs);

    await getDeviceConfigs();

    expect(mockConsoleLog).toHaveBeenCalledWith(['Device X', 'Device Y']);
    mockConsoleLog.mockRestore();
  });
});
