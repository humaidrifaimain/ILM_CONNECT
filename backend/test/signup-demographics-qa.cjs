const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const { z } = require('../../frontend/node_modules/zod');

const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1', 'QA requires a local database');
assert.equal(url.pathname, '/qa_signup_oct6', 'QA requires its disposable database');
process.env.NODE_ENV = 'test';
const { AuthModule } = require('../dist/src/auth/auth.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const out = path.resolve(__dirname, '../../output/playwright/signup-qa');
const checks = [];
const base = 'http://localhost:3006/api/v1';
const body = { email: `signup-${randomUUID()}@example.test`, password: 'QA-Password123!', fullName: 'Signup QA Student', gender: 'FEMALE', dateOfBirth: '2000-02-29', phone: '+44 7700 900123', country: 'United Kingdom', timezone: 'Asia/Colombo', preferredHours: [10, 11, 12, 13], role: 'STUDENT' };
const userSchema = z.object({ id: z.uuid(), email: z.email(), role: z.literal('STUDENT'), gender: z.string(), dateOfBirth: z.iso.datetime() });

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const app = await NestFactory.create(AuthModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  await app.listen(3006, '127.0.0.1');
  const db = app.get(PrismaService);
  async function check(name, endpoint, status, payload, token, verify = () => {}) {
    try {
      const response = await fetch(base + endpoint, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
      const data = await response.json();
      assert.equal(response.status, status);
      assert.match(response.headers.get('content-type'), /application\/json/);
      await verify(data, response);
      checks.push({ name, passed: true });
      console.log(`PASS ${name}`);
      return data;
    } catch (error) { checks.push({ name, passed: false, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
  }
  for (const [name, overrides] of [
    ['invalid gender', { gender: 'INVALID' }], ['future birth date', { dateOfBirth: '2999-01-01' }],
    ['impossible birth date', { dateOfBirth: '2001-02-29' }], ['birth date with time', { dateOfBirth: '2000-01-01T00:00:00Z' }],
    ['empty name', { fullName: ' ' }], ['empty country', { country: ' ' }], ['empty phone', { phone: ' ' }],
    ['malformed international phone', { phone: '+94abc' }], ['invalid email', { email: 'invalid' }],
    ['short password', { password: '123' }], ['invalid timezone', { timezone: 'invalid' }],
    ['invalid availability', { preferredHours: [24] }], ['unexpected fields', { unexpected: true }],
  ]) await check(`Rejects ${name}`, '/auth/register', 400, { ...body, ...overrides }, undefined, async () => assert.equal(await db.user.count(), 0));
  const user = await check('Registers student with demographics', '/auth/register', 201, body, undefined, data => {
    userSchema.parse(data); assert.equal(data.gender, body.gender); assert.equal(data.dateOfBirth, '2000-02-29T00:00:00.000Z'); assert.equal(data.passwordHash, undefined);
  });
  if (user) {
    await check('Persists country and normalized WhatsApp number', '/auth/login', 201, { email: body.email, password: body.password }, undefined, async (data, response) => {
      userSchema.parse(data.user); assert.equal(typeof data.token, 'string'); assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
      const saved = await db.user.findUnique({ where: { id: user.id }, include: { studentProfile: true, supportTickets: true } });
      assert.equal(saved.gender, body.gender); assert.equal(saved.dateOfBirth.toISOString(), '2000-02-29T00:00:00.000Z');
      assert.equal(saved.studentProfile.country, body.country); assert.equal(saved.studentProfile.phone, '+447700900123');
      assert.deepEqual(saved.studentProfile.preferredHours, body.preferredHours); assert.equal(saved.supportTickets.length, 1);
      await check('Authenticated account returns saved demographics', '/auth/me', 200, undefined, data.token, me => {
        assert.equal(me.gender, body.gender); assert.equal(me.studentProfile.phone, '+447700900123'); assert.equal(me.passwordHash, undefined);
      });
    });
    await check('Rejects duplicate registration', '/auth/register', 409, body);
    await check('Rejects incorrect password', '/auth/login', 401, { email: body.email, password: 'wrong-password' });
  }
  await check('Rejects anonymous account access', '/auth/me', 401);
  fs.writeFileSync(path.join(out, 'api-results.json'), JSON.stringify(checks, null, 2));
  console.log(`SUMMARY ${checks.filter(item => item.passed).length}/${checks.length} passed`);
  if (checks.some(item => !item.passed)) { await app.close(); process.exitCode = 1; return; }
  if (process.argv.includes('--serve')) {
    console.log('QA API ready on port 3006');
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
  } else await app.close();
}
main().catch(error => { console.error(error); process.exit(1); });
