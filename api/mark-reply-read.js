import { getDb } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { noteId, replyId } = req.body;
  if (!noteId || !replyId) return res.status(400).json({ error: 'Missing data' });

  try {
    const db = getDb();
    await db.collection('notes').doc(noteId).collection('replies').doc(replyId).update({
      read: true
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Firebase Mark Read Error:', error);
    res.status(500).json({ error: 'Failed to update reply status', message: error.message });
  }
}
