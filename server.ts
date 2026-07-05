import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import webPush from "web-push";
import fs from "fs";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Read config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Initialize firebase-admin for secure backend tasks bypassing Firestore rules
let adminDb: any;
try {
  const adminApp = initAdminApp({
    projectId: firebaseConfig.projectId,
  });
  adminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
} catch (adminInitErr) {
  console.error('Firebase Admin initialization failed, trying default:', adminInitErr);
  try {
    const adminApp = initAdminApp();
    adminDb = getAdminFirestore(adminApp);
  } catch (err2) {
    console.error('Firebase Admin default initialization failed:', err2);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Firestore Init on Backend
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  // Gemini AI Setup with modern SDK guidelines
  const aiKey = process.env.GEMINI_API_KEY;
  const ai = aiKey ? new GoogleGenAI({
    apiKey: aiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // Helper to validate if a key is a valid URL-safe base64 string
  const isValidVapidKey = (key: any) => {
    if (typeof key !== 'string' || !key) return false;
    // URL-safe base64 contains only A-Z, a-z, 0-9, -, _ and no padding "="
    const base64UrlRegex = /^[A-Za-z0-9\-_]+$/;
    return base64UrlRegex.test(key) && key.length > 20;
  };

  // VAPID keys setup
  const VAPID_KEYS_FILE = path.join(process.cwd(), 'vapid-keys.json');
  let vapidPublic = process.env.VAPID_PUBLIC_KEY;
  let vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!isValidVapidKey(vapidPublic) || !isValidVapidKey(vapidPrivate)) {
    vapidPublic = undefined;
    vapidPrivate = undefined;
  }

  if (!vapidPublic || !vapidPrivate) {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      try {
        const keys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf-8'));
        vapidPublic = keys.publicKey;
        vapidPrivate = keys.privateKey;
      } catch (e) {
        console.error('Error reading VAPID keys file:', e);
      }
    }
  }

  if (!vapidPublic || !vapidPrivate) {
    const keys = webPush.generateVAPIDKeys();
    vapidPublic = keys.publicKey;
    vapidPrivate = keys.privateKey;
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
    console.log('Generated and stored new VAPID keys in', VAPID_KEYS_FILE);
  }

  webPush.setVapidDetails(
    'mailto:support@ulfahchat.example.com',
    vapidPublic,
    vapidPrivate
  );

  // API endpoints
  app.get("/api/push-public-key", (req, res) => {
    res.json({ publicKey: vapidPublic });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/noor-ai", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    if (!ai) {
      return res.status(500).json({ error: "Noor AI is not configured. Please add GEMINI_API_KEY." });
    }

    try {
      // Format messages into Google GenAI format (user/model roles)
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: "You are Noor AI, an online Islamic Assistant. You specialize in Islamic teachings, Quran, Hadith, and Fiqh. You have access to Google Search to look up fatwas, reliable rulings, and accurate Islamic references. Always answer politely, respectfully, and beautifully. Use Urdu or English depending on how the user asks. When answering about a fatwa or religious matter, search Google if needed to verify contemporary fatwas (e.g., from Darul Ifta Karachi, Binoria, Deoband, etc.) and summarize accurately. Ensure you cite authentic sources and recommend consulting qualified local scholars for definitive personal rulings.",
          tools: [{ googleSearch: {} }],
          temperature: 0.5
        }
      });

      const text = response.text || "";
      
      // Extract grounding sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web?.title || "Reference",
          uri: chunk.web?.uri || ""
        }));

      res.json({ text, sources });
    } catch (error: any) {
      console.error("Noor AI API Error:", error);
      const errorStr = error instanceof Error ? error.message : String(error);
      const isQuotaError = 
        errorStr.toLowerCase().includes('quota') ||
        errorStr.toLowerCase().includes('resource-exhausted') ||
        errorStr.toLowerCase().includes('exceeded') ||
        errorStr.toLowerCase().includes('limit') ||
        errorStr.includes('429');

      if (isQuotaError) {
        return res.status(429).json({
          error: "پیارے صارف! جیمنی اے آئی (Gemini AI) کی فری سروس پر عارضی طور پر رش زیادہ ہے۔ براہ کرم ایک منٹ انتظار کر کے دوبارہ کوشش کریں۔ یہ مسئلہ خودکار طور پر حل ہو جائے گا، انشاء اللہ"
        });
      }

      res.status(500).json({ error: errorStr });
    }
  });

  app.post('/api/send-notification', async (req, res) => {
    const { recipientUids, title, body, icon, data } = req.body;
    if (!recipientUids || !Array.isArray(recipientUids)) {
      return res.status(400).json({ error: 'recipientUids must be an array' });
    }

    const processedUids: string[] = [];
    for (const uid of recipientUids) {
      if (!uid) continue;
      try {
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          const subscriptions: string[] = userData?.webPushSubscriptions || [];
          
          for (const subStr of subscriptions) {
            try {
              const subscriptionObj = JSON.parse(subStr);
              // Standard web-push format
              const payload = JSON.stringify({
                notification: {
                  title: title || 'New Message',
                  body: body || 'You received a message',
                  icon: icon || 'https://img.icons8.com/deco/200/000000/mosque.png',
                  badge: 'https://img.icons8.com/deco/200/000000/mosque.png',
                  tag: data?.type || 'chat',
                  data: data || {}
                }
              });
              await webPush.sendNotification(subscriptionObj, payload);
            } catch (pushErr: any) {
              console.error(`Failed to send webpush to user ${uid}:`, pushErr.message);
            }
          }
          processedUids.push(uid);
        }
      } catch (err: any) {
        console.error(`Failed to lookup/notify user ${uid}:`, err);
      }
    }

    res.json({ success: true, processedUids });
  });

  // Vite development integration or static files serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
