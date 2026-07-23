/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { 
  Parent, Child, ActivityLog, Rule, Command, LogType, RuleType, CommandType, CommandStatus 
} from '../types.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// Encryption utilities using AES-256-GCM
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'times_up_parental_secret_key_32_bytes_long';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptField(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  // Return formatted payload: iv:tag:content
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptField(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return encryptedPayload; // Fallback if not encrypted or different format
  try {
    const [ivHex, tagHex, contentHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning placeholder', err);
    return '[Decryption Failed]';
  }
}

// ---------------------------------------------------------
// HYBRID CONFIGURATION: MySQL vs JSON fallback
// ---------------------------------------------------------
const isMySQLConfigured = !!(process.env.MYSQL_HOST || process.env.DB_HOST);
let isMySQLActive = false;
let pool: mysql.Pool | null = null;

if (isMySQLConfigured) {
  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || process.env.DB_HOST,
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'times_up',
      port: process.env.MYSQL_PORT 
        ? parseInt(process.env.MYSQL_PORT) 
        : (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    isMySQLActive = true;
    
    // Asynchronously test database connection
    pool.getConnection()
      .then(conn => {
        console.log('Time\'s Up: Successfully connected to MySQL database pool!');
        conn.release();
      })
      .catch(() => {
        isMySQLActive = false;
        if (pool) {
          pool.end().catch(() => {});
          pool = null;
        }
      });
  } catch (err) {
    isMySQLActive = false;
    pool = null;
  }
}

// JSON fallback DB state
interface DatabaseSchema {
  parents: Parent[];
  children: Child[];
  activityLogs: ActivityLog[];
  rules: Rule[];
  commands: Command[];
}

let jsonDb: DatabaseSchema = {
  parents: [],
  children: [],
  activityLogs: [],
  rules: [],
  commands: []
};

function loadJsonDb() {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      jsonDb = JSON.parse(data);
    } else {
      saveJsonDb();
    }
  } catch (err) {
    console.error('Failed to load JSON database file', err);
  }
}

function saveJsonDb() {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(jsonDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save JSON database file', err);
  }
}

// Helper to execute MySQL queries with an automatic JSON database fallback on failure
async function queryMySQL<T>(mysqlFn: () => Promise<T>, jsonFn: () => T | Promise<T>): Promise<T> {
  if (isMySQLActive && pool) {
    try {
      return await mysqlFn();
    } catch (err: any) {
      isMySQLActive = false;
      if (pool) {
        pool.end().catch(() => {});
        pool = null;
      }
    }
  }
  return await jsonFn();
}

// ---------------------------------------------------------
// DATABASE OPERATIONS (Dual-Mode Interface)
// ---------------------------------------------------------

// --- PARENTS API ---
export async function getParentByEmail(email: string): Promise<Parent | undefined> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM parents WHERE email = ?', [email.toLowerCase()]);
      const list = rows as any[];
      if (list.length === 0) return undefined;
      const row = list[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      };
    },
    () => {
      loadJsonDb();
      return jsonDb.parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    }
  );
}

export async function createParent(email: string, passwordPlain: string): Promise<Parent> {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(passwordPlain, salt);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const parent: Parent = { id, email: email.toLowerCase(), passwordHash, createdAt };

  return queryMySQL(
    async () => {
      const existing = await getParentByEmail(email);
      if (existing) throw new Error('Parent with this email already exists');
      await pool!.execute(
        'INSERT INTO parents (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
        [id, email.toLowerCase(), passwordHash, new Date(createdAt)]
      );
      return parent;
    },
    () => {
      loadJsonDb();
      const existing = jsonDb.parents.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (existing) throw new Error('Parent with this email already exists');
      jsonDb.parents.push(parent);
      saveJsonDb();
      return parent;
    }
  );
}

// --- CHILDREN API ---
export async function getChildren(parentId: string): Promise<Child[]> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM children WHERE parentId = ?', [parentId]);
      return (rows as any[]).map(row => ({
        id: row.id,
        parentId: row.parentId,
        name: row.name,
        deviceToken: row.deviceToken,
        batteryPercent: row.batteryPercent,
        networkType: row.networkType,
        lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : '',
        isLocked: Boolean(row.isLocked),
        platform: row.platform || 'android',
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      }));
    },
    () => {
      loadJsonDb();
      return jsonDb.children.filter(c => c.parentId === parentId);
    }
  );
}

export async function getChildByToken(deviceToken: string): Promise<Child | undefined> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM children WHERE deviceToken = ?', [deviceToken]);
      const list = rows as any[];
      if (list.length === 0) return undefined;
      const row = list[0];
      return {
        id: row.id,
        parentId: row.parentId,
        name: row.name,
        deviceToken: row.deviceToken,
        batteryPercent: row.batteryPercent,
        networkType: row.networkType,
        lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : '',
        isLocked: Boolean(row.isLocked),
        platform: row.platform || 'android',
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      };
    },
    () => {
      loadJsonDb();
      return jsonDb.children.find(c => c.deviceToken === deviceToken);
    }
  );
}

export async function getChildById(childId: string): Promise<Child | undefined> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM children WHERE id = ?', [childId]);
      const list = rows as any[];
      if (list.length === 0) return undefined;
      const row = list[0];
      return {
        id: row.id,
        parentId: row.parentId,
        name: row.name,
        deviceToken: row.deviceToken,
        batteryPercent: row.batteryPercent,
        networkType: row.networkType,
        lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : '',
        isLocked: Boolean(row.isLocked),
        platform: row.platform || 'android',
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      };
    },
    () => {
      loadJsonDb();
      return jsonDb.children.find(c => c.id === childId);
    }
  );
}

export async function createChild(parentId: string, name: string, deviceToken: string, platform: 'android' | 'ios' | 'unknown' = 'android'): Promise<Child> {
  const child: Child = {
    id: crypto.randomUUID(),
    parentId,
    name,
    deviceToken,
    batteryPercent: 100,
    networkType: 'WiFi',
    lastSeenAt: new Date().toISOString(),
    isLocked: false,
    platform,
    createdAt: new Date().toISOString()
  };

  return queryMySQL(
    async () => {
      await pool!.execute(
        'INSERT INTO children (id, parentId, name, deviceToken, batteryPercent, networkType, lastSeenAt, isLocked, platform, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          child.id, 
          child.parentId, 
          child.name, 
          child.deviceToken, 
          child.batteryPercent, 
          child.networkType, 
          new Date(child.lastSeenAt), 
          child.isLocked ? 1 : 0, 
          child.platform, 
          new Date(child.createdAt)
        ]
      );
      await createDefaultRulesForChild(child.id);
      return child;
    },
    async () => {
      loadJsonDb();
      jsonDb.children.push(child);
      saveJsonDb();
      await createDefaultRulesForChild(child.id);
      return child;
    }
  );
}

export async function seedDemoLogsForChild(childId: string, childName: string): Promise<void> {
  const now = new Date();
  
  const apps = ['Chrome', 'YouTube', 'WhatsApp', 'Roblox', 'Duolingo', 'Spotify', 'Photos', 'Calculator'];
  const categories = {
    Chrome: 'Social',
    YouTube: 'Entertainment',
    WhatsApp: 'Social',
    Roblox: 'Gaming',
    Duolingo: 'Education',
    Spotify: 'Music',
    Photos: 'Other',
    Calculator: 'Education'
  };

  const appPackages = [
    { package: 'com.android.chrome', name: 'Chrome', installedAt: '2025-01-10T12:00:00Z' },
    { package: 'com.google.android.youtube', name: 'YouTube', installedAt: '2025-02-15T14:30:00Z' },
    { package: 'com.whatsapp', name: 'WhatsApp', installedAt: '2025-03-20T09:12:00Z' },
    { package: 'com.roblox.client', name: 'Roblox', installedAt: '2025-04-12T15:30:00Z' },
    { package: 'org.duolingo', name: 'Duolingo', installedAt: '2025-06-01T10:00:00Z' },
    { package: 'com.spotify.music', name: 'Spotify', installedAt: '2025-07-05T11:00:00Z' },
    { package: 'com.google.android.apps.photos', name: 'Photos', installedAt: '2025-01-01T08:00:00Z' },
    { package: 'com.android.calculator2', name: 'Calculator', installedAt: '2025-01-01T08:00:00Z' }
  ];

  const sites = [
    { url: 'https://www.facebook.com/profile', title: 'Facebook - Profile', domain: 'facebook.com' },
    { url: 'https://en.wikipedia.org/wiki/Parental_control', title: 'Parental Control - Wikipedia', domain: 'wikipedia.org' },
    { url: 'https://www.duolingo.com/learn', title: 'Learn Spanish Online - Duolingo', domain: 'duolingo.com' },
    { url: 'https://scratch.mit.edu', title: 'Scratch - Imagine, Program, Share', domain: 'mit.edu' },
    { url: 'https://www.youtube.com/watch?v=sc12', title: 'How to build a treehouse - YouTube', domain: 'youtube.com' }
  ];

  const contacts = [
    { name: 'David (Friend)', number: '+15550198' },
    { name: 'Emma (Friend)', number: '+15550244' },
    { name: 'Grandma', number: '+15550311' }
  ];

  const smsTexts = [
    { body: 'Hey! Are we still playing Roblox later?', direction: 'incoming' },
    { body: 'Yeah, entering now! Wait 5 min', direction: 'outgoing' },
    { body: 'Did you finish your Duolingo lesson today?', direction: 'incoming' },
    { body: 'Yes grandma! I will bike there with Sophia.', direction: 'outgoing' }
  ];

  // 1. Seed App Packages once
  for (const pkg of appPackages) {
    await createActivityLog(childId, LogType.INSTALLED_APP, pkg, new Date(pkg.installedAt).toISOString());
  }

  // 2. Loop over last 7 days to seed historical telemetry
  for (let d = 6; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // Screen Time Limit Log
    const dailyScreenTime = Math.floor(Math.random() * 80) + 100; // 100-180 mins
    await createActivityLog(childId, LogType.SCREEN_TIME, { minutes: dailyScreenTime }, `${dateStr}T21:00:00Z`);

    // App usage breakdown
    let remainingMinutes = dailyScreenTime;
    for (const appName of apps) {
      if (remainingMinutes <= 0) break;
      const useTime = Math.min(Math.floor(Math.random() * 40) + 10, remainingMinutes);
      if (useTime > 0) {
        await createActivityLog(childId, LogType.APP_USAGE, { 
          app: appName, 
          minutes: useTime, 
          category: (categories as any)[appName] || 'Other' 
        }, `${dateStr}T18:15:00Z`);
        remainingMinutes -= useTime;
      }
    }

    // Location history checks (trail)
    const baseLat = 37.7749 + (Math.random() * 0.01 - 0.005);
    const baseLng = -122.4194 + (Math.random() * 0.01 - 0.005);
    for (let h = 9; h <= 18; h += 3) {
      const lat = baseLat + ((h - 9) * 0.002);
      const lng = baseLng - ((h - 9) * 0.002);
      await createActivityLog(childId, LogType.LOCATION, { lat, lng, accuracy: 15 }, `${dateStr}T${h.toString().padStart(2, '0')}:30:00Z`);
    }

    // Web visits
    const site = sites[Math.floor(Math.random() * sites.length)];
    await createActivityLog(childId, LogType.WEB_VISIT, site, `${dateStr}T14:20:00Z`);

    // Call Log
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const isIncoming = Math.random() > 0.5;
    await createActivityLog(childId, LogType.CALL_LOG, {
      number: contact.number,
      name: contact.name,
      type: isIncoming ? 'incoming' : 'outgoing',
      duration: Math.floor(Math.random() * 120) + 20
    }, `${dateStr}T16:10:00Z`);

    // SMS Log
    const sms = smsTexts[Math.floor(Math.random() * smsTexts.length)];
    await createActivityLog(childId, LogType.SMS, {
      sender: contact.name,
      body: sms.body,
      direction: sms.direction
    }, `${dateStr}T11:40:00Z`);

    // Chat Message previews (Messenger, Snap, WhatsApp, Insta notifications)
    await createActivityLog(childId, LogType.MESSAGE, {
      app: 'WhatsApp',
      contact: contact.name,
      direction: 'incoming',
      preview: 'Hey did you see the new post on facebook?'
    }, `${dateStr}T12:05:00Z`);
  }
}

export async function updateChild(childId: string, updates: Partial<Omit<Child, 'id' | 'parentId' | 'deviceToken'>>): Promise<Child | undefined> {
  return queryMySQL(
    async () => {
      const fields: string[] = [];
      const values: any[] = [];
      
      // Dynamic updates mapping
      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.batteryPercent !== undefined) { fields.push('batteryPercent = ?'); values.push(updates.batteryPercent); }
      if (updates.networkType !== undefined) { fields.push('networkType = ?'); values.push(updates.networkType); }
      if (updates.isLocked !== undefined) { fields.push('isLocked = ?'); values.push(updates.isLocked ? 1 : 0); }
      if (updates.platform !== undefined) { fields.push('platform = ?'); values.push(updates.platform); }
      
      // Always update lastSeenAt
      const lastSeenAt = new Date().toISOString();
      fields.push('lastSeenAt = ?');
      values.push(new Date(lastSeenAt));

      if (fields.length > 0) {
        values.push(childId);
        await pool!.execute(`UPDATE children SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      return getChildById(childId);
    },
    () => {
      loadJsonDb();
      const index = jsonDb.children.findIndex(c => c.id === childId);
      if (index === -1) return undefined;
      
      jsonDb.children[index] = {
        ...jsonDb.children[index],
        ...updates,
        lastSeenAt: new Date().toISOString()
      };
      saveJsonDb();
      return jsonDb.children[index];
    }
  );
}

export async function transferChildToParent(childId: string, parentId: string): Promise<Child | undefined> {
  return queryMySQL(
    async () => {
      await pool!.execute('UPDATE children SET parentId = ? WHERE id = ?', [parentId, childId]);
      return getChildById(childId);
    },
    () => {
      loadJsonDb();
      const index = jsonDb.children.findIndex(c => c.id === childId);
      if (index === -1) return undefined;
      jsonDb.children[index].parentId = parentId;
      saveJsonDb();
      return jsonDb.children[index];
    }
  );
}

export async function deleteChild(childId: string): Promise<boolean> {
  return queryMySQL(
    async () => {
      const [res] = await pool!.execute('DELETE FROM children WHERE id = ?', [childId]);
      return (res as any).affectedRows > 0;
    },
    () => {
      loadJsonDb();
      const childIndex = jsonDb.children.findIndex(c => c.id === childId);
      if (childIndex === -1) return false;
      
      jsonDb.children.splice(childIndex, 1);
      
      // Cascade delete related records
      jsonDb.rules = jsonDb.rules.filter(r => r.childId !== childId);
      jsonDb.commands = jsonDb.commands.filter(c => c.childId !== childId);
      jsonDb.activityLogs = jsonDb.activityLogs.filter(l => l.childId !== childId);
      
      saveJsonDb();
      return true;
    }
  );
}

// --- RULES API ---
export async function getRules(childId: string): Promise<Rule[]> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM rules WHERE childId = ?', [childId]);
      return (rows as any[]).map(row => ({
        id: row.id,
        childId: row.childId,
        ruleType: row.ruleType as RuleType,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
        enabled: Boolean(row.enabled)
      }));
    },
    () => {
      loadJsonDb();
      return jsonDb.rules.filter(r => r.childId === childId);
    }
  );
}

export async function getActiveRules(childId: string): Promise<Rule[]> {
  return queryMySQL(
    async () => {
      const [rows] = await pool!.execute('SELECT * FROM rules WHERE childId = ? AND enabled = 1', [childId]);
      return (rows as any[]).map(row => ({
        id: row.id,
        childId: row.childId,
        ruleType: row.ruleType as RuleType,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
        enabled: Boolean(row.enabled)
      }));
    },
    () => {
      loadJsonDb();
      return jsonDb.rules.filter(r => r.childId === childId && r.enabled);
    }
  );
}

export async function createRule(childId: string, ruleType: RuleType, config: any): Promise<Rule> {
  const rule: Rule = {
    id: crypto.randomUUID(),
    childId,
    ruleType,
    config,
    enabled: true
  };

  return queryMySQL(
    async () => {
      await pool!.execute(
        'INSERT INTO rules (id, childId, ruleType, config, enabled) VALUES (?, ?, ?, ?, ?)',
        [rule.id, rule.childId, rule.ruleType, JSON.stringify(rule.config), rule.enabled ? 1 : 0]
      );
      return rule;
    },
    () => {
      loadJsonDb();
      jsonDb.rules.push(rule);
      saveJsonDb();
      return rule;
    }
  );
}

export async function updateRule(ruleId: string, updates: Partial<Omit<Rule, 'id' | 'childId' | 'ruleType'>>): Promise<Rule | undefined> {
  return queryMySQL(
    async () => {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }
      if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }

      if (fields.length > 0) {
        values.push(ruleId);
        await pool!.execute(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      
      const [rows] = await pool!.execute('SELECT * FROM rules WHERE id = ?', [ruleId]);
      const list = rows as any[];
      if (list.length === 0) return undefined;
      const row = list[0];
      return {
        id: row.id,
        childId: row.childId,
        ruleType: row.ruleType as RuleType,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
        enabled: Boolean(row.enabled)
      };
    },
    () => {
      loadJsonDb();
      const index = jsonDb.rules.findIndex(r => r.id === ruleId);
      if (index === -1) return undefined;
      
      jsonDb.rules[index] = {
        ...jsonDb.rules[index],
        ...updates
      };
      saveJsonDb();
      return jsonDb.rules[index];
    }
  );
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  return queryMySQL(
    async () => {
      const [res] = await pool!.execute('DELETE FROM rules WHERE id = ?', [ruleId]);
      return (res as any).affectedRows > 0;
    },
    () => {
      loadJsonDb();
      const index = jsonDb.rules.findIndex(r => r.id === ruleId);
      if (index === -1) return false;
      jsonDb.rules.splice(index, 1);
      saveJsonDb();
      return true;
    }
  );
}

async function createDefaultRulesForChild(childId: string) {
  // 1. Bedtime rule (10 PM to 6 AM)
  await createRule(childId, RuleType.BEDTIME, { startTime: '22:00', endTime: '06:00', timezone: 'UTC' });
  // 2. Screen time limit rule (120 minutes)
  await createRule(childId, RuleType.SCREEN_TIME_LIMIT, { maxMinutesPerDay: 120 });
  // 3. Some default blocked apps
  await createRule(childId, RuleType.BLOCKED_APP, { appName: 'TikTok', package: 'com.zhiliaoapp.musically' });
  await createRule(childId, RuleType.BLOCKED_APP, { appName: 'Instagram', package: 'com.instagram.android' });
  // 4. Some default blocked websites
  await createRule(childId, RuleType.BLOCKED_WEBSITE, { domain: 'tiktok.com' });
  await createRule(childId, RuleType.BLOCKED_WEBSITE, { domain: 'instagram.com' });
}

// --- COMMANDS API ---
export async function getCommands(childId: string, status?: CommandStatus): Promise<Command[]> {
  return queryMySQL(
    async () => {
      let q = 'SELECT * FROM commands WHERE childId = ?';
      const params = [childId];
      if (status) {
        q += ' AND status = ?';
        params.push(status);
      }
      const [rows] = await pool!.execute(q, params);
      return (rows as any[]).map(row => ({
        id: row.id,
        childId: row.childId,
        command: row.command as CommandType,
        status: row.status as CommandStatus,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      }));
    },
    () => {
      loadJsonDb();
      return jsonDb.commands.filter(c => c.childId === childId && (!status || c.status === status));
    }
  );
}

export async function createCommand(childId: string, commandType: CommandType): Promise<Command> {
  const cmd: Command = {
    id: crypto.randomUUID(),
    childId,
    command: commandType,
    status: CommandStatus.PENDING,
    createdAt: new Date().toISOString()
  };

  return queryMySQL(
    async () => {
      await pool!.execute(
        'INSERT INTO commands (id, childId, command, status, createdAt) VALUES (?, ?, ?, ?, ?)',
        [cmd.id, cmd.childId, cmd.command, cmd.status, new Date(cmd.createdAt)]
      );
      return cmd;
    },
    () => {
      loadJsonDb();
      jsonDb.commands.push(cmd);
      saveJsonDb();
      return cmd;
    }
  );
}

export async function updateCommandStatus(commandId: string, status: CommandStatus): Promise<Command | undefined> {
  return queryMySQL(
    async () => {
      await pool!.execute('UPDATE commands SET status = ? WHERE id = ?', [status, commandId]);
      const [rows] = await pool!.execute('SELECT * FROM commands WHERE id = ?', [commandId]);
      const list = rows as any[];
      if (list.length === 0) return undefined;
      const row = list[0];
      return {
        id: row.id,
        childId: row.childId,
        command: row.command as CommandType,
        status: row.status as CommandStatus,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : ''
      };
    },
    () => {
      loadJsonDb();
      const index = jsonDb.commands.findIndex(c => c.id === commandId);
      if (index === -1) return undefined;
      
      jsonDb.commands[index].status = status;
      saveJsonDb();
      return jsonDb.commands[index];
    }
  );
}

// --- ACTIVITY LOGS API ---
export async function createActivityLog(childId: string, logType: LogType, rawData: any, occurredAt?: string): Promise<ActivityLog> {
  // Apply encryption on sensitive fields at rest
  let data = { ...rawData };
  if (logType === LogType.SMS) {
    if (data.body) {
      data.body = encryptField(data.body);
      data._encrypted = true;
    }
  } else if (logType === LogType.CALL_LOG) {
    if (data.number) data.number = encryptField(data.number);
    if (data.name) data.name = encryptField(data.name);
    data._encrypted = true;
  }

  const timestamp = occurredAt || new Date().toISOString();
  const log: ActivityLog = {
    id: crypto.randomUUID(),
    childId,
    logType,
    data,
    occurredAt: timestamp
  };

  return queryMySQL(
    async () => {
      await pool!.execute(
        'INSERT INTO activity_logs (id, childId, logType, data, occurredAt) VALUES (?, ?, ?, ?, ?)',
        [log.id, log.childId, log.logType, JSON.stringify(log.data), new Date(log.occurredAt)]
      );
      return log;
    },
    () => {
      loadJsonDb();
      jsonDb.activityLogs.push(log);
      saveJsonDb();
      return log;
    }
  );
}

export async function getParentLogs(childId: string, filters: { logType?: LogType; from?: string; to?: string }): Promise<ActivityLog[]> {
  let logs: ActivityLog[] = [];

  return queryMySQL(
    async () => {
      let q = 'SELECT * FROM activity_logs WHERE childId = ?';
      const params: any[] = [childId];
      
      if (filters.logType) {
        q += ' AND logType = ?';
        params.push(filters.logType);
      }
      if (filters.from) {
        q += ' AND occurredAt >= ?';
        params.push(new Date(filters.from));
      }
      if (filters.to) {
        q += ' AND occurredAt <= ?';
        params.push(new Date(filters.to));
      }

      q += ' ORDER BY occurredAt DESC';

      const [rows] = await pool!.execute(q, params);
      const dbLogs = (rows as any[]).map(row => ({
        id: row.id,
        childId: row.childId,
        logType: row.logType as LogType,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        occurredAt: row.occurredAt ? new Date(row.occurredAt).toISOString() : ''
      }));

      // Decrypt SMS body and call log name/number when serving parents
      return dbLogs.map(log => {
        const cloned = JSON.parse(JSON.stringify(log)) as ActivityLog;
        if (cloned.logType === LogType.SMS && cloned.data?._encrypted) {
          cloned.data.body = decryptField(cloned.data.body);
        } else if (cloned.logType === LogType.CALL_LOG && cloned.data?._encrypted) {
          cloned.data.number = decryptField(cloned.data.number);
          cloned.data.name = decryptField(cloned.data.name);
        }
        return cloned;
      });
    },
    () => {
      loadJsonDb();
      let localLogs = jsonDb.activityLogs.filter(l => l.childId === childId);
      
      if (filters.logType) {
        localLogs = localLogs.filter(l => l.logType === filters.logType);
      }
      if (filters.from) {
        const fromTime = new Date(filters.from).getTime();
        localLogs = localLogs.filter(l => new Date(l.occurredAt).getTime() >= fromTime);
      }
      if (filters.to) {
        const toTime = new Date(filters.to).getTime();
        localLogs = localLogs.filter(l => new Date(l.occurredAt).getTime() <= toTime);
      }
      localLogs.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      // Decrypt SMS body and call log name/number when serving parents
      return localLogs.map(log => {
        const cloned = JSON.parse(JSON.stringify(log)) as ActivityLog;
        if (cloned.logType === LogType.SMS && cloned.data?._encrypted) {
          cloned.data.body = decryptField(cloned.data.body);
        } else if (cloned.logType === LogType.CALL_LOG && cloned.data?._encrypted) {
          cloned.data.number = decryptField(cloned.data.number);
          cloned.data.name = decryptField(cloned.data.name);
        }
        return cloned;
      });
    }
  );
}

// SEEDER IMPLEMENTATION
export async function seedDatabaseForParent(parentId: string, parentEmail: string) {
  // Check if children already exist for this parent to prevent duplicates
  const existingChildren = await getChildren(parentId);
  if (existingChildren.length > 0) {
    console.log(`Parent ${parentEmail} already has children. Skipping child seeding.`);
    return;
  }

  console.log(`Seeding demo children for parent ${parentEmail}...`);

  const alexToken = `alex-device-${parentId.substring(0, 8)}`;
  const sophiaToken = `sophia-device-${parentId.substring(0, 8)}`;

  // 1. Create Children
  const child = await createChild(parentId, 'Alex', alexToken, 'android');
  const child2 = await createChild(parentId, 'Sophia', sophiaToken, 'ios');

  // Update battery and networks
  await updateChild(child.id, { batteryPercent: 78, networkType: 'WiFi', platform: 'android' });
  await updateChild(child2.id, { batteryPercent: 94, networkType: 'LTE', platform: 'ios' });

  // 2. Generate 7 Days of historical records
  const now = new Date();

  // Define mock details
  const apps = ['YouTube', 'Roblox', 'WhatsApp', 'Minecraft', 'Spotify', 'Chrome', 'Duolingo', 'Calculator', 'Temple Run', 'TikTok'];
  const categories = {
    YouTube: 'Entertainment',
    Roblox: 'Gaming',
    WhatsApp: 'Social',
    Minecraft: 'Gaming',
    Spotify: 'Music',
    Chrome: 'Social',
    Duolingo: 'Education',
    Calculator: 'Education',
    'Temple Run': 'Gaming',
    TikTok: 'Entertainment'
  };

  const sites = [
    { url: 'https://en.wikipedia.org/wiki/Parental_control', title: 'Parental Control - Wikipedia', domain: 'wikipedia.org' },
    { url: 'https://www.duolingo.com/learn', title: 'Learn Spanish Online - Duolingo', domain: 'duolingo.com' },
    { url: 'https://scratch.mit.edu', title: 'Scratch - Imagine, Program, Share', domain: 'mit.edu' },
    { url: 'https://www.tiktok.com/@gaming_moments', title: 'Cool Roblox Clips | TikTok', domain: 'tiktok.com' },
    { url: 'https://www.youtube.com/watch?v=sc12', title: 'How to build a treehouse - YouTube', domain: 'youtube.com' },
    { url: 'https://m.roblox.com/home', title: 'Roblox Home', domain: 'roblox.com' },
    { url: 'https://mathplayground.com', title: 'Cool Math Games for Kids', domain: 'mathplayground.com' }
  ];

  const contacts = [
    { name: 'David (Friend)', number: '+15550198' },
    { name: 'Emma (Friend)', number: '+15550244' },
    { name: 'Grandma', number: '+15550311' },
    { name: 'Coach Williams', number: '+15550155' }
  ];

  const smsTexts = [
    { body: 'Hey! Are you online on Roblox? Let\'s join the server', direction: 'incoming' },
    { body: 'Yeah, entering now! Wait 5 min', direction: 'outgoing' },
    { body: 'Did you finish your math project? Coach says practice is at 4pm', direction: 'incoming' },
    { body: 'No not yet, doing it on Chrome right now.', direction: 'outgoing' },
    { body: 'Grandma says she made cookies, come over after school!', direction: 'incoming' },
    { body: 'Thanks grandma! I will bike there with Sophia.', direction: 'outgoing' }
  ];

  const appPackages = [
    { package: 'com.google.android.youtube', name: 'YouTube', installedAt: '2025-02-10T10:00:00Z' },
    { package: 'com.roblox.client', name: 'Roblox', installedAt: '2025-04-12T15:30:00Z' },
    { package: 'com.whatsapp', name: 'WhatsApp', installedAt: '2025-01-15T09:12:00Z' },
    { package: 'org.duolingo', name: 'Duolingo', installedAt: '2026-06-01T12:00:00Z' },
    { package: 'com.zhiliaoapp.musically', name: 'TikTok', installedAt: '2025-11-20T18:45:00Z' }
  ];

  // Seed app packages once for each child
  for (const pkg of appPackages) {
    await createActivityLog(child.id, LogType.INSTALLED_APP, pkg, new Date(pkg.installedAt).toISOString());
    await createActivityLog(child2.id, LogType.INSTALLED_APP, pkg, new Date(pkg.installedAt).toISOString());
  }

  // Loop over last 7 days
  for (let d = 7; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // For each child
    for (const cId of [child.id, child2.id]) {
      // 1. Daily Screen Time (100 - 180 min per day)
      const dailyScreenTime = Math.floor(Math.random() * 80) + 100;
      await createActivityLog(cId, LogType.SCREEN_TIME, { minutes: dailyScreenTime }, `${dateStr}T21:00:00Z`);

      // 2. App usage chunks
      let remainingMinutes = dailyScreenTime;
      for (const app of apps) {
        if (remainingMinutes <= 0) break;
        const useTime = Math.min(Math.floor(Math.random() * 40) + 10, remainingMinutes);
        if (useTime > 0) {
          await createActivityLog(cId, LogType.APP_USAGE, { 
            app, 
            minutes: useTime, 
            category: (categories as any)[app] || 'Other' 
          }, `${dateStr}T18:${Math.floor(Math.random() * 50).toString().padStart(2, '0')}:00Z`);
          remainingMinutes -= useTime;
        }
      }

      // 3. Location History (Multiple checks along a path)
      const baseLat = cId === child.id ? 37.7749 : 34.0522; // SF vs LA
      const baseLng = cId === child.id ? -122.4194 : -118.2437;

      for (let h = 8; h <= 20; h += 3) {
        const factor = (h - 8) / 12;
        const lat = baseLat + (factor * 0.015) + (Math.random() * 0.002 - 0.001);
        const lng = baseLng - (factor * 0.015) + (Math.random() * 0.002 - 0.001);
        await createActivityLog(cId, LogType.LOCATION, { lat, lng, accuracy: 15 }, `${dateStr}T${h.toString().padStart(2, '0')}:30:00Z`);
      }

      // 4. Web Visits (3-5 per day)
      const visitsCount = Math.floor(Math.random() * 3) + 2;
      for (let v = 0; v < visitsCount; v++) {
        const site = sites[Math.floor(Math.random() * sites.length)];
        const hour = 10 + Math.floor(Math.random() * 10);
        await createActivityLog(cId, LogType.WEB_VISIT, site, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 5. Call Logs (1-2 per day)
      const callsCount = Math.floor(Math.random() * 2) + 1;
      for (let cl = 0; cl < callsCount; cl++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const type = ['incoming', 'outgoing', 'missed'][Math.floor(Math.random() * 3)] as any;
        const duration = type === 'missed' ? 0 : Math.floor(Math.random() * 300) + 30; // seconds
        const hour = 9 + Math.floor(Math.random() * 12);

        await createActivityLog(cId, LogType.CALL_LOG, {
          number: contact.number,
          name: contact.name,
          type,
          duration
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 6. SMS Messages (2-4 per day)
      const smsCount = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < smsCount; s++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const smsTemplate = smsTexts[Math.floor(Math.random() * smsTexts.length)];
        const hour = 8 + Math.floor(Math.random() * 14);

        await createActivityLog(cId, LogType.SMS, {
          sender: contact.name,
          body: smsTemplate.body,
          direction: smsTemplate.direction
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 7. Messages (In-App like WhatsApp previews, 2-3 per day)
      const appMsgCount = Math.floor(Math.random() * 2) + 1;
      for (let m = 0; m < appMsgCount; m++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const hour = 11 + Math.floor(Math.random() * 11);
        await createActivityLog(cId, LogType.MESSAGE, {
          app: 'WhatsApp',
          contact: contact.name,
          direction: 'incoming',
          preview: 'Hey did you finish the assignment? Let me know'
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }
    }
  }

  // Set up some commands
  await createCommand(child.id, CommandType.LOCATE);
  const lockCmd = await createCommand(child.id, CommandType.LOCK);
  await updateCommandStatus(lockCmd.id, CommandStatus.ACK);

  console.log(`Seeding completed successfully for parent: ${parentEmail}`);
}

// SEEDER IMPLEMENTATION
export async function seedDatabase(parentEmail: string = 'parent@timesup.com') {
  if (isMySQLActive && pool) {
    // Check if parent already exists in database
    const existing = await getParentByEmail(parentEmail);
    if (existing) {
      console.log('Database already has parents in MySQL. Skipping seeding.');
      return;
    }
  } else {
    loadJsonDb();
    if (jsonDb.parents.length > 0) {
      console.log('Database already has parents in local storage. Skipping seeding.');
      return;
    }
  }

  console.log('Seeding demo database...');

  // 1. Create Parent (will be inserted into MySQL or jsonDb appropriately)
  const parent = await createParent(parentEmail, 'password123');

  // 2. Create Children
  const child = await createChild(parent.id, 'Alex', 'alex-device-uuid-123', 'android');
  const child2 = await createChild(parent.id, 'Sophia', 'sophia-device-uuid-456', 'ios');

  // Update battery and networks
  await updateChild(child.id, { batteryPercent: 78, networkType: 'WiFi', platform: 'android' });
  await updateChild(child2.id, { batteryPercent: 94, networkType: 'LTE', platform: 'ios' });

  // 3. Generate 7 Days of historical records
  const now = new Date();

  // Define mock details
  const apps = ['YouTube', 'Roblox', 'WhatsApp', 'Minecraft', 'Spotify', 'Chrome', 'Duolingo', 'Calculator', 'Temple Run', 'TikTok'];
  const categories = {
    YouTube: 'Entertainment',
    Roblox: 'Gaming',
    WhatsApp: 'Social',
    Minecraft: 'Gaming',
    Spotify: 'Music',
    Chrome: 'Social',
    Duolingo: 'Education',
    Calculator: 'Education',
    'Temple Run': 'Gaming',
    TikTok: 'Entertainment'
  };

  const sites = [
    { url: 'https://en.wikipedia.org/wiki/Parental_control', title: 'Parental Control - Wikipedia', domain: 'wikipedia.org' },
    { url: 'https://www.duolingo.com/learn', title: 'Learn Spanish Online - Duolingo', domain: 'duolingo.com' },
    { url: 'https://scratch.mit.edu', title: 'Scratch - Imagine, Program, Share', domain: 'mit.edu' },
    { url: 'https://www.tiktok.com/@gaming_moments', title: 'Cool Roblox Clips | TikTok', domain: 'tiktok.com' },
    { url: 'https://www.youtube.com/watch?v=sc12', title: 'How to build a treehouse - YouTube', domain: 'youtube.com' },
    { url: 'https://m.roblox.com/home', title: 'Roblox Home', domain: 'roblox.com' },
    { url: 'https://mathplayground.com', title: 'Cool Math Games for Kids', domain: 'mathplayground.com' }
  ];

  const contacts = [
    { name: 'David (Friend)', number: '+15550198' },
    { name: 'Emma (Friend)', number: '+15550244' },
    { name: 'Grandma', number: '+15550311' },
    { name: 'Coach Williams', number: '+15550155' }
  ];

  const smsTexts = [
    { body: 'Hey! Are you online on Roblox? Let\'s join the server', direction: 'incoming' },
    { body: 'Yeah, entering now! Wait 5 min', direction: 'outgoing' },
    { body: 'Did you finish your math project? Coach says practice is at 4pm', direction: 'incoming' },
    { body: 'No not yet, doing it on Chrome right now.', direction: 'outgoing' },
    { body: 'Grandma says she made cookies, come over after school!', direction: 'incoming' },
    { body: 'Thanks grandma! I will bike there with Sophia.', direction: 'outgoing' }
  ];

  const appPackages = [
    { package: 'com.google.android.youtube', name: 'YouTube', installedAt: '2025-02-10T10:00:00Z' },
    { package: 'com.roblox.client', name: 'Roblox', installedAt: '2025-04-12T15:30:00Z' },
    { package: 'com.whatsapp', name: 'WhatsApp', installedAt: '2025-01-15T09:12:00Z' },
    { package: 'org.duolingo', name: 'Duolingo', installedAt: '2026-06-01T12:00:00Z' },
    { package: 'com.zhiliaoapp.musically', name: 'TikTok', installedAt: '2025-11-20T18:45:00Z' }
  ];

  // Seed app packages once for each child
  for (const pkg of appPackages) {
    await createActivityLog(child.id, LogType.INSTALLED_APP, pkg, new Date(pkg.installedAt).toISOString());
    await createActivityLog(child2.id, LogType.INSTALLED_APP, pkg, new Date(pkg.installedAt).toISOString());
  }

  // Loop over last 7 days
  for (let d = 7; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // For each child
    for (const cId of [child.id, child2.id]) {
      // 1. Daily Screen Time (100 - 180 min per day)
      const dailyScreenTime = Math.floor(Math.random() * 80) + 100;
      await createActivityLog(cId, LogType.SCREEN_TIME, { minutes: dailyScreenTime }, `${dateStr}T21:00:00Z`);

      // 2. App usage chunks
      let remainingMinutes = dailyScreenTime;
      for (const app of apps) {
        if (remainingMinutes <= 0) break;
        const useTime = Math.min(Math.floor(Math.random() * 40) + 10, remainingMinutes);
        if (useTime > 0) {
          await createActivityLog(cId, LogType.APP_USAGE, { 
            app, 
            minutes: useTime, 
            category: (categories as any)[app] || 'Other' 
          }, `${dateStr}T18:${Math.floor(Math.random() * 50).toString().padStart(2, '0')}:00Z`);
          remainingMinutes -= useTime;
        }
      }

      // 3. Location History (Multiple checks along a path)
      const baseLat = cId === child.id ? 37.7749 : 34.0522; // SF vs LA
      const baseLng = cId === child.id ? -122.4194 : -118.2437;

      for (let h = 8; h <= 20; h += 3) {
        const factor = (h - 8) / 12;
        const lat = baseLat + (factor * 0.015) + (Math.random() * 0.002 - 0.001);
        const lng = baseLng - (factor * 0.015) + (Math.random() * 0.002 - 0.001);
        await createActivityLog(cId, LogType.LOCATION, { lat, lng, accuracy: 15 }, `${dateStr}T${h.toString().padStart(2, '0')}:30:00Z`);
      }

      // 4. Web Visits (3-5 per day)
      const visitsCount = Math.floor(Math.random() * 3) + 2;
      for (let v = 0; v < visitsCount; v++) {
        const site = sites[Math.floor(Math.random() * sites.length)];
        const hour = 10 + Math.floor(Math.random() * 10);
        await createActivityLog(cId, LogType.WEB_VISIT, site, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 5. Call Logs (1-2 per day)
      const callsCount = Math.floor(Math.random() * 2) + 1;
      for (let cl = 0; cl < callsCount; cl++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const type = ['incoming', 'outgoing', 'missed'][Math.floor(Math.random() * 3)] as any;
        const duration = type === 'missed' ? 0 : Math.floor(Math.random() * 300) + 30; // seconds
        const hour = 9 + Math.floor(Math.random() * 12);

        await createActivityLog(cId, LogType.CALL_LOG, {
          number: contact.number,
          name: contact.name,
          type,
          duration
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 6. SMS Messages (2-4 per day)
      const smsCount = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < smsCount; s++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const smsTemplate = smsTexts[Math.floor(Math.random() * smsTexts.length)];
        const hour = 8 + Math.floor(Math.random() * 14);

        await createActivityLog(cId, LogType.SMS, {
          sender: contact.name,
          body: smsTemplate.body,
          direction: smsTemplate.direction
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }

      // 7. Messages (In-App like WhatsApp previews, 2-3 per day)
      const appMsgCount = Math.floor(Math.random() * 2) + 1;
      for (let m = 0; m < appMsgCount; m++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const hour = 11 + Math.floor(Math.random() * 11);
        await createActivityLog(cId, LogType.MESSAGE, {
          app: 'WhatsApp',
          contact: contact.name,
          direction: 'incoming',
          preview: 'Hey did you finish the assignment? Let me know'
        }, `${dateStr}T${hour}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00Z`);
      }
    }
  }

  // Set up some commands
  await createCommand(child.id, CommandType.LOCATE);
  const lockCmd = await createCommand(child.id, CommandType.LOCK);
  await updateCommandStatus(lockCmd.id, CommandStatus.ACK);

  console.log('Seeding successfully completed!');
}
