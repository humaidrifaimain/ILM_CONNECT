export interface SubscriptionAccess {
  requiresSubscription: boolean;
}

function isApiError(error: unknown, status: number, message: string) {
  return error instanceof Error && 'status' in error && error.status === status && error.message === message;
}

export async function fetchSubscriptionAccess(
  fetchEndpoint: (endpoint: string) => Promise<unknown>,
): Promise<SubscriptionAccess> {
  try {
    const access = await fetchEndpoint('/subscriptions/access');
    if (!access || typeof access !== 'object' || !('requiresSubscription' in access) || typeof access.requiresSubscription !== 'boolean') {
      throw new Error('Invalid subscription access response');
    }
    return { requiresSubscription: access.requiresSubscription };
  } catch (error) {
    if (!isApiError(error, 404, 'Cannot GET /api/v1/subscriptions/access')) throw error;
  }

  let subscription: unknown;
  try {
    subscription = await fetchEndpoint('/subscriptions/me');
  } catch (error) {
    if (isApiError(error, 404, 'No active subscription found')) {
      return { requiresSubscription: false };
    }
    throw error;
  }

  if (!subscription || typeof subscription !== 'object' || !('status' in subscription) ||
    !('currentPeriodStart' in subscription) || typeof subscription.currentPeriodStart !== 'string' ||
    !('currentPeriodEnd' in subscription) || typeof subscription.currentPeriodEnd !== 'string') {
    throw new Error('Invalid subscription response');
  }
  const start = Date.parse(subscription.currentPeriodStart);
  const end = Date.parse(subscription.currentPeriodEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error('Invalid subscription period');
  }
  const now = Date.now();
  return { requiresSubscription: subscription.status !== 'ACTIVE' || start > now || end <= now };
}
