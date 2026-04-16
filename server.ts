import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import * as jose from 'jose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const SETTINGS_FILE = path.join(process.cwd(), 'game-settings.json');
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-12345');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Initial Settings
const defaultSettings = {
  gameName: "Mafia Runner",
  characters: [
    { id: 0, image: 'https://picsum.photos/seed/p1/200/300', name: 'Agent Blue' },
    { id: 1, image: 'https://picsum.photos/seed/p2/200/300', name: 'Striker' },
    { id: 2, image: 'https://picsum.photos/seed/p3/200/300', name: 'Hoodie' },
    { id: 3, image: 'https://picsum.photos/seed/p4/200/300', name: 'Laugher' },
    { id: 4, image: 'https://picsum.photos/seed/p5/200/300', name: 'Gamer' },
  ],
  mafia: {
    id: 5,
    image: 'https://picsum.photos/seed/m1/200/300',
    name: 'Target Heroine',
  },
  mafiaDialogue: "চালু আসো বেবি আবাসিক এ যাব",
  difficulty: {
    initialSpeed: 5,
    gravity: 0.6,
    jumpForce: -13,
    gapMin: 100,
    gapMax: 200,
  },
  chaos: {
    frequency: 60,
    duration: 3,
    enabled: true,
  },
  audio: {
    jumpSoundUrl: '',
    gameOverSoundUrl: '',
  },
  dresses: [
    { id: 101, name: "Police Dress", image: "https://picsum.photos/seed/d1/200/200", cost: 50 },
    { id: 102, name: "Suit Black", image: "https://picsum.photos/seed/d2/200/200", cost: 150 },
    { id: 103, name: "Jumper Red", image: "https://picsum.photos/seed/d3/200/200", cost: 300 }
  ]
};

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const saved = JSON.parse(data);
      // Merge saved with defaults to ensure all fields exist
      return {
        ...defaultSettings,
        ...saved,
        difficulty: { ...defaultSettings.difficulty, ...(saved.difficulty || {}) },
        chaos: { ...defaultSettings.chaos, ...(saved.chaos || {}) },
        audio: { ...defaultSettings.audio, ...(saved.audio || {}) }
      };
    }
  } catch (e) {
    console.error('Error reading settings file:', e);
  }
  return defaultSettings;
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('Settings file updated at:', SETTINGS_FILE);
  } catch (e) {
    console.error('Critical: Failed to write settings file:', e);
    throw e;
  }
}

// API Routes
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const jwt = await new jose.SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(SECRET);
    
    res.cookie('admin_token', jwt, { 
      httpOnly: true, 
      sameSite: 'lax', 
      secure: true,
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });
    return res.json({ success: true, token: jwt });
  }
  res.status(401).json({ error: 'Access Denied' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// Middleware to check admin session
async function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  let token = req.cookies.admin_token;
  
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('Admin check failed: No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }

  try {
    const { payload } = await jose.jwtVerify(token, SECRET, {
      clockTolerance: 10, // 10 seconds tolerance for clock skew
    });
    (req as any).user = payload;
    next();
  } catch (e: any) {
    console.log('Admin check failed: Invalid token', e.message);
    res.status(401).json({ error: `Unauthorized: ${e.message}` });
  }
}

app.post('/api/settings', isAdmin, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
       return res.status(400).json({ error: 'Invalid settings data' });
    }
    saveSettings(req.body);
    console.log('Settings saved successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/check-auth', isAdmin, (req, res) => {
    res.json({ authenticated: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
