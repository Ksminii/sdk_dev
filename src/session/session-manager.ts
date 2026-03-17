import { SESSION_STORAGE_KEY } from '../constants';
import type { ResolvedConfig, SessionData } from '../types';
import { generateUUIDv7 } from '../utils/uuid';
import { debug } from '../utils/logger';

export class SessionManager {
  private config: ResolvedConfig;
  private session: SessionData;

  constructor(config: ResolvedConfig) {
    this.config = config;
    this.session = this.loadOrCreate();
  }

  getSessionId(): string {
    if (this.isExpired()) {
      debug('Session expired, creating new session');
      this.session = this.create();
      this.save();
    }
    this.touch();
    return this.session.id;
  }

  private loadOrCreate(): SessionData {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const data: SessionData = JSON.parse(raw);
        if (!this.isExpiredData(data)) {
          debug('Restored session', data.id);
          return data;
        }
      }
    } catch {
      // sessionStorage unavailable or corrupt data
    }
    const session = this.create();
    this.save();
    return session;
  }

  private create(): SessionData {
    const session: SessionData = {
      id: generateUUIDv7(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    debug('New session created', session.id);
    return session;
  }

  private touch(): void {
    this.session.lastActivityAt = Date.now();
    this.save();
  }

  private save(): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch {
      // sessionStorage full or unavailable
    }
  }

  private isExpired(): boolean {
    return this.isExpiredData(this.session);
  }

  private isExpiredData(data: SessionData): boolean {
    const now = Date.now();
    const idleExpired = now - data.lastActivityAt > this.config.sessionIdleTimeout;
    const maxExpired = now - data.startedAt > this.config.sessionMaxDuration;
    return idleExpired || maxExpired;
  }
}
