import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchSubscriptionAccess } from '../src/lib/subscription-access.ts';

const apiError = (status, message) => Object.assign(new Error(message), { status });
const missingRoute = () => apiError(404, 'Cannot GET /api/v1/subscriptions/access');
const currentSubscription = {
  tier: 'Trial', status: 'ACTIVE',
  currentPeriodStart: new Date(Date.now() - 86400000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
};
const legacyApi = subscription => async endpoint => {
  if (endpoint === '/subscriptions/access') throw missingRoute();
  assert.equal(endpoint, '/subscriptions/me');
  if (subscription instanceof Error) throw subscription;
  return subscription;
};

test('uses the access endpoint when available', async () => {
  for (const requiresSubscription of [true, false]) {
    assert.deepEqual(await fetchSubscriptionAccess(async endpoint => {
      assert.equal(endpoint, '/subscriptions/access');
      return { requiresSubscription };
    }), { requiresSubscription });
  }
});

test('verifies active trials and paid subscriptions on the deployed legacy API', async () => {
  for (const tier of ['Trial', 'Standard']) {
    assert.deepEqual(await fetchSubscriptionAccess(legacyApi({ ...currentSubscription, tier })), { requiresSubscription: false });
  }
});

test('allows a new account to activate its trial', async () => {
  assert.deepEqual(await fetchSubscriptionAccess(legacyApi(apiError(404, 'No active subscription found'))), { requiresSubscription: false });
});

test('blocks expired, future, and canceled subscriptions on the legacy API', async () => {
  for (const changes of [
    { currentPeriodEnd: new Date(Date.now() - 1000).toISOString() },
    { currentPeriodStart: new Date(Date.now() + 1000).toISOString() },
    { status: 'CANCELED' },
  ]) {
    assert.deepEqual(await fetchSubscriptionAccess(legacyApi({ ...currentSubscription, ...changes })), { requiresSubscription: true });
  }
});

test('does not bypass authentication, server, or network failures', async () => {
  for (const error of [apiError(401, 'Unauthorized'), apiError(500, 'Internal server error'), new TypeError('Failed to fetch')]) {
    await assert.rejects(fetchSubscriptionAccess(async endpoint => {
      assert.equal(endpoint, '/subscriptions/access');
      throw error;
    }), error);
    await assert.rejects(fetchSubscriptionAccess(legacyApi(error)), error);
  }
});

test('does not treat missing legacy routes as a new account', async () => {
  const error = apiError(404, 'Cannot GET /api/v1/subscriptions/me');
  await assert.rejects(fetchSubscriptionAccess(legacyApi(error)), error);
});

test('rejects invalid access and legacy subscription responses', async () => {
  await assert.rejects(fetchSubscriptionAccess(async () => ({})), /Invalid subscription access response/);
  for (const subscription of [null, {}, { ...currentSubscription, currentPeriodEnd: 'invalid' }]) {
    await assert.rejects(fetchSubscriptionAccess(legacyApi(subscription)), /Invalid subscription/);
  }
});
