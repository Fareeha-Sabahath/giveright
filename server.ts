import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

interface StoredAuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  createdAt: string;
  ngoName?: string;
  contactPerson?: string;
  registrationId?: string;
  description?: string;
  verified?: boolean;
  isDemo: boolean;
  salt: string;
  passwordHash: string;
  lastPasswordUpdatedAt: string;
}

interface SafeUserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  createdAt: string;
  ngoName?: string;
  contactPerson?: string;
  registrationId?: string;
  description?: string;
  verified?: boolean;
}

interface DemoAccountSummary {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  city: string;
  verified: boolean;
  passwordStatus: string;
  lastPasswordUpdatedAt: string;
}

interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  expiresAtMs: number;
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredAuthUser;
  authToken?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE_NAME = 'giveright_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_STORE_FILE = path.join(DATA_DIR, 'auth-users.json');

function hashPassword(password: string, salt?: string): { salt: string; passwordHash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, passwordHash: derived };
}

function verifyPassword(password: string, salt: string, expectedHashHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400 * 1000).toISOString();
}

// Pre-computed salted scrypt hashes for initial demo accounts (no plaintext passwords in source).
// Optional env vars (DEMO_DONOR_PASSWORD, DEMO_NGO_PASSWORD, DEMO_ADMIN_PASSWORD) override at bootstrap.
function buildInitialCredentials(role: UserRole): { salt: string; passwordHash: string } {
  if (role === 'DONOR') {
    if (process.env.DEMO_DONOR_PASSWORD) {
      return hashPassword(process.env.DEMO_DONOR_PASSWORD);
    }
    return {
      salt: 'ae054bd257f45a64c173792fb669930f',
      passwordHash:
        '44a9ad8581b5b973b3148c4cc907310ca1307de7969317f09040ff24d9975bc1e9758e43994e18ff7489a162068cb8f57898a6c8a516d2cb662f300618715a57',
    };
  }
  if (role === 'NGO') {
    if (process.env.DEMO_NGO_PASSWORD) {
      return hashPassword(process.env.DEMO_NGO_PASSWORD);
    }
    return {
      salt: '8633173c0e1350027524cb1ba70d0bbe',
      passwordHash:
        'ee52edb19ac03a77397bed7b81de003585e0010a5c0d524523aa075d13361c3ed32bca9805e6a371627db244125fe49898ae2e75c618e5f7b87a593d944ecb3d',
    };
  }
  if (process.env.DEMO_ADMIN_PASSWORD) {
    return hashPassword(process.env.DEMO_ADMIN_PASSWORD);
  }
  return {
    salt: '70b9bf73787424b0df2434ff2e5af13d',
    passwordHash:
      '4cc9fbd45f83251776a2acda794973a9407657226c29c3af4e78d1d7dacdc660ba1eaa7176faecc1ceeeff4682ea2d151d022dd0b45f0553cf288da5065f4c82',
  };
}

function createInitialAuthUsers(): StoredAuthUser[] {
  const donorCreds = buildInitialCredentials('DONOR');
  const ngoCreds = buildInitialCredentials('NGO');
  const adminCreds = buildInitialCredentials('ADMIN');
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'donor-1',
      role: 'DONOR',
      name: 'Ananya Reddy',
      email: 'donor@giveright.in',
      phone: '+91 98490 11223',
      address: 'Plot 42, Financial District, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.4401,
      lng: 78.3489,
      createdAt: daysAgoIso(45),
      verified: true,
      isDemo: true,
      ...donorCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'donor-2',
      role: 'DONOR',
      name: 'Karthik Sharma',
      email: 'karthik.donor@giveright.in',
      phone: '+91 98491 44556',
      address: '14-2-88, RP Road, Secunderabad',
      city: 'Secunderabad',
      state: 'Telangana',
      lat: 17.4399,
      lng: 78.4983,
      createdAt: daysAgoIso(30),
      verified: true,
      isDemo: true,
      ...donorCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'donor-3',
      role: 'DONOR',
      name: 'Meera Deshmukh',
      email: 'meera.donor@giveright.in',
      phone: '+91 99123 77889',
      address: 'SR Nagar Cross Roads, Ameerpet',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.4375,
      lng: 78.4483,
      createdAt: daysAgoIso(22),
      verified: true,
      isDemo: true,
      ...donorCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'ngo-1',
      role: 'NGO',
      name: 'Asha Kiran Welfare Society',
      ngoName: 'Asha Kiran Welfare Society',
      contactPerson: 'Priya Nair',
      registrationId: 'TG/NGO/2018/04192',
      description:
        'Provides daily community meals, child nutrition kits, and school supplies to 450+ families across Kukatpally and West Hyderabad.',
      email: 'ngo@giveright.in',
      phone: '+91 97010 33445',
      address: 'KPHB Phase 3, Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.4948,
      lng: 78.3996,
      createdAt: daysAgoIso(60),
      verified: true,
      isDemo: true,
      ...ngoCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'ngo-2',
      role: 'NGO',
      name: 'Sneha Relief Foundation',
      ngoName: 'Sneha Relief Foundation',
      contactPerson: 'Ramesh Rao',
      registrationId: 'TG/NGO/2020/08814',
      description:
        'Operates emergency shelter support, senior care rations, and educational outreach in Uppal and Secunderabad.',
      email: 'sneha.ngo@giveright.in',
      phone: '+91 98660 99001',
      address: 'Survey of India Colony, Uppal',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.4058,
      lng: 78.5591,
      createdAt: daysAgoIso(50),
      verified: true,
      isDemo: true,
      ...ngoCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'ngo-3',
      role: 'NGO',
      name: 'Deccan Care Collective',
      ngoName: 'Deccan Care Collective',
      contactPerson: 'Farhan Siddiqui',
      registrationId: 'TG/NGO/2019/05210',
      description:
        'Supports urban shelter homes and primary health camps in Abids, Nampally, and Central Hyderabad.',
      email: 'deccan.ngo@giveright.in',
      phone: '+91 90001 55667',
      address: 'Tilak Road, Abids',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.385,
      lng: 78.4867,
      createdAt: daysAgoIso(40),
      verified: true,
      isDemo: true,
      ...ngoCreds,
      lastPasswordUpdatedAt: nowIso,
    },
    {
      id: 'admin-1',
      role: 'ADMIN',
      name: 'GiveRight Operations Control',
      email: 'admin@giveright.in',
      phone: '+91 40 2345 6789',
      address: 'Begumpet Civic Hub, Hyderabad',
      city: 'Hyderabad',
      state: 'Telangana',
      lat: 17.4447,
      lng: 78.4664,
      createdAt: daysAgoIso(90),
      verified: true,
      isDemo: true,
      ...adminCreds,
      lastPasswordUpdatedAt: nowIso,
    },
  ];
}

function loadUsersStore(): StoredAuthUser[] {
  try {
    if (fs.existsSync(AUTH_STORE_FILE)) {
      const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as StoredAuthUser[];
      }
    }
  } catch {
    // Fall back to fresh seed store if unreadable
  }
  const initial = createInitialAuthUsers();
  saveUsersStore(initial);
  return initial;
}

function saveUsersStore(users: StoredAuthUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {
    // Ignore filesystem errors gracefully
  }
}

function toSafeUser(user: StoredAuthUser): SafeUserProfile {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    lat: user.lat,
    lng: user.lng,
    createdAt: user.createdAt,
    ngoName: user.ngoName,
    contactPerson: user.contactPerson,
    registrationId: user.registrationId,
    description: user.description,
    verified: user.verified,
  };
}

function toDemoSummary(user: StoredAuthUser): DemoAccountSummary {
  return {
    id: user.id,
    role: user.role,
    name: user.ngoName || user.name,
    email: user.email,
    city: user.city,
    verified: Boolean(user.verified),
    passwordStatus: 'Protected (Salted Scrypt Hash)',
    lastPasswordUpdatedAt: user.lastPasswordUpdatedAt,
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) result[k] = decodeURIComponent(v);
  }
  return result;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }
  return null;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const usersStore: StoredAuthUser[] = loadUsersStore();
  const sessions = new Map<string, AuthSession>();

  const issueSession = (req: Request, res: Response, user: StoredAuthUser): string => {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
      token,
      userId: user.id,
      role: user.role,
      expiresAtMs: Date.now() + SESSION_TTL_MS,
    });
    setSessionCookie(req, res, token);
    return token;
  };

  const requireAuth = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const session = sessions.get(token);
    if (!session || session.expiresAtMs < Date.now()) {
      if (session) sessions.delete(token);
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }
    const user = usersStore.find((u) => u.id === session.userId);
    if (!user) {
      sessions.delete(token);
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    req.authUser = user;
    req.authToken = token;
    next();
  };

  const requireAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.authUser || req.authUser.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
      return;
    }
    next();
  };

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, expectedRole } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = usersStore.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password. Please verify your credentials.' });
      return;
    }
    if (
      expectedRole &&
      (expectedRole === 'DONOR' || expectedRole === 'NGO' || expectedRole === 'ADMIN') &&
      user.role !== expectedRole
    ) {
      res.status(403).json({
        error: `This account is registered as ${user.role}, not ${expectedRole}. Switch the role selector or use the matching account.`,
      });
      return;
    }
    const token = issueSession(req, res, user);
    res.json({ token, user: toSafeUser(user) });
  });

  // POST /api/auth/register (DONOR or NGO only)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const role = body.role;
    if (role !== 'DONOR' && role !== 'NGO') {
      res.status(400).json({ error: 'Registration is restricted to DONOR or NGO accounts.' });
      return;
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : 17.4375;
    const lng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : 78.4483;

    if (!email || !email.includes('@') || password.length < 6 || !phone || !address || !city || !state) {
      res.status(400).json({ error: 'Please complete all required registration fields (password min 6 chars).' });
      return;
    }
    if (usersStore.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { salt, passwordHash } = hashPassword(password);
    const nowIso = new Date().toISOString();

    let newUser: StoredAuthUser;
    if (role === 'DONOR') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Full name is required for Donor registration.' });
        return;
      }
      newUser = {
        id: `donor-${Date.now()}`,
        role: 'DONOR',
        name,
        email,
        phone,
        address,
        city,
        state,
        lat,
        lng,
        createdAt: nowIso,
        verified: true,
        isDemo: false,
        salt,
        passwordHash,
        lastPasswordUpdatedAt: nowIso,
      };
    } else {
      const ngoName = typeof body.ngoName === 'string' ? body.ngoName.trim() : '';
      const contactPerson = typeof body.contactPerson === 'string' ? body.contactPerson.trim() : '';
      const registrationId = typeof body.registrationId === 'string' ? body.registrationId.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      if (!ngoName || !contactPerson || !registrationId || !description) {
        res.status(400).json({ error: 'Please complete all NGO organization fields.' });
        return;
      }
      newUser = {
        id: `ngo-${Date.now()}`,
        role: 'NGO',
        name: ngoName,
        ngoName,
        contactPerson,
        registrationId,
        description,
        email,
        phone,
        address,
        city,
        state,
        lat,
        lng,
        createdAt: nowIso,
        verified: true,
        isDemo: false,
        salt,
        passwordHash,
        lastPasswordUpdatedAt: nowIso,
      };
    }

    usersStore.push(newUser);
    saveUsersStore(usersStore);
    const token = issueSession(req, res, newUser);
    res.status(201).json({ token, user: toSafeUser(newUser) });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      token: req.authToken,
      user: toSafeUser(req.authUser!),
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractToken(req);
    if (token) sessions.delete(token);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // PATCH /api/auth/profile (self-service safe fields only)
  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const body = req.body ?? {};
    const target = usersStore.find((u) => u.id === authUser.id);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (typeof body.phone === 'string' && body.phone.trim()) target.phone = body.phone.trim();
    if (typeof body.address === 'string' && body.address.trim()) target.address = body.address.trim();
    if (typeof body.city === 'string' && body.city.trim()) target.city = body.city.trim();
    if (typeof body.state === 'string' && body.state.trim()) target.state = body.state.trim();
    if (typeof body.lat === 'number' && Number.isFinite(body.lat)) target.lat = body.lat;
    if (typeof body.lng === 'number' && Number.isFinite(body.lng)) target.lng = body.lng;

    if (target.role === 'NGO') {
      if (typeof body.ngoName === 'string' && body.ngoName.trim()) {
        const cleanNgoName = body.ngoName.trim();
        target.ngoName = cleanNgoName;
        target.name = cleanNgoName;
      }
      if (typeof body.contactPerson === 'string' && body.contactPerson.trim()) {
        target.contactPerson = body.contactPerson.trim();
      }
      if (typeof body.description === 'string') {
        target.description = body.description.trim();
      }
    } else if (typeof body.name === 'string' && body.name.trim()) {
      target.name = body.name.trim();
    }

    saveUsersStore(usersStore);
    res.json({ user: toSafeUser(target) });
  });

  // GET /api/admin/users (Admin-only user directory for Admin Dashboard/Donors/NGOs)
  app.get(
    '/api/admin/users',
    requireAuth,
    requireAdmin,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ users: usersStore.map(toSafeUser) });
    }
  );

  // GET /api/admin/demo-accounts (Admin-only protected Demo Account Management list)
  app.get(
    '/api/admin/demo-accounts',
    requireAuth,
    requireAdmin,
    (_req: AuthenticatedRequest, res: Response) => {
      const accounts = usersStore.filter((u) => u.isDemo).map(toDemoSummary);
      res.json({ accounts });
    }
  );

  // POST /api/admin/demo-accounts/:id/reset-password (Admin-only password rotation)
  app.post(
    '/api/admin/demo-accounts/:id/reset-password',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const accountId = req.params.id;
      const { newPassword } = req.body ?? {};
      if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
        res.status(400).json({ error: 'New password must be between 6 and 128 characters.' });
        return;
      }

      const target = usersStore.find((u) => u.id === accountId && u.isDemo);
      if (!target) {
        res.status(404).json({ error: 'Demo account not found.' });
        return;
      }

      const { salt, passwordHash } = hashPassword(newPassword);
      target.salt = salt;
      target.passwordHash = passwordHash;
      target.lastPasswordUpdatedAt = new Date().toISOString();
      saveUsersStore(usersStore);

      // Revoke existing sessions for the target account (keep current admin session if rotating another account)
      for (const [tok, sess] of sessions.entries()) {
        if (sess.userId === target.id && tok !== req.authToken) {
          sessions.delete(tok);
        }
      }

      res.json({
        ok: true,
        account: toDemoSummary(target),
        message: `Password hash rotated for ${target.email}. Stored securely as a salted hash.`,
      });
    }
  );

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GiveRight server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
