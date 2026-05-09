const users = new Map();
const RATE_LIMIT = 20;
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
    return res.status(429).json({ error: 'Too Many Requests', message: 'Too many moderation requests. Please wait a while.' });
  }

  const { text } = req.body;
  
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/unitary/toxic-bert',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true'
        },
        body: JSON.stringify({ inputs: text }),
        signal: AbortSignal.timeout(10000)
      }
    );

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const textError = await response.text();
      console.warn('Moderation API returned non-JSON response:', textError.slice(0, 100));
      return res.status(200).json({ toxic: false }); // Fail safe
    }

    const result = await response.json();
    
    // Handle Hugging Face loading or error objects
    if (result.error) {
      console.warn('Hugging Face API Error:', result.error);
      return res.status(200).json({ toxic: false });
    }

    // Hugging Face returns an array of arrays for this model
    const toxicScore = result[0]?.find(r => r.label === 'toxic')?.score || 0;
    res.status(200).json({ toxic: toxicScore > 0.75 });
  } catch (error) {
    console.error('Moderation API Error:', error);
    res.status(200).json({ toxic: false });
  }
}
