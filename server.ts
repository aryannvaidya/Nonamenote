import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// Import API handlers
import moderateHandler from "./api/moderate.js";
import saveNoteHandler from "./api/save-note.js";
import getNoteHandler from "./api/get-note.js";
import saveReplyHandler from "./api/save-reply.js";
import getRepliesHandler from "./api/get-replies.js";
import markReplyReadHandler from "./api/mark-reply-read.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON body parsing for our API routes
  app.use(express.json());

  // API Routes
  app.post("/api/moderate", moderateHandler);
  app.post("/api/save-note", saveNoteHandler);
  app.post("/api/get-note", getNoteHandler);
  app.post("/api/save-reply", saveReplyHandler);
  app.post("/api/get-replies", getRepliesHandler);
  app.post("/api/mark-reply-read", markReplyReadHandler);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      config: {
        firebase: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
        emailjs: !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY),
        huggingface: !!process.env.HUGGINGFACE_TOKEN
      }
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Error Handler:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
