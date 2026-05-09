import { getDb } from './_firebase.js';

const users = new Map();
const RATE_LIMIT = 5;
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
    return res.status(429).json({ error: 'Too Many Requests', message: 'Maximum 5 dispatches per hour reached.' });
  }

  const { noteHTML, theme_bg, timestamp } = req.body;
  
  try {
    const db = getDb();
    const docRef = await db.collection('notes').add({
      noteHTML,
      theme_bg: theme_bg || "#0d0d0d",
      timestamp: new Date(timestamp),
      opened: false
    });
    
    res.status(200).json({ noteId: docRef.id });
  } catch (error) {
    console.error('Firebase Save Error:', error);
    res.status(500).json({ error: 'Failed to save note', message: error.message });
  }
}
