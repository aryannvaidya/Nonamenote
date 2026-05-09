import { getDb } from './_firebase.js';

const users = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || 'anon';
  const now = Date.now();
  const userData = users.get(ip) || { count: 0, firstAction: now };
  if (now - userData.firstAction > WINDOW_MS) {
    userData.count = 1;
    userData.firstAction = now;
  } else {
    userData.count++;
  }
  users.set(ip, userData);

  if (userData.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded for replies.' });
  }

  const { noteId, message } = req.body;
  if (!noteId || !message) return res.status(400).json({ error: 'Missing data' });

  try {
    const db = getDb();
    await db.collection('notes').doc(noteId).collection('replies').add({
      message,
      timestamp: new Date(),
      read: false
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Firebase Save Reply Error:', error);
    res.status(500).json({ error: 'Failed to save reply', message: error.message });
  }
}
