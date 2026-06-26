
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

  const { to_email, note_link } = req.body;

  if (!to_email || !note_link) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const getEmailTemplate = (link) => `
    <table style="table-layout: fixed;" border="0" width="100%" cellspacing="0" cellpadding="0" bgcolor="#efefef">
    <tbody>
    <tr>
    <td style="padding: 40px 10px;" align="center">
    <table style="max-width: 360px; margin: 0 auto; font-family: Arial, sans-serif; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;" border="0" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td>
    <table style="font-size: 0; line-height: 0; table-layout: fixed;" border="0" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td style="font-size: 0; line-height: 0; border-radius: 8px 8px 0 0;" bgcolor="#a3b88a" width="100%" height="60">&nbsp;</td>
    </tr>
    </tbody>
    </table>
    <table style="padding: 30px 20px 40px;" border="0" width="100%" cellspacing="0" cellpadding="0" bgcolor="#a3b88a">
    <tbody>
    <tr>
    <td align="center">
    <p style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: normal; line-height: 1.2; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">This is<br>for you</p>
    <p style="margin: 20px 0 0; font-family: Georgia, serif; font-size: 12px; line-height: 1.2; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">By Someone</p>
    <table style="margin: 25px auto;" border="0" width="60" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td style="font-size: 0; line-height: 0;" bgcolor="#ffffff" height="1">&nbsp;</td>
    </tr>
    </tbody>
    </table>
    <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;"><span style="color: #ffffff;"><a style="color: #ffffff;" href="https://nonamenote.fun">NONAMENOTE</a></span></p>
    </td>
    </tr>
    </tbody>
    </table>
    <table style="padding: 40px 0; border-radius: 0 0 8px 8px; table-layout: fixed;" border="0" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff">
    <tbody>
    <tr>
    <td align="center" width="100%">
    <table style="margin: 0 auto;" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td style="background-color: #4a3c39; border-radius: 30px; padding: 16px 36px; box-shadow: 0px 2px 5px rgba(0,0,0,0.2);" align="center"><a style="color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; text-decoration: none; display: block; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;" href="${link}">Open Your Note</a></td>
    </tr>
    </tbody>
    </table>
    </td>
    </tr>
    </tbody>
    </table>
    <table style="margin-top: 20px; table-layout: fixed;" border="0" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td align="center">&nbsp;</td>
    </tr>
    </tbody>
    </table>
    </td>
    </tr>
    </tbody>
    </table>
    </td>
    </tr>
    </tbody>
    </table>
  `;

  try {
    // Primary: Brevo
    console.log('Attempting to send email via Brevo...');
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: 'NoNameNote',
          email: 'dispatch@nonamenote.fun'
        },
        replyTo: {
          email: 'noreply@nonamenote.fun'
        },
        to: [{ email: to_email }],
        subject: 'Someone sent you a note',
        htmlContent: getEmailTemplate(note_link)
      })
    });

    if (brevoResponse.ok) {
      console.log('Email sent successfully via Brevo');
      return res.status(200).json({ success: true, service: 'brevo' });
    }

    const brevoError = await brevoResponse.json();
    console.error('Brevo Error:', brevoError);
    throw new Error('Brevo failed');

  } catch (error) {
    console.warn('Brevo failed, falling back to EmailJS:', error.message);

    // Secondary: EmailJS
    try {
      const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: {
            to_email: to_email,
            note_link: note_link
          }
        })
      });

      if (emailjsResponse.ok) {
        console.log('Email sent successfully via EmailJS');
        return res.status(200).json({ success: true, service: 'emailjs' });
      }

      const emailjsError = await emailjsResponse.text();
      console.error('EmailJS Error:', emailjsError);
      return res.status(500).json({ error: 'All email services failed', details: emailjsError });

    } catch (fallbackError) {
      console.error('Critical Email Failure:', fallbackError);
      return res.status(500).json({ error: 'Failed to send email via all services' });
    }
  }
}
