import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// Asegurar que la carpeta data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, defaultValue = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error(`[DB] Error al leer ${file}:`, err);
    return defaultValue;
  }
}

function writeJson(file, data) {
  try {
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, file);
  } catch (err) {
    console.error(`[DB] Error al escribir ${file}:`, err);
  }
}

class Database {
  constructor() {
    this.users = readJson(USERS_FILE, {});
    this.groups = readJson(GROUPS_FILE, {});
  }

  getUser(jid) {
    const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
    if (!this.users[cleanJid]) {
      this.users[cleanJid] = {
        wallet: 500,
        bank: 0,
        level: 1,
        exp: 0,
        lastWork: 0,
        lastRob: 0,
        warns: 0
      };
      this.saveUsers();
    }
    return this.users[cleanJid];
  }

  updateUser(jid, dataOrFn) {
    const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
    const user = this.getUser(cleanJid);
    if (typeof dataOrFn === 'function') {
      dataOrFn(user);
    } else {
      Object.assign(user, dataOrFn);
    }
    this.saveUsers();
    return user;
  }

  saveUsers() {
    writeJson(USERS_FILE, this.users);
  }

  getGroup(jid) {
    if (!this.groups[jid]) {
      this.groups[jid] = {
        antilink: false,
        welcome: false,
        nsfw: false,
        muted: []
      };
      this.saveGroups();
    }
    return this.groups[jid];
  }

  updateGroup(jid, dataOrFn) {
    const group = this.getGroup(jid);
    if (typeof dataOrFn === 'function') {
      dataOrFn(group);
    } else {
      Object.assign(group, dataOrFn);
    }
    this.saveGroups();
    return group;
  }

  saveGroups() {
    writeJson(GROUPS_FILE, this.groups);
  }

  getTopUsers(limit = 10) {
    return Object.entries(this.users)
      .map(([jid, data]) => ({
        jid,
        total: (data.wallet || 0) + (data.bank || 0),
        wallet: data.wallet || 0,
        bank: data.bank || 0,
        level: data.level || 1
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }
}

export const db = new Database();
