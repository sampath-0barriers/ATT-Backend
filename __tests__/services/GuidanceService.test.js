const { getGuidanceLevels } = require('../../src/services/GuidanceService');
const GuidanceRepo = require('../../src/repository/GuidanceRepo');

jest.mock('../../src/repository/GuidanceRepo');

describe('GuidanceService - getGuidanceLevels', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of guidance levels when GuidanceRepo resolves successfully', async () => {
    const mockGuidanceLevels = [
      { level: 'Beginner' },
      { level: 'Intermediate' },
      { level: 'Advanced' },
    ];
    GuidanceRepo.getGuidanceLevels.mockResolvedValue(mockGuidanceLevels);

    const result = await getGuidanceLevels();

    expect(GuidanceRepo.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['Beginner', 'Intermediate', 'Advanced']);
  });

  it('should return an empty array if GuidanceRepo returns no levels', async () => {
    GuidanceRepo.getGuidanceLevels.mockResolvedValue([]);

    const result = await getGuidanceLevels();

    expect(GuidanceRepo.getGuidanceLevels).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should throw an error if GuidanceRepo throws an error', async () => {
    const mockError = new Error('Repository Error');
    GuidanceRepo.getGuidanceLevels.mockRejectedValue(mockError);

    await expect(getGuidanceLevels()).rejects.toThrow('Repository Error');
    expect(GuidanceRepo.getGuidanceLevels).toHaveBeenCalledTimes(1);
  });
});
