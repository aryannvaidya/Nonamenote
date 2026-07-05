# NoNameNote 📩

> Send anonymous notes to anyone. No account needed on their end.

**Live:** [nonamenote.fun](https://nonamenote.fun)

---

## What is it? 

NoNameNote lets you create a personal link and share it with people. Anyone who visits your link can send you an anonymous message — you receive it by email, they stay completely anonymous.

---

## Features

- **True anonymity**: senders need zero account or login
- **Email delivery**: notes land directly in your inbox
- **AI content moderation**: Hugging Face model filters harmful content before delivery
-  **Resilient email pipeline**: multi-provider fallback (Brevo → Resend → Mailjet) ensures delivery even if one provider fails
-  **Auth-protected dashboard**: only you can read your received notes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Email | Brevo / Resend / Mailjet (fallback chain) |
| AI Moderation | Hugging Face Inference API |
| Backend | Vercel Serverless Functions |
| Hosting | Vercel (custom domain) |

---

## How It Works

1. **Visit the site** [nonamenote.fun](https://nonamenote.fun)
2. Type your message in the text box, choose a theme
3. Enter the details of the recipient. (email address)
4. The note passes through **AI moderation** (Hugging Face) to filter toxic content (not 100% safe, so be respectful towards the recipient 🙏)
5. It also blocks most common inappropriate words from its dataset (currently in English, Hindi & Hinglish)
6. If it passes, it's saved to **Firestore** and triggers the **email pipeline**
7. The email pipeline tries Brevo first, falls back to Resend, then Mailjet if needed
8. **Recipient gets the email** in their inbox from dispatch@nonamenote.fun

---

## Project Structure

```
nonamenote/
├── src/
│   ├── components/       # React UI components
│   ├── pages/            # Route-level pages
│   ├── firebase.ts       # Firestore + Auth config
│   └── main.tsx
├── api/
│   └── send-note.ts      # Vercel serverless function (email + moderation)
├── vercel.json           # SPA rewrite rules + env config
└── vite.config.ts
```

---

## Environment Variables

Set these in your Vercel project settings:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=

BREVO_API_KEY=
RESEND_API_KEY=
MAILJET_API_KEY=
MAILJET_SECRET_KEY=

HUGGINGFACE_API_KEY=
```

> Never commit these to your repository.

---

## Local Development

```bash
git clone https://github.com/aryanbaidya/nonamenote
cd nonamenote
npm install
npm run dev
```

---

## Deployment

Deployed via Vercel with automatic GitHub integration. Push to `main` → live in seconds.

The `vercel.json` includes SPA rewrite rules so client-side routing works correctly on all paths.

---

## License

MIT
