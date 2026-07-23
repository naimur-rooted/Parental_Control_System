/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { 
  getParentByEmail, createParent, getChildren, getChildByToken, getChildById,
  createChild, updateChild, transferChildToParent, deleteChild, getRules, createRule, updateRule, deleteRule,
  getCommands, createCommand, updateCommandStatus, createActivityLog, getParentLogs,
  seedDatabase, seedDatabaseForParent
} from './src/server/db';
import { LogType, RuleType, CommandType, CommandStatus } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'times_up_parental_control_jwt_secret_key_9988';

// Ensure test token abd42be0 is active in the database
async function ensureTestTokenActive() {
  const testToken = 'abd42be0';
  try {
    const existingChild = await getChildByToken(testToken);
    if (!existingChild) {
      console.log(`Test token ${testToken} not found. Creating a test child device...`);
      let parent = await getParentByEmail('parent@timesup.com');
      if (!parent) {
        parent = await getParentByEmail('hira@gmail.com');
      }
      if (!parent) {
        parent = await createParent('parent@timesup.com', 'password123');
      }
      if (parent) {
        const child = await createChild(parent.id, 'Alex Mobile', testToken, 'android');
        await updateChild(child.id, { batteryPercent: 95, networkType: 'WiFi', platform: 'android' });
        console.log(`Successfully created test child device "Alex Mobile" with token ${testToken} under parent ${parent.email}`);
      }
    } else {
      console.log(`Test token ${testToken} is already active in the database.`);
    }
  } catch (err) {
    console.error('Error ensuring test token active:', err);
  }
}

// Seed database on boot
seedDatabase()
  .then(() => ensureTestTokenActive())
  .catch(err => {
    console.error('Database seed error', err);
  });

// Support JSON bodies up to 10mb for logs
app.use(express.json({ limit: '10mb' }));

// Global CORS registration (enables parent dashboard connection locally)
app.use(cors());

// Custom CORS handler for child app (/api/public/*) with explicit headers
app.use((req, res, next) => {
  if (req.path.startsWith('/api/public/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
  }
  next();
});

// Middleware for Parent JWT Verification
interface ParentRequest extends Request {
  parent?: { id: string; email: string };
}

function verifyParentJWT(req: ParentRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.parent = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware for Child App Device Token Verification
interface ChildRequest extends Request {
  child?: { id: string; deviceToken: string; parentId: string };
}

async function verifyChildDeviceToken(req: ChildRequest, res: Response, next: NextFunction) {
  const deviceToken = req.headers['x-device-token'] as string;
  if (!deviceToken) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid pairing code' });
  }
  
  try {
    const child = await getChildByToken(deviceToken);
    if (!child) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({ error: 'Invalid pairing code' });
    }
    
    req.child = {
      id: child.id,
      deviceToken: child.deviceToken,
      parentId: child.parentId
    };
    next();
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Internal verification failed', details: err.message });
  }
}

// ==========================================
// AUTHENTICATION ENDPOINTS (Parents)
// ==========================================

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const parent = await createParent(email, password);
    
    // Automatically seed beautiful parent-specific demo children (Alex and Sophia)
    // with unique tokens so the dashboard is immediately ready and interactive!
    try {
      await seedDatabaseForParent(parent.id, parent.email);
    } catch (seedErr) {
      console.error('Error auto-seeding new parent account:', seedErr);
    }

    const token = jwt.sign({ id: parent.id, email: parent.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      token, 
      parent: { id: parent.id, email: parent.email } 
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const parent = await getParentByEmail(email);
    if (!parent) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const passwordMatch = bcrypt.compareSync(password, parent.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Seed on login if the parent has absolutely no children, to prevent empty dashboard
    try {
      const childrenList = await getChildren(parent.id);
      if (childrenList.length === 0) {
        await seedDatabaseForParent(parent.id, parent.email);
      }
    } catch (seedErr) {
      console.error('Error auto-seeding empty parent account on login:', seedErr);
    }

    const token = jwt.sign({ id: parent.id, email: parent.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      parent: { id: parent.id, email: parent.email } 
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// ==========================================
// PUBLIC CHILD ENDPOINTS
// ==========================================

// Resilient Normalization Helpers for Child Device Telemetry
function normalizeLogType(typeStr: string): LogType | null {
  if (!typeStr) return null;
  const lower = typeStr.toLowerCase().replace(/_/g, '');
  if (lower.includes('location') || lower === 'gps') return LogType.LOCATION;
  if (lower.includes('appusage') || lower === 'usage') return LogType.APP_USAGE;
  if (lower.includes('screentime')) return LogType.SCREEN_TIME;
  if (lower.includes('sms') || lower === 'text') return LogType.SMS;
  if (lower === 'message' || lower === 'messages' || lower.includes('chat') || lower.includes('notification')) return LogType.MESSAGE;
  if (lower.includes('webvisit') || lower.includes('history') || lower.includes('webhistory')) return LogType.WEB_VISIT;
  if (lower.includes('installedapp') || lower.includes('installedapps') || lower === 'apps') return LogType.INSTALLED_APP;
  if (lower.includes('calllog') || lower === 'call' || lower === 'calls') return LogType.CALL_LOG;
  
  if (Object.values(LogType).includes(typeStr as LogType)) return typeStr as LogType;
  return null;
}

function normalizeLogData(logType: LogType, rawData: any): any {
  if (!rawData || typeof rawData !== 'object') return rawData;
  const data = { ...rawData };
  
  if (logType === LogType.LOCATION) {
    return {
      lat: Number(data.lat || data.latitude || 0),
      lng: Number(data.lng || data.longitude || 0),
      accuracy: Number(data.accuracy || 15)
    };
  }
  
  if (logType === LogType.APP_USAGE) {
    let rawMins = Number(
      data.minutes !== undefined ? data.minutes : 
      (data.duration !== undefined ? data.duration : 
      (data.time !== undefined ? data.time : 
      (data.totalTimeInForeground !== undefined ? data.totalTimeInForeground : 0)))
    );
    if (isNaN(rawMins) || rawMins < 0) rawMins = 0;
    
    let minutes = rawMins;
    if (rawMins > 100000) {
      minutes = Math.round(rawMins / 60000);
    } else if (rawMins > 300) {
      minutes = Math.round(rawMins / 60);
    }

    return {
      app: data.app || data.appName || data.package || data.packageName || data.label || 'Unknown App',
      minutes: minutes,
      category: data.category || 'Other'
    };
  }
  
  if (logType === LogType.SCREEN_TIME) {
    let rawMins = Number(data.minutes !== undefined ? data.minutes : (data.duration !== undefined ? data.duration : 0));
    if (isNaN(rawMins) || rawMins < 0) rawMins = 0;

    let minutes = rawMins;
    if (rawMins > 100000) {
      minutes = Math.round(rawMins / 60000);
    } else if (rawMins > 300) {
      minutes = Math.round(rawMins / 60);
    }

    return {
      minutes: minutes
    };
  }
  
  if (logType === LogType.SMS) {
    return {
      sender: data.sender || data.address || data.number || data.from || 'Unknown',
      body: data.body || data.message || data.content || '',
      direction: data.direction === 'outgoing' || data.type === 2 || data.type === 'outgoing' ? 'outgoing' : 'incoming'
    };
  }
  
  if (logType === LogType.MESSAGE) {
    return {
      app: data.app || data.appName || data.packageName || 'WhatsApp',
      contact: data.contact || data.title || data.sender || 'Unknown',
      direction: data.direction === 'outgoing' || data.type === 'outgoing' ? 'outgoing' : 'incoming',
      preview: data.preview || data.text || data.body || data.content || ''
    };
  }
  
  if (logType === LogType.WEB_VISIT) {
    let domain = data.domain || '';
    const url = data.url || '';
    if (!domain && url) {
      try {
        const u = url.startsWith('http') ? url : `http://${url}`;
        const parsed = new URL(u);
        domain = parsed.hostname;
      } catch (e) {
        domain = url;
      }
    }
    return {
      url: url,
      title: data.title || url,
      domain: domain.replace('www.', '') || 'unknown.com'
    };
  }
  
  if (logType === LogType.INSTALLED_APP) {
    return {
      package: data.package || data.packageName || data.package_name || 'unknown.package',
      name: data.name || data.appName || data.app_name || data.label || 'Unknown Application',
      installedAt: data.installedAt || data.installed_at || new Date().toISOString()
    };
  }
  
  if (logType === LogType.CALL_LOG) {
    const rawType = String(
      data.type ?? data.callType ?? data.call_type ?? data.calltype ?? data.call_type_name ?? ''
    ).toLowerCase();

    let callType = 'incoming';
    if (rawType.includes('miss') || rawType === '3' || rawType.includes('reject') || rawType === '5') {
      callType = 'missed';
    } else if (rawType.includes('out') || rawType === '2' || rawType.includes('dial')) {
      callType = 'outgoing';
    } else if (rawType.includes('in') || rawType === '1' || rawType.includes('receiv')) {
      callType = 'incoming';
    } else if (['incoming', 'outgoing', 'missed'].includes(rawType)) {
      callType = rawType;
    }

    const numberVal = data.number ?? data.phone ?? data.phoneNumber ?? data.phone_number ?? data.address ?? data.formattedNumber ?? 'Unknown Number';
    const nameVal = data.name ?? data.contactName ?? data.contact_name ?? data.cachedName ?? data.cached_name ?? data.caller ?? data.contact ?? numberVal;
    
    const durationVal = Number(
      data.duration !== undefined ? data.duration : (data.durationSeconds ?? data.call_duration ?? data.time ?? 0)
    );

    return {
      number: String(numberVal),
      name: String(nameVal),
      type: callType,
      duration: isNaN(durationVal) ? 0 : durationVal
    };
  }
  
  return data;
}

// Ingestion of children logs (Location, app usage, screen time, messages, calls, sms, install logs, etc)
app.post('/api/public/ingest', verifyChildDeviceToken, async (req: ChildRequest, res) => {
  const childId = req.child!.id;
  const { device } = req.body;
  
  try {
    // Update child metadata if device telemetry is sent
    if (device) {
      const { batteryPercent, networkType, isLocked, platform } = device;
      await updateChild(childId, {
        ...(batteryPercent !== undefined && { batteryPercent: Number(batteryPercent) }),
        ...(networkType && { networkType }),
        ...(isLocked !== undefined && { isLocked: Boolean(isLocked) }),
        ...(platform && { platform })
      });
    }
    
    const processedLogs: { logType: LogType; data: any; occurredAt: string }[] = [];
    
    // 1. Check direct arrays on req.body
    const arrayKeys = [
      { key: 'logs', defaultType: null },
      { key: 'apps', defaultType: LogType.INSTALLED_APP },
      { key: 'installedApps', defaultType: LogType.INSTALLED_APP },
      { key: 'installed_apps', defaultType: LogType.INSTALLED_APP },
      { key: 'sms', defaultType: LogType.SMS },
      { key: 'calls', defaultType: LogType.CALL_LOG },
      { key: 'callLogs', defaultType: LogType.CALL_LOG },
      { key: 'call_logs', defaultType: LogType.CALL_LOG },
      { key: 'messages', defaultType: LogType.MESSAGE },
      { key: 'notifications', defaultType: LogType.MESSAGE },
      { key: 'locations', defaultType: LogType.LOCATION },
      { key: 'location_history', defaultType: LogType.LOCATION },
      { key: 'webHistory', defaultType: LogType.WEB_VISIT },
      { key: 'web_history', defaultType: LogType.WEB_VISIT },
      { key: 'webVisits', defaultType: LogType.WEB_VISIT },
      { key: 'appUsages', defaultType: LogType.APP_USAGE },
      { key: 'app_usages', defaultType: LogType.APP_USAGE }
    ];
    
    for (const item of arrayKeys) {
      const arr = req.body[item.key];
      if (Array.isArray(arr)) {
        for (const logItem of arr) {
          const typeStr = item.defaultType || logItem.logType || logItem.log_type;
          const resolvedType = normalizeLogType(typeStr);
          if (resolvedType) {
            processedLogs.push({
              logType: resolvedType,
              data: logItem.data !== undefined ? logItem.data : logItem,
              occurredAt: logItem.occurredAt || logItem.occurred_at || logItem.timestamp || new Date().toISOString()
            });
          }
        }
      }
    }
    
    // 2. Fallback single item format directly in req.body
    if (processedLogs.length === 0) {
      const singleTypeStr = req.body.logType || req.body.log_type || req.body.type;
      const resolvedType = normalizeLogType(singleTypeStr);
      if (resolvedType && req.body.data) {
        processedLogs.push({
          logType: resolvedType,
          data: req.body.data,
          occurredAt: req.body.occurredAt || req.body.occurred_at || req.body.timestamp || new Date().toISOString()
        });
      }
    }

    // Save all resolved logs
    for (const item of processedLogs) {
      const normalizedData = normalizeLogData(item.logType, item.data);
      await createActivityLog(childId, item.logType, normalizedData, item.occurredAt);
    }
    
    // Touch last seen
    await updateChild(childId, {});
    
    res.json({ success: true, timestamp: new Date().toISOString(), ingested: processedLogs.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Ingestion failed', details: err.message });
  }
});

// GET profile + rules + commands (polling endpoint for child app)
app.get('/api/public/child/me', verifyChildDeviceToken, async (req: ChildRequest, res) => {
  const childId = req.child!.id;
  
  try {
    const child = await getChildById(childId);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    
    const rules = await getRules(childId);
    const pendingCommands = await getCommands(childId, CommandStatus.PENDING);
    
    res.json({
      child: {
        id: child.id,
        name: child.name,
        display_name: child.name,
        batteryPercent: child.batteryPercent,
        networkType: child.networkType,
        isLocked: child.isLocked,
        platform: child.platform,
        lastSeenAt: child.lastSeenAt,
        device_token: child.deviceToken,
        deviceToken: child.deviceToken
      },
      rules: rules.filter(r => r.enabled).map(r => {
        const cloned = { ...r };
        if (cloned.ruleType === RuleType.BLOCKED_APP && cloned.config) {
          const pkg = cloned.config.package || cloned.config.packageName || cloned.config.package_name;
          cloned.config = {
            ...cloned.config,
            package: pkg,
            packageName: pkg,
            package_name: pkg
          };
        } else if (cloned.ruleType === RuleType.BEDTIME && cloned.config) {
          const start = cloned.config.startTime || cloned.config.start_time || cloned.config.start;
          const end = cloned.config.endTime || cloned.config.end_time || cloned.config.end;
          cloned.config = {
            ...cloned.config,
            startTime: start,
            start_time: start,
            start: start,
            endTime: end,
            end_time: end,
            end: end
          };
        } else if (cloned.ruleType === RuleType.SCREEN_TIME_LIMIT && cloned.config) {
          const limitVal = cloned.config.maxMinutesPerDay || cloned.config.maxMinutes || cloned.config.limit || cloned.config.minutes;
          cloned.config = {
            ...cloned.config,
            maxMinutesPerDay: limitVal,
            maxMinutes: limitVal,
            limit: limitVal,
            minutes: limitVal
          };
        }
        return cloned;
      }),
      pendingCommands
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve details', details: err.message });
  }
});

// Acknowledge remote command executed
app.post('/api/public/child/ack', verifyChildDeviceToken, async (req: ChildRequest, res) => {
  const childId = req.child!.id;
  const { commandId, status } = req.body;
  if (!commandId) return res.status(400).json({ error: 'commandId is required' });
  
  try {
    const updated = await updateCommandStatus(commandId, status || CommandStatus.ACK);
    if (!updated) return res.status(404).json({ error: 'Command not found' });
    
    // If command was LOCK or UNLOCK, apply the lock state directly to the child model
    if (updated.command === CommandType.LOCK) {
      await updateChild(childId, { isLocked: true });
    } else if (updated.command === CommandType.UNLOCK) {
      await updateChild(childId, { isLocked: false });
    }
    
    res.json({ success: true, command: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Acknowledge failed', details: err.message });
  }
});

// ==========================================
// PARENT PROTECTED ENDPOINTS (JWT SECURED)
// ==========================================

// Child CRUD for Parents
app.get('/api/children', verifyParentJWT, async (req: ParentRequest, res) => {
  try {
    const parentId = req.parent!.id;
    const childrenList = await getChildren(parentId);
    res.json(childrenList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch children', details: err.message });
  }
});

app.post('/api/children', verifyParentJWT, async (req: ParentRequest, res) => {
  const parentId = req.parent!.id;
  const { name, deviceToken, platform } = req.body;
  if (!name || !deviceToken) {
    return res.status(400).json({ error: 'Name and unique deviceToken are required' });
  }
  
  try {
    // Check if token already registered
    const existing = await getChildByToken(deviceToken);
    if (existing) {
      // Transfer the child to this parent!
      const updatedChild = await transferChildToParent(existing.id, parentId);
      if (updatedChild) {
        // Also update name and platform if they differ
        const finalChild = await updateChild(existing.id, { name, platform: platform || 'android' });
        return res.status(200).json(finalChild || updatedChild);
      }
    }
    
    const child = await createChild(parentId, name, deviceToken, platform || 'android');
    res.status(201).json(child);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create child', details: err.message });
  }
});

app.put('/api/children/:id', verifyParentJWT, async (req: ParentRequest, res) => {
  const childId = req.params.id;
  const parentId = req.parent!.id;
  
  try {
    const child = await getChildById(childId);
    if (!child || child.parentId !== parentId) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const { name, isLocked, platform } = req.body;
    const updated = await updateChild(childId, {
      ...(name !== undefined && { name }),
      ...(isLocked !== undefined && { isLocked }),
      ...(platform !== undefined && { platform })
    });
    
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update child', details: err.message });
  }
});

app.delete('/api/children/:id', verifyParentJWT, async (req: ParentRequest, res) => {
  const childId = req.params.id;
  const parentId = req.parent!.id;
  
  try {
    const child = await getChildById(childId);
    if (!child || child.parentId !== parentId) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    await deleteChild(childId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete child', details: err.message });
  }
});

// Rules CRUD for Parents
app.get('/api/rules', verifyParentJWT, async (req: ParentRequest, res) => {
  const { childId } = req.query;
  if (!childId) return res.status(400).json({ error: 'childId query param is required' });
  
  try {
    const child = await getChildById(childId as string);
    if (!child || child.parentId !== req.parent!.id) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const rulesList = await getRules(childId as string);
    res.json(rulesList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rules', details: err.message });
  }
});

app.post('/api/rules', verifyParentJWT, async (req: ParentRequest, res) => {
  const { childId, ruleType, config, enabled } = req.body;
  if (!childId || !ruleType || !config) {
    return res.status(400).json({ error: 'childId, ruleType, and config are required' });
  }
  
  try {
    const child = await getChildById(childId);
    if (!child || child.parentId !== req.parent!.id) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    if (!Object.values(RuleType).includes(ruleType)) {
      return res.status(400).json({ error: 'Invalid ruleType' });
    }
    
    const rule = await createRule(childId, ruleType, config);
    if (enabled === false) {
      await updateRule(rule.id, { enabled: false });
    }
    
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

app.put('/api/rules/:id', verifyParentJWT, async (req: ParentRequest, res) => {
  const ruleId = req.params.id;
  const { config, enabled } = req.body;
  
  try {
    const updated = await updateRule(ruleId, {
      ...(config !== undefined && { config }),
      ...(enabled !== undefined && { enabled })
    });
    
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

app.delete('/api/rules/:id', verifyParentJWT, async (req: ParentRequest, res) => {
  const ruleId = req.params.id;
  
  try {
    const deleted = await deleteRule(ruleId);
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});

// Activity Logs with filters for parents
app.get('/api/logs', verifyParentJWT, async (req: ParentRequest, res) => {
  const { childId, type, from, to } = req.query;
  if (!childId) return res.status(400).json({ error: 'childId is required' });
  
  try {
    const child = await getChildById(childId as string);
    if (!child || child.parentId !== req.parent!.id) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const logs = await getParentLogs(childId as string, {
      logType: type as LogType,
      from: from as string,
      to: to as string
    });
    
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
  }
});

// Queue Commands (lock/unlock/reset/ring/locate)
app.post('/api/commands', verifyParentJWT, async (req: ParentRequest, res) => {
  const { childId, command } = req.body;
  if (!childId || !command) {
    return res.status(400).json({ error: 'childId and command are required' });
  }
  
  try {
    const child = await getChildById(childId);
    if (!child || child.parentId !== req.parent!.id) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    if (!Object.values(CommandType).includes(command)) {
      return res.status(400).json({ error: 'Invalid command type' });
    }
    
    // Insert command
    const cmd = await createCommand(childId, command as CommandType);
    
    // Immediately apply lock/unlock state
    if (command === CommandType.LOCK) {
      await updateChild(childId, { isLocked: true });
    } else if (command === CommandType.UNLOCK) {
      await updateChild(childId, { isLocked: false });
    }

    setTimeout(async () => {
      try {
        await updateCommandStatus(cmd.id, CommandStatus.ACK);
        setTimeout(async () => {
          try {
            await updateCommandStatus(cmd.id, CommandStatus.DONE);
          } catch (e) {
            console.error('Simulation command done status update failed', e);
          }
        }, 500);
      } catch (e) {
        console.error('Simulation command ack status update failed', e);
      }
    }, 500);
    
    res.status(201).json(cmd);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to queue command', details: err.message });
  }
});

// Get Command history
app.get('/api/commands', verifyParentJWT, async (req: ParentRequest, res) => {
  const { childId } = req.query;
  if (!childId) return res.status(400).json({ error: 'childId query param is required' });
  
  try {
    const child = await getChildById(childId as string);
    if (!child || child.parentId !== req.parent!.id) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const commandsList = await getCommands(childId as string);
    res.json(commandsList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch commands', details: err.message });
  }
});

// Fallback for any unmatched API routes so they return JSON 404 instead of falling through to Vite/HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ==========================================
// VITE DEV SERVER / PRODUCTION SERVING
// ==========================================

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
    console.log(`Time's Up server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
