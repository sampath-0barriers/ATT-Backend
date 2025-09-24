const ProjectService = require('../../src/services/ProjectService');
const ProjectRepo = require('../../src/repository/ProjectRepo');
const UserService = require('../../src/services/UserService');

jest.mock('../../src/repository/ProjectRepo');
jest.mock('../../src/services/UserService');

describe('ProjectService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return paginated projects with user details', async () => {
      const mockProjects = [
        {
          _id: 'project1',
          name: 'Project One',
          users: ['user1', 'user2'],
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockUsers = [
        { _id: 'user1', username: 'userOne' },
        { _id: 'user2', username: 'userTwo' },
      ];

      ProjectRepo.getAll.mockResolvedValue(mockProjects);
      ProjectRepo.getTotalCount.mockResolvedValue(1);
      UserService.getByUserId
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1]);

      const result = await ProjectService.getAll(1, 10);

      expect(ProjectRepo.getAll).toHaveBeenCalledWith(10, 0);
      expect(UserService.getByUserId).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        projectsWithUsernames: [
          {
            _id: 'project1',
            name: 'Project One',
            users: [
              { id: 'user1', username: 'userOne' },
              { id: 'user2', username: 'userTwo' },
            ],
            active: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      });
    });
  });

  describe('getProjectById', () => {
    it('should return a project by ID', async () => {
      const mockProject = { _id: 'project1', name: 'Project One' };
      ProjectRepo.getAllByID.mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectById('project1');

      expect(ProjectRepo.getAllByID).toHaveBeenCalledWith('project1');
      expect(result).toEqual(mockProject);
    });

    it('should return null if no project is found', async () => {
      ProjectRepo.getAllByID.mockResolvedValue(null);

      const result = await ProjectService.getProjectById('project1');

      expect(ProjectRepo.getAllByID).toHaveBeenCalledWith('project1');
      expect(result).toBeNull();
    });
  });

  describe('getAllUsersByProjectId', () => {
    it('should return user IDs for a given project', async () => {
      const mockProject = { users: ['user1', 'user2'] };
      ProjectRepo.getAllByID.mockResolvedValue(mockProject);

      const result = await ProjectService.getAllUsersByProjectId('project1');

      expect(ProjectRepo.getAllByID).toHaveBeenCalledWith('project1');
      expect(result).toEqual(['user1', 'user2']);
    });

    it('should return an empty array if no users are associated with the project', async () => {
      ProjectRepo.getAllByID.mockResolvedValue({ users: [] });

      const result = await ProjectService.getAllUsersByProjectId('project1');

      expect(ProjectRepo.getAllByID).toHaveBeenCalledWith('project1');
      expect(result).toEqual([]);
    });
  });

  describe('getAllByUser', () => {
    it('should return paginated projects for a given user', async () => {
      const mockProjects = [
        {
          _id: 'project1',
          name: 'Project One',
          users: ['user1', 'user2'],
        },
      ];

      const mockUsers = [
        { _id: 'user1', username: 'userOne' },
        { _id: 'user2', username: 'userTwo' },
      ];

      UserService.getByUsername.mockResolvedValue({ _id: 'user1' });
      ProjectRepo.getProjectsByUser.mockResolvedValue(mockProjects);
      ProjectRepo.getTotalCountByUser.mockResolvedValue(1);
      UserService.getByUserId
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1]);

      const result = await ProjectService.getAllByUser('userOne', 1, 10);

      expect(UserService.getByUsername).toHaveBeenCalledWith('userOne');
      expect(ProjectRepo.getProjectsByUser).toHaveBeenCalledWith('user1', 10, 0);
      expect(result).toEqual({
        projectsWithUsernames: [
          {
            _id: 'project1',
            name: 'Project One',
            users: [
              { id: 'user1', username: 'userOne' },
              { id: 'user2', username: 'userTwo' },
            ],
          },
        ],
        total: 1,
      });
    });

    it('should return an empty list if the user does not exist', async () => {
      UserService.getByUsername.mockResolvedValue(null);

      const result = await ProjectService.getAllByUser('unknownUser', 1, 10);

      expect(UserService.getByUsername).toHaveBeenCalledWith('unknownUser');
      expect(result).toEqual({ projects: [], total: 0 });
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const mockProject = {
        name: 'New Project',
        users: ['user1'],
        active: true,
      };

      ProjectRepo.getProjectByName.mockResolvedValue(null);
      ProjectRepo.create.mockResolvedValue('project1');

      const result = await ProjectService.create(mockProject);

      expect(ProjectRepo.getProjectByName).toHaveBeenCalledWith('New Project');
      expect(ProjectRepo.create).toHaveBeenCalledWith(mockProject);
      expect(result).toBe('project1');
    });

    it('should return null if a project with the same name already exists', async () => {
      const mockProject = {
        name: 'Existing Project',
        users: ['user1'],
        active: true,
      };

      ProjectRepo.getProjectByName.mockResolvedValue(mockProject);

      const result = await ProjectService.create(mockProject);

      expect(ProjectRepo.getProjectByName).toHaveBeenCalledWith('Existing Project');
      expect(result).toBeNull();
    });
  });

  describe('edit', () => {
    it('should edit a project successfully', async () => {
      const mockProject = { name: 'Updated Project', users: ['user1'] };
      ProjectRepo.edit.mockResolvedValue(1);

      const result = await ProjectService.edit(mockProject);

      expect(ProjectRepo.edit).toHaveBeenCalledWith(mockProject);
      expect(result).toBe(1);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project by ID', async () => {
      ProjectRepo.deleteProject.mockResolvedValue(1);

      const result = await ProjectService.deleteProject('project1');

      expect(ProjectRepo.deleteProject).toHaveBeenCalledWith('project1');
      expect(result).toBe(1);
    });
  });
});
