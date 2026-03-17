import {
  DEFAULT_FLUSH_INTERVAL,
  DEFAULT_FLUSH_QUEUE_SIZE,
  DEFAULT_SESSION_IDLE_TIMEOUT,
  DEFAULT_SESSION_MAX_DURATION,
} from './constants';
import type { LandingAnalyticsConfig, ResolvedConfig } from './types';

export function mergeConfig(userConfig: LandingAnalyticsConfig): ResolvedConfig {
  return {
    apiEndpoint: userConfig.apiEndpoint,
    apiKey: userConfig.apiKey,
    flushInterval: userConfig.flushInterval ?? DEFAULT_FLUSH_INTERVAL,
    flushQueueSize: userConfig.flushQueueSize ?? DEFAULT_FLUSH_QUEUE_SIZE,
    sessionIdleTimeout: userConfig.sessionIdleTimeout ?? DEFAULT_SESSION_IDLE_TIMEOUT,
    sessionMaxDuration: userConfig.sessionMaxDuration ?? DEFAULT_SESSION_MAX_DURATION,
    debug: userConfig.debug ?? false,
    sessionRecording: userConfig.sessionRecording ?? false,
    beforeSend: userConfig.beforeSend,
    recordingEndpoint: userConfig.recordingEndpoint ?? userConfig.apiEndpoint.replace(/\/?$/, '/recordings'),
  };
}
