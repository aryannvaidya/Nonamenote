import { getDb } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
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
