import { Injectable, Logger } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

export interface LivekitTokenResult {
  token: string;
  wsUrl: string;
  isSimulation: boolean;
  warning?: string;
}

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly apiKey = process.env.LIVEKIT_API_KEY;
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET;
  private readonly wsUrl = process.env.LIVEKIT_URL;

  /**
   * Check if the API secret has masked bullet dots (•).
   */
  isSecretMasked(): boolean {
    const secret = process.env.LIVEKIT_API_SECRET || this.apiSecret || '';
    return secret.includes('\u2022') || secret.includes('•');
  }

  /**
   * Check if LiveKit is properly configured with credentials.
   */
  isConfigured(): boolean {
    const key = process.env.LIVEKIT_API_KEY || this.apiKey;
    const secret = process.env.LIVEKIT_API_SECRET || this.apiSecret;
    const url = process.env.LIVEKIT_URL || this.wsUrl;
    return Boolean(key && secret && url && !this.isSecretMasked());
  }

  /**
   * Generate a deterministic LiveKit room name from a session ID.
   */
  getRoomName(sessionId: string): string {
    return `ilm-session-${sessionId}`;
  }

  /**
   * Generate a LiveKit access token for a participant.
   * If credentials are not configured or contain masked bullets, returns
   * an interactive simulation session so video meetings always work smoothly.
   */
  async generateToken(identity: string, name: string, roomName: string): Promise<LivekitTokenResult> {
    const apiKey = process.env.LIVEKIT_API_KEY || this.apiKey;
    const apiSecret = process.env.LIVEKIT_API_SECRET || this.apiSecret;
    const wsUrl = process.env.LIVEKIT_URL || this.wsUrl;

    if (!this.isConfigured()) {
      const reason = this.isSecretMasked()
        ? 'LIVEKIT_API_SECRET in backend/.env contains masked bullet characters (•).'
        : 'LiveKit credentials are not fully configured in backend/.env.';
      this.logger.warn(`${reason} Entering interactive virtual classroom mode.`);
      return {
        token: `sim_${identity}_${Date.now()}`,
        wsUrl: '',
        isSimulation: true,
        warning: `${reason} Running in Interactive Classroom mode. To connect to LiveKit Cloud, paste your unmasked secret in backend/.env.`,
      };
    }

    try {
      const at = new AccessToken(apiKey!, apiSecret!, {
        identity,
        name,
        ttl: '2h', // 2 hours — covers a 45-min session with generous buffer
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true, // For chat messages via DataChannel
      });

      const token = await at.toJwt();
      return { token, wsUrl: wsUrl!, isSimulation: false };
    } catch (err: any) {
      this.logger.error(`LiveKit token generation failed: ${err.message}. Falling back to simulation mode.`);
      return {
        token: `sim_${identity}_${Date.now()}`,
        wsUrl: '',
        isSimulation: true,
        warning: `LiveKit generation error: ${err.message}. Running in Interactive Classroom mode.`,
      };
    }
  }
}

