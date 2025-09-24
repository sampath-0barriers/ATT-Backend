const UserService = require('../../src/services/UserService');
const UserRepo = require('../../src/repository/UserRepo');
const bcrypt = require('bcryptjs');

jest.mock('../../src/repository/UserRepo');
jest.mock('bcryptjs');

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return "username" if the username already exists', async () => {
      UserRepo.getByUsername.mockResolvedValue({ username: 'existingUser' });
      UserRepo.getByEmail.mockResolvedValue(null);

      const result = await UserService.register({
        username: 'existingUser',
        email: 'newemail@example.com',
        password: 'password123',
      });

      expect(UserRepo.getByUsername).toHaveBeenCalledWith('existingUser');
      expect(result).toBe('username');
    });

    it('should return "email" if the email already exists', async () => {
      UserRepo.getByUsername.mockResolvedValue(null);
      UserRepo.getByEmail.mockResolvedValue({ email: 'existingemail@example.com' });

      const result = await UserService.register({
        username: 'newuser',
        email: 'existingemail@example.com',
        password: 'password123',
      });

      expect(UserRepo.getByEmail).toHaveBeenCalledWith('existingemail@example.com');
      expect(result).toBe('email');
    });

    it('should create a new user if the username and email are unique', async () => {
      const mockUser = {
        username: 'newuser',
        email: 'newemail@example.com',
        password: 'hashedPassword',
      };

      UserRepo.getByUsername.mockResolvedValue(null);
      UserRepo.getByEmail.mockResolvedValue(null);
      bcrypt.hashSync.mockReturnValue('hashedPassword');
      UserRepo.create.mockResolvedValue(mockUser);

      const result = await UserService.register({
        username: 'newuser',
        email: 'newemail@example.com',
        password: 'password123',
      });

      expect(bcrypt.hashSync).toHaveBeenCalledWith('password123');
      expect(UserRepo.create).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('getByUsername', () => {
    it('should return a user by username', async () => {
      const mockUser = { username: 'existingUser', email: 'user@example.com' };
      UserRepo.getByUsername.mockResolvedValue(mockUser);

      const result = await UserService.getByUsername('existingUser');

      expect(UserRepo.getByUsername).toHaveBeenCalledWith('existingUser');
      expect(result).toEqual(mockUser);
    });

    it('should return null if no user is found', async () => {
      UserRepo.getByUsername.mockResolvedValue(null);

      const result = await UserService.getByUsername('nonexistentUser');

      expect(UserRepo.getByUsername).toHaveBeenCalledWith('nonexistentUser');
      expect(result).toBeNull();
    });
  });

  describe('approve', () => {
    it('should approve a user and return the modified count', async () => {
      UserRepo.approve_user.mockResolvedValue(1);

      const result = await UserService.approve('existingUser');

      expect(UserRepo.approve_user).toHaveBeenCalledWith('existingUser');
      expect(result).toBe(1);
    });

    it('should return null if no user is modified', async () => {
      UserRepo.approve_user.mockResolvedValue(0);

      const result = await UserService.approve('nonexistentUser');

      expect(UserRepo.approve_user).toHaveBeenCalledWith('nonexistentUser');
      expect(result).toBeNull();
    });
  });

  describe('edit', () => {
    it('should hash the password if provided and update the user', async () => {
      const mockUser = { username: 'existingUser', password: 'newPassword123' };
      bcrypt.hashSync.mockReturnValue('hashedPassword');
      UserRepo.edit_user.mockResolvedValue(mockUser);

      const result = await UserService.edit(mockUser);

      expect(bcrypt.hashSync).toHaveBeenCalledWith('newPassword123');
      expect(UserRepo.edit_user).toHaveBeenCalledWith({
        username: 'existingUser',
        password: 'hashedPassword',
      });
      expect(result).toEqual(mockUser);
    });

    it('should update the user without hashing the password if not provided', async () => {
      const mockUser = { username: 'existingUser' };
      UserRepo.edit_user.mockResolvedValue(mockUser);

      const result = await UserService.edit(mockUser);

      expect(bcrypt.hashSync).not.toHaveBeenCalled();
      expect(UserRepo.edit_user).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user by username', async () => {
      UserRepo.deleteUser.mockResolvedValue(true);

      const result = await UserService.deleteUser('existingUser');

      expect(UserRepo.deleteUser).toHaveBeenCalledWith('existingUser');
      expect(result).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return paginated users with total count', async () => {
      const mockUsers = [{ username: 'user1' }, { username: 'user2' }];
      UserRepo.getAll.mockResolvedValue(mockUsers);
      UserRepo.getTotalCount.mockResolvedValue(10);

      const result = await UserService.getAll(1, 2);

      expect(UserRepo.getAll).toHaveBeenCalledWith(2, 0);
      expect(UserRepo.getTotalCount).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ users: mockUsers, total: 10 });
    });
  });
});
