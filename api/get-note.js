import { getDb } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: 'Missing noteId' });

    const db = getDb();
    const docRef = db.collection('notes').doc(noteId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Update opened status only if explicitly requested (e.g. by recipient revealing the note)
    if (req.body.markSeen === true) {
      await docRef.update({ 
        opened: true,
        openedAt: new Date()
      });
    }

    const data = doc.data();
    // Normalize timestamps for frontend
    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
      data.timestamp = data.timestamp.toDate().toISOString();
    }
    if (data.openedAt && typeof data.openedAt.toDate === 'function') {
      data.openedAt = data.openedAt.toDate().toISOString();
    }

    res.status(200).json({ note: data });
  } catch (error) {
    console.error('Get Note Error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
}
