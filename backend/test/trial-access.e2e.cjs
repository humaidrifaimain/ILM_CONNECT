const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module.js');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');

async function run() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const db = app.get(PrismaService);
  const email = `qa-trial-access-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('hex');
  let studentId;
  try {
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api/v1`;
    async function request(endpoint, method = 'GET', body, token, status = 200) {
      const response = await fetch(`${base}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      assert.equal(response.status, status, `${method} ${endpoint}: ${JSON.stringify(data)}`);
      return data;
    }
    const user = await request('/auth/register', 'POST', {
      email, password, role: 'STUDENT', fullName: 'QA Trial Access', phone: '000000000', country: 'Sri Lanka', timezone: 'Asia/Colombo',
    }, undefined, 201);
    studentId = user.id;
    const { token } = await request('/auth/login', 'POST', { email, password }, undefined, 201);
    assert.deepEqual(await request('/subscriptions/access', 'GET', undefined, token), { requiresSubscription: false });
    console.log('PASS: newly registered account can open the dashboard');
    const trial = await request('/subscriptions/trial', 'POST', {}, token, 201);
    assert.deepEqual(await request('/subscriptions/access', 'GET', undefined, token), { requiresSubscription: false });
    assert.equal((await request('/subscriptions/me', 'GET', undefined, token)).id, trial.id);
    console.log('PASS: claimed free trial is verified and allows dashboard access');
    await request('/subscriptions/trial', 'POST', {}, token, 400);
    await db.subscription.update({ where: { id: trial.id }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } });
    assert.deepEqual(await request('/subscriptions/access', 'GET', undefined, token), { requiresSubscription: true });
    console.log('PASS: duplicate trial is rejected and expired trial blocks access');
    await request('/subscriptions/access', 'GET', undefined, undefined, 401);
    console.log('PASS: subscription verification requires authentication');
  } finally {
    if (studentId) await db.user.deleteMany({ where: { id: studentId, email } });
    await app.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
