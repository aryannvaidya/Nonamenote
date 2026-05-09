export async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      console.log(`Retry ${i + 1} for ${url}`);
    }
  }
  throw new Error('All retries failed');
}

export const noteCache = new Map();

export async function getNote(noteId: string) {
  if (noteCache.has(noteId)) {
    return noteCache.get(noteId);
  }
  const response = await fetchWithRetry('/api/get-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId, markSeen: false })
  });
  const data = await response.json();
  noteCache.set(noteId, data.note);
  return data.note;
}
