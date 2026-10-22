import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConnectionError } from 'livekit-client';
import { isCanceledClassroomConnection } from '../src/lib/classroom-connection.ts';

test('recognizes LiveKit cancellation regardless of its message', () => {
  for (const message of ['Client initiated disconnect', 'Connection attempt aborted', 'Signal connection aborted']) {
    assert.equal(isCanceledClassroomConnection(ConnectionError.cancelled(message)), true);
  }
});

test('does not suppress genuine classroom connection failures', () => {
  for (const error of [
    ConnectionError.notAllowed('Invalid token', 401),
    ConnectionError.timeout('Connection timed out'),
    ConnectionError.serverUnreachable('Server unavailable'),
    ConnectionError.websocket('WebSocket failed'),
    new Error('Camera permission denied'),
    new Error('Client initiated disconnect'),
  ]) {
    assert.equal(isCanceledClassroomConnection(error), false);
  }
});
