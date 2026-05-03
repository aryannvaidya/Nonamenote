export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { to_email, note_link } = req.body;
  
  try {
    const emailjsResponse = await fetch(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: { to_email, note_link }
        })
      }
    );
    
    if (emailjsResponse.ok) {
      res.status(200).json({ success: true });
    } else {
      const errorText = await emailjsResponse.text();
      console.error('EmailJS API error response:', errorText);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('EmailJS Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
