const DEFAULT_FLUSH_INTERVAL = 3e3;
const DEFAULT_FLUSH_QUEUE_SIZE = 20;
const DEFAULT_SESSION_IDLE_TIMEOUT = 30 * 60 * 1e3;
const DEFAULT_SESSION_MAX_DURATION = 24 * 60 * 60 * 1e3;
const SESSION_STORAGE_KEY = "la_session";
const MAX_TEXT_LENGTH = 100;
const DEFAULT_RECORDING_FLUSH_INTERVAL = 5e3;
const DEFAULT_RECORDING_FLUSH_SIZE = 50;

function mergeConfig(userConfig) {
  var _a, _b, _c, _d, _e, _f, _g;
  return {
    apiEndpoint: userConfig.apiEndpoint,
    apiKey: userConfig.apiKey,
    flushInterval: (_a = userConfig.flushInterval) != null ? _a : DEFAULT_FLUSH_INTERVAL,
    flushQueueSize: (_b = userConfig.flushQueueSize) != null ? _b : DEFAULT_FLUSH_QUEUE_SIZE,
    sessionIdleTimeout: (_c = userConfig.sessionIdleTimeout) != null ? _c : DEFAULT_SESSION_IDLE_TIMEOUT,
    sessionMaxDuration: (_d = userConfig.sessionMaxDuration) != null ? _d : DEFAULT_SESSION_MAX_DURATION,
    debug: (_e = userConfig.debug) != null ? _e : false,
    sessionRecording: (_f = userConfig.sessionRecording) != null ? _f : false,
    beforeSend: userConfig.beforeSend,
    recordingEndpoint: (_g = userConfig.recordingEndpoint) != null ? _g : userConfig.apiEndpoint.replace(/\/?$/, "/recordings")
  };
}

function generateUUIDv7() {
  const now = Date.now();
  const timeBits = new Uint8Array(6);
  let ts = now;
  for (let i = 5; i >= 0; i--) {
    timeBits[i] = ts & 255;
    ts = Math.floor(ts / 256);
  }
  const rand = new Uint8Array(10);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < 10; i++) {
      rand[i] = Math.floor(Math.random() * 256);
    }
  }
  const bytes = new Uint8Array(16);
  bytes.set(timeBits, 0);
  bytes.set(rand.slice(0, 2), 6);
  bytes.set(rand.slice(2), 8);
  bytes[6] = bytes[6] & 15 | 112;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

const PREFIX = "[LandingAnalytics]";
let debugEnabled = false;
function setDebug(enabled) {
  debugEnabled = enabled;
}
function debug(...args) {
  if (debugEnabled) {
    console.log(PREFIX, ...args);
  }
}
function warn(...args) {
  console.warn(PREFIX, ...args);
}
function error(...args) {
  console.error(PREFIX, ...args);
}

class SessionManager {
  constructor(config) {
    this.config = config;
    this.session = this.loadOrCreate();
  }
  getSessionId() {
    if (this.isExpired()) {
      debug("Session expired, creating new session");
      this.session = this.create();
      this.save();
    }
    this.touch();
    return this.session.id;
  }
  loadOrCreate() {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (!this.isExpiredData(data)) {
          debug("Restored session", data.id);
          return data;
        }
      }
    } catch (e) {
    }
    const session = this.create();
    this.save();
    return session;
  }
  create() {
    const session = {
      id: generateUUIDv7(),
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    };
    debug("New session created", session.id);
    return session;
  }
  touch() {
    this.session.lastActivityAt = Date.now();
    this.save();
  }
  save() {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch (e) {
    }
  }
  isExpired() {
    return this.isExpiredData(this.session);
  }
  isExpiredData(data) {
    const now = Date.now();
    const idleExpired = now - data.lastActivityAt > this.config.sessionIdleTimeout;
    const maxExpired = now - data.startedAt > this.config.sessionMaxDuration;
    return idleExpired || maxExpired;
  }
}

class Sender {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  /** Send payload via fetch, fallback to sendBeacon */
  async send(payload) {
    const body = JSON.stringify(payload);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true
      });
      debug("Events sent", response.status);
      return response.ok;
    } catch (err) {
      error("Fetch failed, trying sendBeacon", err);
      return this.sendViaBeacon(body);
    }
  }
  /** Use sendBeacon for page unload scenarios */
  sendBeacon(payload) {
    const body = JSON.stringify(payload);
    return this.sendViaBeacon(body);
  }
  sendViaBeacon(body) {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const success = navigator.sendBeacon(this.endpoint, blob);
      debug("sendBeacon result", success);
      return success;
    }
    error("sendBeacon not available");
    return false;
  }
}

class EventQueue {
  constructor(config) {
    this.queue = [];
    this.timer = null;
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.flushViaBeacon();
      }
    };
    this.handlePageHide = () => {
      this.flushViaBeacon();
    };
    this.config = config;
    this.sender = new Sender(config.apiEndpoint);
  }
  start() {
    this.timer = setInterval(() => this.flush(), this.config.flushInterval);
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener("pagehide", this.handlePageHide);
    }
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("pagehide", this.handlePageHide);
    }
    this.flush();
  }
  enqueue(event) {
    if (this.config.beforeSend) {
      const filtered = this.config.beforeSend(event);
      if (!filtered) {
        debug("Event filtered by beforeSend");
        return;
      }
      event = filtered;
    }
    this.queue.push(event);
    debug("Event queued", event.type, `(${this.queue.length}/${this.config.flushQueueSize})`);
    if (this.queue.length >= this.config.flushQueueSize) {
      this.flush();
    }
  }
  flush() {
    if (this.queue.length === 0)
      return;
    const events = this.queue.splice(0);
    const payload = {
      apiKey: this.config.apiKey,
      events,
      sentAt: Date.now()
    };
    debug("Flushing", events.length, "events");
    this.sender.send(payload);
  }
  /** Get current queue length (for testing) */
  get length() {
    return this.queue.length;
  }
  flushViaBeacon() {
    if (this.queue.length === 0)
      return;
    const events = this.queue.splice(0);
    const payload = {
      apiKey: this.config.apiKey,
      events,
      sentAt: Date.now()
    };
    this.sender.sendBeacon(payload);
  }
}

function getSelector(el) {
  if (el.id) {
    return `#${el.id}`;
  }
  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === "string") {
    const classes = el.className.trim().split(/\s+/).slice(0, 3).join(".");
    if (classes) {
      return `${tag}.${classes}`;
    }
  }
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}:nth-child(${index})`;
    }
  }
  return tag;
}
function getElementText(el) {
  const text = (el.textContent || "").trim();
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) + "..." : text;
}
function getElementInfo(el) {
  return {
    selector: getSelector(el),
    tagName: el.tagName.toLowerCase(),
    text: getElementText(el),
    href: el.href || void 0
  };
}

class ClickCapture {
  constructor(emit, getSessionId) {
    this.handler = null;
    this.emit = emit;
    this.getSessionId = getSessionId;
  }
  start() {
    this.handler = (e) => {
      const target = e.target;
      if (!target || !target.tagName)
        return;
      const info = getElementInfo(target);
      const properties = {
        ...info,
        x: e.clientX,
        y: e.clientY
      };
      const event = {
        type: "click",
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        url: window.location.href,
        properties
      };
      debug("Click captured", info.selector);
      this.emit(event);
    };
    document.addEventListener("click", this.handler, { capture: true });
  }
  stop() {
    if (this.handler) {
      document.removeEventListener("click", this.handler, { capture: true });
      this.handler = null;
    }
  }
}

class PageviewCapture {
  constructor(emit, getSessionId) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }
  start() {
    this.capturePageview();
  }
  stop() {
  }
  capturePageview() {
    const properties = {
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname
    };
    const event = {
      type: "pageview",
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      properties
    };
    debug("Pageview captured", properties.path);
    this.emit(event);
  }
}

class ScrollCapture {
  constructor(emit, getSessionId) {
    this.handler = null;
    this.lastReportedMilestone = -1;
    this.debounceTimer = null;
    this.emit = emit;
    this.getSessionId = getSessionId;
  }
  start() {
    this.handler = () => {
      if (this.debounceTimer)
        clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.checkAndEmit();
      }, 300);
    };
    window.addEventListener("scroll", this.handler, { passive: true });
    setTimeout(() => this.checkAndEmit(), 500);
  }
  stop() {
    if (this.handler) {
      window.removeEventListener("scroll", this.handler);
      this.handler = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.checkAndEmit();
  }
  checkAndEmit() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    if (docHeight <= viewportHeight)
      return;
    const depth = Math.min(Math.round((scrollTop + viewportHeight) / docHeight * 100), 100);
    const milestone = Math.floor(depth / 10) * 10;
    if (milestone !== this.lastReportedMilestone && milestone > 0) {
      this.lastReportedMilestone = milestone;
      this.emitScroll(depth);
    }
  }
  emitScroll(depth) {
    const properties = {
      maxDepth: depth,
      direction: "down"
    };
    const event = {
      type: "scroll",
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      properties
    };
    debug("Scroll depth", depth + "%");
    this.emit(event);
  }
}

const SENSITIVE_TYPES = /* @__PURE__ */ new Set(["password", "email", "tel", "credit-card"]);
function maskValue(value, fieldType) {
  if (!value)
    return "";
  if (SENSITIVE_TYPES.has(fieldType)) {
    return "*".repeat(value.length);
  }
  if (value.length <= 1)
    return "*";
  return value[0] + "*".repeat(value.length - 1);
}

class InputCapture {
  constructor(emit, getSessionId) {
    this.handler = null;
    this.emit = emit;
    this.getSessionId = getSessionId;
  }
  start() {
    this.handler = (e) => {
      const target = e.target;
      if (!target || !target.tagName)
        return;
      const tag = target.tagName.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select")
        return;
      const fieldType = target.type || tag;
      const properties = {
        selector: getSelector(target),
        tagName: tag,
        fieldType,
        value: maskValue(target.value, fieldType)
      };
      const event = {
        type: "input",
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        url: window.location.href,
        properties
      };
      debug("Input captured", properties.selector);
      this.emit(event);
    };
    document.addEventListener("change", this.handler, { capture: true });
  }
  stop() {
    if (this.handler) {
      document.removeEventListener("change", this.handler, { capture: true });
      this.handler = null;
    }
  }
}

class SessionRecorder {
  constructor(config, getSessionId) {
    this.stopFn = null;
    this.buffer = [];
    this.timer = null;
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.flush();
      }
    };
    this.handlePageHide = () => {
      this.flush();
    };
    this.config = config;
    this.getSessionId = getSessionId;
  }
  async start() {
    let rrweb;
    if (typeof window !== "undefined" && window.rrweb) {
      rrweb = window.rrweb;
    } else {
      try {
        rrweb = await import(
          /* webpackIgnore: true */
          'rrweb'
        );
      } catch (e) {
      }
    }
    if (!rrweb || !rrweb.record) {
      warn("rrweb not available. Install rrweb or load it via script tag to enable session recording.");
      return;
    }
    this.stopFn = rrweb.record({
      emit: (event) => {
        this.buffer.push(event);
        debug("rrweb event buffered", `(${this.buffer.length})`);
        if (this.buffer.length >= DEFAULT_RECORDING_FLUSH_SIZE) {
          this.flush();
        }
      }
    });
    this.timer = setInterval(() => this.flush(), DEFAULT_RECORDING_FLUSH_INTERVAL);
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener("pagehide", this.handlePageHide);
    }
    debug("Session recording started");
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("pagehide", this.handlePageHide);
    }
    this.flush();
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
    debug("Session recording stopped");
  }
  flush() {
    if (this.buffer.length === 0)
      return;
    const events = this.buffer.splice(0);
    const payload = {
      apiKey: this.config.apiKey,
      sessionId: this.getSessionId(),
      events,
      sentAt: Date.now()
    };
    debug("Flushing", events.length, "recording events");
    this.send(payload);
  }
  async send(payload) {
    const body = JSON.stringify(payload);
    try {
      await fetch(this.config.recordingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true
      });
    } catch (err) {
      error("Failed to send recording data", err);
    }
  }
}

const _LandingAnalytics = class _LandingAnalytics {
  constructor(config) {
    this.modules = [];
    this.recorder = null;
    this.initialized = false;
    this.config = mergeConfig(config);
    setDebug(this.config.debug);
    this.sessionManager = new SessionManager(this.config);
    this.queue = new EventQueue(this.config);
  }
  /** Initialize the SDK (singleton) */
  static init(config) {
    if (_LandingAnalytics.instance) {
      warn("Already initialized. Call destroy() first to reinitialize.");
      return _LandingAnalytics.instance;
    }
    const instance = new _LandingAnalytics(config);
    instance.start();
    _LandingAnalytics.instance = instance;
    return instance;
  }
  /** Get current instance */
  static getInstance() {
    return _LandingAnalytics.instance;
  }
  /** Capture a custom event */
  capture(eventType, properties = {}) {
    if (!this.initialized) {
      warn("SDK not initialized");
      return;
    }
    const event = {
      type: "custom",
      timestamp: Date.now(),
      sessionId: this.sessionManager.getSessionId(),
      url: window.location.href,
      properties: { eventType, ...properties }
    };
    this.queue.enqueue(event);
  }
  /** Destroy the instance and clean up */
  destroy() {
    this.modules.forEach((m) => m.stop());
    this.modules = [];
    this.queue.stop();
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    this.initialized = false;
    _LandingAnalytics.instance = null;
    debug("SDK destroyed");
  }
  start() {
    const emit = (event) => this.queue.enqueue(event);
    const getSessionId = () => this.sessionManager.getSessionId();
    this.modules = [
      new ClickCapture(emit, getSessionId),
      new PageviewCapture(emit, getSessionId),
      new ScrollCapture(emit, getSessionId),
      new InputCapture(emit, getSessionId)
    ];
    this.modules.forEach((m) => m.start());
    this.queue.start();
    if (this.config.sessionRecording) {
      this.recorder = new SessionRecorder(this.config, getSessionId);
      this.recorder.start();
    }
    this.initialized = true;
    debug("SDK initialized", this.config);
  }
};
_LandingAnalytics.instance = null;
let LandingAnalytics = _LandingAnalytics;

export { LandingAnalytics };
//# sourceMappingURL=index.js.map
