const PREFIX = '[LandingAnalytics]';

let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debug(...args: unknown[]): void {
  if (debugEnabled) {
    console.log(PREFIX, ...args);
  }
}

export function warn(...args: unknown[]): void {
  console.warn(PREFIX, ...args);
}

export function error(...args: unknown[]): void {
  console.error(PREFIX, ...args);
}
