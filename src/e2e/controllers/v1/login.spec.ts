import request from 'supertest';
import TestDb from '../../../utils/testDb';
import { RefreshToken } from '../../../models';

describe('login controller', () => {
  const testDb = new TestDb();
  const app = testDb.getApp();
  let newUserResponse: request.Response;

  const userData = {
    email: 'test@test.com',
    password: 'test123',
  };

  beforeAll(async () => {
    await testDb.start();
  });

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.sync();
    newUserResponse = await testDb.registerUser(userData);
  });

  test('should login successfully when provided with valid credentials', async () => {
    const response = await request(app)
      .post('/v1/login')
      .send(userData)
      .expect(200);

    const {
      success,
      message,
      data: { accessToken, refreshToken },
    } = response.body;

    const refreshTokenFound = await RefreshToken.findOne({
      where: { token: refreshToken },
    });

    expect(success).toBeTruthy();
    expect(message).toBe('Successfully logged in');
    expect(refreshTokenFound?.getDataValue('token')).toBeDefined();
    expect(refreshTokenFound?.getDataValue('token')).toEqual(refreshToken);
  });

  test('should return 401 if the user is not found', async () => {
    const response = await request(app)
      .post('/v1/login')
      .send({ email: 'invalid@user.com', password: 'anything' })
      .expect(401);

    const { success, message } = response.body;

    expect(success).toBeFalsy();
    expect(message).toBe('Invalid credentials');
  });

  test('should return 401 when provided with invalid password', async () => {
    const response = await request(app)
      .post('/v1/login')
      .send({ ...userData, password: 'invalid' })
      .expect(401);

    const { success, message } = response.body;

    expect(success).toBeFalsy();
    expect(message).toBe('Invalid credentials');
  });

  test('should return the same refresh token is the user is already logged in', async () => {
    const response = await request(app)
      .post('/v1/login')
      .send(userData)
      .expect(200);

    const {
      success,
      message,
      data: { accessToken, refreshToken },
    } = response.body;

    expect(refreshToken).toEqual(newUserResponse.body.data.refreshToken);
  });
});
