/**
 * Database Module for SMK Negeri 6 Kendari
 * Connects Node.js server directly to MySQL / MariaDB
 */

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smk_kendari'
};

// Locate mysql.exe executable
function getMysqlExe() {
  const possiblePaths = [
    'C:\\xampp\\mysql\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
    'mysql.exe',
    'mysql'
  ];

  for (const p of possiblePaths) {
    if (p.includes('\\')) {
      if (fs.existsSync(p)) return p;
    } else {
      try {
        execFileSync(p, ['--version']);
        return p;
      } catch (e) {}
    }
  }
  return 'C:\\xampp\\mysql\\bin\\mysql.exe';
}

const MYSQL_EXE = getMysqlExe();

/**
 * Escapes strings for SQL query
 */
function escapeSqlString(str) {
  if (str === null || str === undefined) return 'NULL';
  const val = String(str);
  return "'" + val.replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/\"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r') + "'";
}

/**
 * Execute raw SQL query and return rows as JSON array of objects
 */
function query(sql) {
  return new Promise((resolve, reject) => {
    const args = [
      '-u', DB_CONFIG.user,
      ...(DB_CONFIG.password ? ['-p' + DB_CONFIG.password] : []),
      '-h', DB_CONFIG.host,
      '-D', DB_CONFIG.database,
      '--default-character-set=utf8mb4',
      '-B', // batch / tab-delimited mode
      '-e', sql
    ];

    execFile(MYSQL_EXE, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('MySQL Query Error:', stderr || err.message);
        return reject(err);
      }

      const cleanStdout = stdout.replace(/\r/g, '').trim();
      if (!cleanStdout) return resolve([]);

      const lines = cleanStdout.split('\n').filter(l => l.length > 0);
      if (lines.length === 0) return resolve([]);

      // First line is headers
      const headers = lines[0].split('\t').map(h => h.trim());
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] !== undefined ? values[idx].trim() : null;
        });
        results.push(row);
      }

      resolve(results);
    });
  });
}

/**
 * Test DB Connection
 */
async function testConnection() {
  try {
    const res = await query("SELECT 1 AS connected;");
    return res.length > 0 && String(res[0].connected) === '1';
  } catch (e) {
    return false;
  }
}

// Module Exports
module.exports = {
  query,
  escapeSqlString,
  testConnection,
  DB_CONFIG,

  // User Auth & CRUD
  async verifyUser(username, password) {
    const sql = `SELECT * FROM users WHERE username = ${escapeSqlString(username)} AND password = ${escapeSqlString(password)} LIMIT 1;`;
    const rows = await query(sql);
    return rows.length > 0 ? rows[0] : null;
  },

  async getUsers() {
    return await query("SELECT id, username, created_at FROM users ORDER BY id ASC;");
  },

  async createUser({ username, password }) {
    const sql = `INSERT INTO users (username, password) VALUES (
      ${escapeSqlString(username)},
      ${escapeSqlString(password)}
    );`;
    await query(sql);
    return true;
  },

  async updateUser({ id, username, password }) {
    let sql;
    if (password) {
      sql = `UPDATE users SET 
        username = ${escapeSqlString(username)},
        password = ${escapeSqlString(password)}
        WHERE id = ${escapeSqlString(id)};`;
    } else {
      sql = `UPDATE users SET 
        username = ${escapeSqlString(username)}
        WHERE id = ${escapeSqlString(id)};`;
    }
    await query(sql);
    return true;
  },

  async deleteUser(id) {
    const sql = `DELETE FROM users WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // News CRUD
  async getNews() {
    return await query("SELECT * FROM news ORDER BY created_at DESC, id DESC;");
  },

  async createNews({ id, title, excerpt, content, date, image }) {
    const sql = `INSERT INTO news (id, title, excerpt, content, date, image) VALUES (
      ${escapeSqlString(id)},
      ${escapeSqlString(title)},
      ${escapeSqlString(excerpt)},
      ${escapeSqlString(content)},
      ${escapeSqlString(date)},
      ${escapeSqlString(image)}
    );`;
    await query(sql);
    return { id, title, excerpt, content, date, image };
  },

  async updateNews({ id, title, excerpt, content, date, image }) {
    const sql = `UPDATE news SET 
      title = ${escapeSqlString(title)},
      excerpt = ${escapeSqlString(excerpt)},
      content = ${escapeSqlString(content)},
      date = ${escapeSqlString(date)},
      image = ${escapeSqlString(image)}
      WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return { id, title, excerpt, content, date, image };
  },

  async deleteNews(id) {
    const sql = `DELETE FROM news WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // Announcements CRUD
  async getAnnouncements() {
    return await query("SELECT * FROM announcements ORDER BY created_at DESC, id DESC;");
  },

  async createAnnouncement({ id, date, text, link }) {
    const sql = `INSERT INTO announcements (id, date, text, link) VALUES (
      ${escapeSqlString(id)},
      ${escapeSqlString(date)},
      ${escapeSqlString(text)},
      ${escapeSqlString(link)}
    );`;
    await query(sql);
    return { id, date, text, link };
  },

  async updateAnnouncement({ id, date, text, link }) {
    const sql = `UPDATE announcements SET 
      text = ${escapeSqlString(text)},
      date = ${escapeSqlString(date)},
      link = ${escapeSqlString(link)}
      WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return { id, date, text, link };
  },

  async deleteAnnouncement(id) {
    const sql = `DELETE FROM announcements WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // Messages CRUD
  async getMessages() {
    return await query("SELECT * FROM messages ORDER BY created_at DESC, id DESC;");
  },

  async createMessage({ id, name, email, subject, message, timestamp }) {
    const sql = `INSERT INTO messages (id, name, email, subject, message, timestamp) VALUES (
      ${escapeSqlString(id)},
      ${escapeSqlString(name)},
      ${escapeSqlString(email)},
      ${escapeSqlString(subject)},
      ${escapeSqlString(message)},
      ${escapeSqlString(timestamp)}
    );`;
    await query(sql);
    return { id, name, email, subject, message, timestamp };
  },

  async deleteMessage(id) {
    const sql = `DELETE FROM messages WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  }
};
