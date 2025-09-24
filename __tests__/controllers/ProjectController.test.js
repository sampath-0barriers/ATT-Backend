const ProjectController = require('../../src/controllers/ProjectController');
const ProjectService = require('../../src/services/ProjectService');
const UserService = require('../../src/services/UserService');

jest.mock('../../src/services/ProjectService');
jest.mock('../../src/services/UserService');

describe('ProjectController', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock request
        mockRequest = {
            user: { username: 'testuser' },
            query: {},
            body: {}
        };

        // Setup mock response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    describe('getAll', () => {
        it('should return 400 if page or limit is less than 1', async () => {
            mockRequest.query = { page: '0', limit: '0' };

            await ProjectController.getAll(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.send).toHaveBeenCalledWith('Page and limit must be positive integers.');
        });

        it('should return projects for admin user', async () => {
            mockRequest.query = { page: '1', limit: '10' };
            const mockAdminUser = { username: 'admin', admin: true };
            const mockProjects = {
                projectsWithUsernames: [{ name: 'Project 1' }],
                total: 1
            };

            UserService.getByUsername.mockResolvedValue(mockAdminUser);
            ProjectService.getAll.mockResolvedValue(mockProjects);

            await ProjectController.getAll(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                projects: mockProjects.projectsWithUsernames,
                total: mockProjects.total,
                totalPages: 1,
                currentPage: 1
            });
        });

        it('should return projects for non-admin user', async () => {
            mockRequest.query = { page: '1', limit: '10' };
            const mockUser = { username: 'user', admin: false };
            const mockProjects = {
                projectsWithUsernames: [{ name: 'Project 1' }],
                total: 1
            };

            UserService.getByUsername.mockResolvedValue(mockUser);
            ProjectService.getAllByUser.mockResolvedValue(mockProjects);

            await ProjectController.getAll(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                projects: mockProjects.projectsWithUsernames,
                total: mockProjects.total,
                totalPages: 1,
                currentPage: 1
            });
        });
    });

    describe('create', () => {
        it('should return 403 if user is not admin', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: false });

            await ProjectController.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'You must be an admin to create a project.'
            });
        });

        it('should return 400 if project data is invalid', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: true });
            mockRequest.body = { name: '', users: [] };

            await ProjectController.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'One or more project properties is invalid.'
            });
        });

        it('should create project successfully', async () => {
            const mockProject = {
                name: 'Test Project',
                users: ['user1'],
                active: true
            };
            mockRequest.body = mockProject;

            UserService.getByUsername.mockResolvedValue({ admin: true });
            UserService.getByUserId.mockResolvedValue({ username: 'user1' });
            ProjectService.create.mockResolvedValue('new-project-id');

            await ProjectController.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Project created successfully.',
                projectId: 'new-project-id'
            });
        });
    });

    describe('edit', () => {
        it('should return 403 if user is not admin', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: 'false' });

            await ProjectController.edit(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
        });

        it('should return 400 if project data is invalid', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: true });
            mockRequest.body = {};

            await ProjectController.edit(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should edit project successfully', async () => {
            const mockProject = {
                id: 'project1',
                name: 'Updated Project',
                users: ['user1'],
                active: true
            };
            mockRequest.body = mockProject;

            UserService.getByUsername.mockResolvedValue({ admin: true });
            UserService.getByUserId.mockResolvedValue({ username: 'user1' });
            ProjectService.edit.mockResolvedValue(1);

            await ProjectController.edit(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('deleteProject', () => {
        it('should return 403 if user is not admin', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: false });

            await ProjectController.deleteProject(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
        });

        it('should return 400 if projectId is missing', async () => {
            UserService.getByUsername.mockResolvedValue({ admin: true });

            await ProjectController.deleteProject(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should delete project successfully', async () => {
            mockRequest.body.projectId = 'project1';
            UserService.getByUsername.mockResolvedValue({ admin: true });
            ProjectService.deleteProject.mockResolvedValue(1);

            await ProjectController.deleteProject(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getProjectById', () => {
        it('should return 404 if project not found', async () => {
            mockRequest.query.id = 'nonexistent';
            ProjectService.getProjectById.mockResolvedValue(null);

            await ProjectController.getProjectById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('should return project details successfully', async () => {
            mockRequest.query.id = 'project1';
            const mockProject = {
                name: 'Test Project',
                users: ['user1'],
                active: true
            };

            ProjectService.getProjectById.mockResolvedValue(mockProject);
            UserService.getByUserId.mockResolvedValue({ username: 'user1' });

            await ProjectController.getProjectById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                name: mockProject.name,
                users: ['user1'],
                active: mockProject.active
            });
        });
    });
});