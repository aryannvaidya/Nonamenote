import { getDb } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: 'Missing noteId' });

    const db = getDb();
    const snapshot = await db.collection('notes')
      .doc(noteId)
      .collection('replies')
      .orderBy('timestamp', 'asc')
      .get();
      
    const replies = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' 
          ? data.timestamp.toDate().toISOString() 
          : data.timestamp
      };
    });
    
    res.status(200).json({ replies });
  } catch (error) {
    console.error('Get Replies Error:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
}
