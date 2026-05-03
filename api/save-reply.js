import { getDb } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
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
