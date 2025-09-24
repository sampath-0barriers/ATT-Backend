const {
    register,
    registerClient,
    approve,
    edit,
    deleteUser,
    getAll,
    getUsername
  } = require('../../src/controllers/UserController');
  
  const UserService = require('../../src/services/UserService');
  
  jest.mock('../../src/services/UserService');
  
  describe('User Controller Tests', () => {
    let mockRequest, mockResponse;
  
    beforeEach(() => {
      mockRequest = {};
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        sendStatus: jest.fn(),
      };
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    describe('register', () => {
      it('should respond with 400 if required fields are missing', async () => {
        mockRequest.body = { username: '', email: '', password: '' };
        await register(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith(
          'First Name, Last Name, Username, Email, and Password are required.'
        );
      });
  
      it('should respond with 401 if password is weak', async () => {
        mockRequest.body = { first_name: 'John', last_name: 'Doe', username: 'johndoe', email: 'john@example.com', password: 'weak' };
        await register(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalled();
      });
  
      it('should respond with appropriate error if username already exists', async () => {
        mockRequest.body = {
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
          password: 'Strong@123',
        };
        UserService.register.mockResolvedValue('username');
        await register(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(408);
        expect(mockResponse.send).toHaveBeenCalledWith(
          'A user with that username already exists.'
        );
      });
  
      it('should respond with 201 when registration is successful', async () => {
        mockRequest.body = {
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
          password: 'Strong@123',
        };
        UserService.register.mockResolvedValue(1);
        await register(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.send).toHaveBeenCalledWith('User created successfully with id: 1');
      });
    });
  
    describe('registerClient', () => {
      it('should respond with 400 if required fields are missing', async () => {
        mockRequest.body = { first_name: '', last_name: '', email: '', role: '', is_active: '' };
        await registerClient(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith('User properties are invalid');
      });
  
      it('should respond with 201 when client registration is successful', async () => {
        mockRequest.body = {
          first_name: 'Client',
          last_name: 'One',
          username: 'client1',
          email: 'client@example.com',
          role: 'user',
          is_active: true,
        };
        UserService.registerClient.mockResolvedValue(2);
        await registerClient(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.send).toHaveBeenCalledWith('User created successfully with id: 2');
      });
    });
  
    describe('approve', () => {
      it('should respond with 403 if user is not an admin', async () => {
        mockRequest.user = { username: 'notadmin' };
        UserService.getByUsername.mockResolvedValue({ admin: false });
        await approve(mockRequest, mockResponse);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      });
  
      it('should respond with 200 when user is approved successfully', async () => {
        mockRequest.user = { username: 'admin' };
        mockRequest.body = { username: 'user_to_approve' };
        UserService.getByUsername.mockResolvedValue({ admin: true });
        UserService.approve.mockResolvedValue(true);
        await approve(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith('User approved successfully.');
      });
    });
  
    describe('edit', () => {
      it('should respond with 403 if non-admin attempts to edit another user', async () => {
        mockRequest.user = { username: 'user1' };
        mockRequest.body = { username: 'user2' };
        UserService.getByUsername.mockResolvedValue({ username: 'user1', admin: false });
        await edit(mockRequest, mockResponse);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      });
    });
  
    describe('deleteUser', () => {
      it('should respond with 403 if requester is not an admin', async () => {
        mockRequest.user = { username: 'user' };
        UserService.getByUsername.mockResolvedValue({ admin: false });
        await deleteUser(mockRequest, mockResponse);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      });
  
      it('should respond with 404 if user to delete does not exist', async () => {
        mockRequest.user = { username: 'admin' };
        mockRequest.body = { username: 'nonexistent' };
        UserService.getByUsername.mockResolvedValueOnce({ username: 'admin', admin: true });
        UserService.getByUsername.mockResolvedValueOnce(null);
        await deleteUser(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.send).toHaveBeenCalledWith('User does not exist.');
      });
    });
  
    describe('getAll', () => {
      it('should respond with 403 if requester is not an admin', async () => {
        mockRequest.user = { username: 'user' };
        UserService.getByUsername.mockResolvedValue({ admin: false });
        await getAll(mockRequest, mockResponse);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      });
  
      it('should return paginated users if requester is an admin', async () => {
        mockRequest.user = { username: 'admin' };
        mockRequest.query = { page: 1, limit: 10 };
        UserService.getByUsername.mockResolvedValue({ admin: true });
        UserService.getAll.mockResolvedValue({
          users: [{ id: 1, name: 'User 1' }],
          total: 10,
        });
        await getAll(mockRequest, mockResponse);
        expect(mockResponse.json).toHaveBeenCalledWith({
          users: [{ id: 1, name: 'User 1' }],
          total: 10,
          totalPages: 1,
          currentPage: 1,
        });
      });
    });
  
    describe('getUsername', () => {
      it('should respond with 404 if user is not found', async () => {
        mockRequest.user = { username: 'nonexistent' };
        UserService.getByUsername.mockResolvedValue(null);
        await getUsername(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.send).toHaveBeenCalledWith('User not found.');
      });
  
      it('should return user details if user exists', async () => {
        mockRequest.user = { username: 'existinguser' };
        UserService.getByUsername.mockResolvedValue({ id: 1, username: 'existinguser' });
        await getUsername(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ id: 1, username: 'existinguser' });
      });
    });
  });
  