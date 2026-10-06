import { ConnectionError, ConnectionErrorReason } from 'livekit-client';

export function isCanceledClassroomConnection(error: Error): boolean {
  return error instanceof ConnectionError && error.reason === ConnectionErrorReason.Cancelled;
}
