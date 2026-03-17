const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// --- In-memory storage ---
const events = [];
const recordings = {}; // sessionId -> rrweb events[]

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Receive analytics events from SDK
app.post('/events', (req, res) => {
  const { apiKey, events: batch, sentAt } = req.body;

  if (!apiKey || !batch) {
    return res.status(400).json({ error: 'missing apiKey or events' });
  }

  batch.forEach((event) => {
    events.push({ ...event, receivedAt: Date.now() });
  });

  console.log(`[Events] Received ${batch.length} events (apiKey: ${apiKey})`);
  res.json({ status: 'ok' });
});

// Receive recording data from SDK
app.post('/events/recordings', (req, res) => {
  const { apiKey, sessionId, events: rrwebEvents, sentAt } = req.body;

  if (!apiKey || !sessionId || !rrwebEvents) {
    return res.status(400).json({ error: 'missing required fields' });
  }

  if (!recordings[sessionId]) {
    recordings[sessionId] = [];
  }
  recordings[sessionId].push(...rrwebEvents);

  console.log(`[Recording] Received ${rrwebEvents.length} events for session ${sessionId.slice(0, 8)}...`);
  res.json({ status: 'ok' });
});

// Get all events
app.get('/events', (req, res) => {
  const { sessionId, type } = req.query;
  let filtered = events;

  if (sessionId) {
    filtered = filtered.filter((e) => e.sessionId === sessionId);
  }
  if (type) {
    filtered = filtered.filter((e) => e.type === type);
  }

  res.json({ count: filtered.length, events: filtered });
});

// Get session list
app.get('/sessions', (req, res) => {
  const sessionMap = {};

  events.forEach((event) => {
    const sid = event.sessionId;
    if (!sessionMap[sid]) {
      sessionMap[sid] = {
        sessionId: sid,
        eventCount: 0,
        firstEvent: event.timestamp,
        lastEvent: event.timestamp,
        types: {},
        hasRecording: !!recordings[sid],
      };
    }
    sessionMap[sid].eventCount++;
    sessionMap[sid].lastEvent = Math.max(sessionMap[sid].lastEvent, event.timestamp);
    sessionMap[sid].types[event.type] = (sessionMap[sid].types[event.type] || 0) + 1;
  });

  const sessions = Object.values(sessionMap).sort((a, b) => b.lastEvent - a.lastEvent);
  res.json({ count: sessions.length, sessions });
});

// Get recording for a session
app.get('/sessions/:id/replay', (req, res) => {
  const data = recordings[req.params.id];
  if (!data) {
    return res.status(404).json({ error: 'no recording found' });
  }
  res.json({ sessionId: req.params.id, eventCount: data.length, events: data });
});

// Clear all data
app.delete('/reset', (req, res) => {
  events.length = 0;
  Object.keys(recordings).forEach((k) => delete recordings[k]);
  console.log('[Reset] All data cleared');
  res.json({ status: 'ok' });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`
  ====================================
  Landing Analytics Test Server
  ====================================
  Dashboard:  http://localhost:${PORT}
  Events API: http://localhost:${PORT}/events
  Sessions:   http://localhost:${PORT}/sessions
  ====================================
  `);
});
