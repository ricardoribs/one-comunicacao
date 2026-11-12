const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.DATABASE_URL = '';
process.env.VERIFY_DATABASE_URL = '';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/calendar-integrations/google/callback';

const app = require('../src/app');
const userModel = require('../src/models/userModel');
const googleCalendarService = require('../src/services/googleCalendarService');
const mfaService = require('../src/services/mfaService');

let testIpCounter = 80;

function nextTestIp() {
  testIpCounter += 1;
  return `127.20.0.${testIpCounter}`;
}

async function createVerifiedUser(email) {
  return userModel.create({
    name: 'Calendar OAuth User',
    email,
    password: await bcrypt.hash('Valid@Test123', 12),
    role: 'gestor',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });
}

async function login(email) {
  const ipAddress = nextTestIp();
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', ipAddress);

  assert.equal(response.status, 200);
  if (response.body.accessToken) {
    return response.body.accessToken;
  }

  const challengeToken = response.body.challenge_token || response.body.challengeToken;
  assert.ok(challengeToken);

  if (response.body.mfa_enrollment_required || response.body.mfaEnrollmentRequired) {
    const setup = await request(app)
      .post('/api/auth/mfa/totp/setup')
      .set('X-Forwarded-For', ipAddress)
      .send({ challenge_token: challengeToken });
    assert.equal(setup.status, 200);
    assert.ok(setup.body.secret);

    const otp = mfaService.generateCurrentOtp(setup.body.secret);
    const enrolled = await request(app)
      .post('/api/auth/mfa/totp/enroll')
      .set('X-Forwarded-For', ipAddress)
      .send({ challenge_token: challengeToken, otp });
    assert.equal(enrolled.status, 200);
    assert.ok(enrolled.body.accessToken);
    return enrolled.body.accessToken;
  }

  const user = await userModel.findByEmail(email);
  assert.ok(user?.mfa_totp_secret_encrypted);
  const secret = mfaService.decryptSecret(user.mfa_totp_secret_encrypted);
  const otp = mfaService.generateCurrentOtp(secret);
  const verified = await request(app)
    .post('/api/auth/mfa/totp/verify')
    .set('X-Forwarded-For', ipAddress)
    .send({ challenge_token: challengeToken, otp });
  assert.equal(verified.status, 200);
  assert.ok(verified.body.accessToken);
  return verified.body.accessToken;
}

test('Google Calendar OAuth nao aceita token em query e consome state uma unica vez', async (t) => {
  const email = `calendar.oauth.${Date.now()}@example.test`;
  const user = await createVerifiedUser(email);
  const accessToken = await login(email);

  const originalExchange = googleCalendarService.exchangeCodeForTokens;
  googleCalendarService.exchangeCodeForTokens = async () => ({
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  t.after(async () => {
    googleCalendarService.exchangeCodeForTokens = originalExchange;
    await userModel.remove(user.id);
  });

  const legacyQueryAttempt = await request(app)
    .get('/api/calendar-integrations/google/auth')
    .query({ token: accessToken });
  assert.equal(legacyQueryAttempt.status, 401);

  const start = await request(app)
    .post('/api/calendar-integrations/google/auth')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({});
  assert.equal(start.status, 200);
  assert.match(start.body.auth_url, /^https:\/\/accounts\.google\.com\//);
  assert.equal(start.body.auth_url.includes(accessToken), false);

  const state = new URL(start.body.auth_url).searchParams.get('state');
  assert.ok(state);

  const callback = await request(app)
    .get('/api/calendar-integrations/google/callback')
    .query({ code: 'oauth-code', state });
  assert.equal(callback.status, 302);
  assert.match(callback.headers.location, /success=connected/);

  const replay = await request(app)
    .get('/api/calendar-integrations/google/callback')
    .query({ code: 'oauth-code', state });
  assert.equal(replay.status, 302);
  assert.match(replay.headers.location, /error=invalid_state/);
});
