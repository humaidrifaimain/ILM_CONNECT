import { Injectable, Logger } from '@nestjs/common';

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date | null;
}

interface InternalPresenceState {
  lastSeen: Date;
  isOnline: boolean;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  // In-memory store: userId -> presence state
  private presenceMap = new Map<string, InternalPresenceState>();

  // Threshold after which an un-pinged user is automatically considered offline (60 seconds)
  private readonly ONLINE_TIMEOUT_MS = 60 * 1000;

  /**
   * Record user activity or heartbeat ping
   */
  recordActivity(userId: string): UserPresence {
    const now = new Date();
    this.presenceMap.set(userId, {
      lastSeen: now,
      isOnline: true,
    });

    return {
      userId,
      isOnline: true,
      lastSeen: now,
    };
  }

  /**
   * Explicitly mark user as offline (e.g., page unload / tab closed)
   */
  setOffline(userId: string): UserPresence {
    const now = new Date();
    const existing = this.presenceMap.get(userId);

    this.presenceMap.set(userId, {
      lastSeen: existing?.lastSeen || now,
      isOnline: false,
    });

    return {
      userId,
      isOnline: false,
      lastSeen: existing?.lastSeen || now,
    };
  }

  /**
   * Get presence status for a single user
   */
  getPresence(userId: string): UserPresence {
    const state = this.presenceMap.get(userId);
    if (!state) {
      return {
        userId,
        isOnline: false,
        lastSeen: null,
      };
    }

    const isExpired = Date.now() - state.lastSeen.getTime() > this.ONLINE_TIMEOUT_MS;
    const isOnline = state.isOnline && !isExpired;

    return {
      userId,
      isOnline,
      lastSeen: state.lastSeen,
    };
  }

  /**
   * Get presence statuses for a list of users
   */
  getMultiplePresence(userIds: string[]): Record<string, UserPresence> {
    const result: Record<string, UserPresence> = {};
    for (const id of userIds) {
      result[id] = this.getPresence(id);
    }
    return result;
  }
}
