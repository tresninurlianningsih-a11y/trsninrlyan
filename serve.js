/**
 * Development & API Server connected to MySQL for SMK Negeri 6 Kendari website
 * Run: node serve.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const DATA_DIR = path.join(__dirname, 'data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data folder exists as fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize fallback users if file doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([
    { id: "1", username: "admin", password: "adminsmk6", created_at: new Date().toISOString() }
  ], null, 2), 'utf8');
}

// Global DB Connection state
let useMySQL = false;

// In-memory sessions
const sessions = new Set();
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'adminsmk6'
};

// Helper: parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

// Helper: check authentication
function isAuthenticated(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
    return acc;
  }, {});
  const token = cookies['session_token'];
  return token && sessions.has(token);
}

// Helper: save Base64 Image to root directory
function saveBase64Image(base64Str) {
  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Format gambar tidak valid');
  }
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');
  const filename = `uploaded_${Date.now()}.${ext}`;
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, buffer);
  return filename;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
}

function jsonResponse(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

// Fallback JSON helpers
function getJsonData(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveJsonData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toLocaleTimeString('id-ID')}] ${req.method} ${req.url}`);

  // Set CORS headers for all responses
  setCorsHeaders(req, res);

  // Handle CORS OPTIONS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API ROUTES
  if (pathname.startsWith('/api/')) {
    try {
      // API LOGIN
      if (pathname === '/api/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);

        let valid = false;
        if (useMySQL) {
          try {
            const user = await db.verifyUser(username, password);
            valid = !!user;
          } catch (err) {
            console.error('MySQL login check error:', err);
            const jsonUsers = getJsonData(USERS_FILE);
            const user = jsonUsers.find(u => u.username === username && u.password === password);
            valid = !!user;
          }
        } else {
          const jsonUsers = getJsonData(USERS_FILE);
          const user = jsonUsers.find(u => u.username === username && u.password === password);
          valid = !!user;
        }

        if (valid) {
          const token = 'sess_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
          sessions.add(token);
          res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; Max-Age=7200; SameSite=Lax`);
          jsonResponse(res, 200, { success: true, storage: useMySQL ? 'MySQL' : 'JSON' });
        } else {
          jsonResponse(res, 401, { error: 'Username atau password salah' });
        }
        return;
      }

      // API LOGOUT
      if (pathname === '/api/logout' && req.method === 'POST') {
        const cookieHeader = req.headers.cookie || '';
        const token = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('session_token='))?.split('=')[1];
        if (token) {
          sessions.delete(token);
        }
        res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0');
        jsonResponse(res, 200, { success: true });
        return;
      }

      // API AUTH STATUS
      if (pathname === '/api/status' && req.method === 'GET') {
        const authed = isAuthenticated(req);
        jsonResponse(res, 200, { authenticated: authed, mysql: useMySQL });
        return;
      }

      // API NEWS
      if (pathname === '/api/news') {
        // GET /api/news (Public)
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const newsList = await db.getNews();
              jsonResponse(res, 200, newsList);
              return;
            } catch (err) {
              console.error('Failed to get news from MySQL, falling back to JSON:', err);
            }
          }
          const data = getJsonData(NEWS_FILE);
          jsonResponse(res, 200, data);
          return;
        }

        // Must be authenticated for mutating actions
        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        // POST /api/news (Create)
        if (req.method === 'POST') {
          const body = await parseBody(req);
          
          let imageName = body.image || 'upacara pelepasan.jpeg';
          if (body.imageData) {
            try {
              imageName = saveBase64Image(body.imageData);
            } catch (err) {
              jsonResponse(res, 400, { error: 'Gagal memproses gambar: ' + err.message });
              return;
            }
          }

          const newItem = {
            id: Date.now().toString(),
            date: body.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            title: body.title || 'Untitled',
            excerpt: body.excerpt || '',
            content: body.content || '',
            image: imageName
          };

          if (useMySQL) {
            try {
              await db.createNews(newItem);
              jsonResponse(res, 201, newItem);
              return;
            } catch (err) {
              console.error('Failed creating news in MySQL:', err);
            }
          }

          const newsList = getJsonData(NEWS_FILE);
          newsList.unshift(newItem);
          saveJsonData(NEWS_FILE, newsList);
          jsonResponse(res, 201, newItem);
          return;
        }

        // PUT /api/news (Update)
        if (req.method === 'PUT') {
          const body = await parseBody(req);
          let imageName = body.image;

          if (body.imageData) {
            try {
              imageName = saveBase64Image(body.imageData);
            } catch (err) {
              jsonResponse(res, 400, { error: 'Gagal memproses gambar: ' + err.message });
              return;
            }
          }

          if (useMySQL) {
            try {
              const currentList = await db.getNews();
              const existing = currentList.find(n => n.id === body.id);
              if (!existing) {
                jsonResponse(res, 404, { error: 'Berita tidak ditemukan' });
                return;
              }

              const updatedItem = {
                id: body.id,
                title: body.title !== undefined ? body.title : existing.title,
                excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
                content: body.content !== undefined ? body.content : existing.content,
                date: body.date !== undefined ? body.date : existing.date,
                image: imageName || existing.image
              };

              await db.updateNews(updatedItem);
              jsonResponse(res, 200, updatedItem);
              return;
            } catch (err) {
              console.error('Failed updating news in MySQL:', err);
            }
          }

          const newsList = getJsonData(NEWS_FILE);
          const idx = newsList.findIndex(n => n.id === body.id);
          if (idx === -1) {
            jsonResponse(res, 404, { error: 'Berita tidak ditemukan' });
            return;
          }

          newsList[idx] = {
            ...newsList[idx],
            title: body.title || newsList[idx].title,
            excerpt: body.excerpt || newsList[idx].excerpt,
            content: body.content || newsList[idx].content,
            date: body.date || newsList[idx].date,
            image: imageName || newsList[idx].image
          };

          saveJsonData(NEWS_FILE, newsList);
          jsonResponse(res, 200, newsList[idx]);
          return;
        }

        // DELETE /api/news (Delete)
        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) {
            jsonResponse(res, 400, { error: 'Missing id parameter' });
            return;
          }

          if (useMySQL) {
            try {
              await db.deleteNews(id);
              jsonResponse(res, 200, { success: true });
              return;
            } catch (err) {
              console.error('Failed deleting news in MySQL:', err);
            }
          }

          let newsList = getJsonData(NEWS_FILE);
          newsList = newsList.filter(n => n.id !== id);
          saveJsonData(NEWS_FILE, newsList);
          jsonResponse(res, 200, { success: true });
          return;
        }
      }

      // API ANNOUNCEMENTS
      if (pathname === '/api/announcements') {
        // GET /api/announcements (Public)
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getAnnouncements();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed to get announcements from MySQL:', err);
            }
          }
          jsonResponse(res, 200, getJsonData(ANNOUNCEMENTS_FILE));
          return;
        }

        // Must be authenticated for mutating actions
        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        // POST /api/announcements (Create)
        if (req.method === 'POST') {
          const body = await parseBody(req);
          const newItem = {
            id: Date.now().toString(),
            date: body.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            text: body.text || '',
            link: body.link || '#'
          };

          if (useMySQL) {
            try {
              await db.createAnnouncement(newItem);
              jsonResponse(res, 201, newItem);
              return;
            } catch (err) {
              console.error('Failed creating announcement in MySQL:', err);
            }
          }

          const list = getJsonData(ANNOUNCEMENTS_FILE);
          list.unshift(newItem);
          saveJsonData(ANNOUNCEMENTS_FILE, list);
          jsonResponse(res, 201, newItem);
          return;
        }

        // PUT /api/announcements (Update)
        if (req.method === 'PUT') {
          const body = await parseBody(req);

          if (useMySQL) {
            try {
              const list = await db.getAnnouncements();
              const existing = list.find(n => n.id === body.id);
              if (!existing) {
                jsonResponse(res, 404, { error: 'Pengumuman tidak ditemukan' });
                return;
              }

              const updatedItem = {
                id: body.id,
                text: body.text !== undefined ? body.text : existing.text,
                date: body.date !== undefined ? body.date : existing.date,
                link: body.link !== undefined ? body.link : existing.link
              };

              await db.updateAnnouncement(updatedItem);
              jsonResponse(res, 200, updatedItem);
              return;
            } catch (err) {
              console.error('Failed updating announcement in MySQL:', err);
            }
          }

          const list = getJsonData(ANNOUNCEMENTS_FILE);
          const idx = list.findIndex(n => n.id === body.id);
          if (idx === -1) {
            jsonResponse(res, 404, { error: 'Pengumuman tidak ditemukan' });
            return;
          }

          list[idx] = {
            ...list[idx],
            text: body.text || list[idx].text,
            date: body.date || list[idx].date,
            link: body.link || list[idx].link
          };

          saveJsonData(ANNOUNCEMENTS_FILE, list);
          jsonResponse(res, 200, list[idx]);
          return;
        }

        // DELETE /api/announcements (Delete)
        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) {
            jsonResponse(res, 400, { error: 'Missing id parameter' });
            return;
          }

          if (useMySQL) {
            try {
              await db.deleteAnnouncement(id);
              jsonResponse(res, 200, { success: true });
              return;
            } catch (err) {
              console.error('Failed deleting announcement in MySQL:', err);
            }
          }

          let list = getJsonData(ANNOUNCEMENTS_FILE);
          list = list.filter(n => n.id !== id);
          saveJsonData(ANNOUNCEMENTS_FILE, list);
          jsonResponse(res, 200, { success: true });
          return;
        }
      }

      // API MESSAGES
      if (pathname === '/api/messages') {
        // POST /api/messages (Submit message, Public)
        if (req.method === 'POST') {
          const body = await parseBody(req);

          if (!body.name || !body.email || !body.subject || !body.message) {
            jsonResponse(res, 400, { error: 'Mohon lengkapi semua field formulir' });
            return;
          }

          const newItem = {
            id: Date.now().toString(),
            name: body.name,
            email: body.email,
            subject: body.subject,
            message: body.message,
            timestamp: new Date().toISOString()
          };

          if (useMySQL) {
            try {
              await db.createMessage(newItem);
              jsonResponse(res, 201, { success: true, item: newItem });
              return;
            } catch (err) {
              console.error('Failed saving message in MySQL:', err);
            }
          }

          const list = getJsonData(MESSAGES_FILE);
          list.unshift(newItem);
          saveJsonData(MESSAGES_FILE, list);
          jsonResponse(res, 201, { success: true, item: newItem });
          return;
        }

        // Must be authenticated for reading and deleting messages
        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        // GET /api/messages (Admin view)
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getMessages();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting messages from MySQL:', err);
            }
          }
          jsonResponse(res, 200, getJsonData(MESSAGES_FILE));
          return;
        }

        // DELETE /api/messages (Admin delete)
        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) {
            jsonResponse(res, 400, { error: 'Missing id parameter' });
            return;
          }

          if (useMySQL) {
            try {
              await db.deleteMessage(id);
              jsonResponse(res, 200, { success: true });
              return;
            } catch (err) {
              console.error('Failed deleting message in MySQL:', err);
            }
          }

          let list = getJsonData(MESSAGES_FILE);
          list = list.filter(n => n.id !== id);
          saveJsonData(MESSAGES_FILE, list);
          jsonResponse(res, 200, { success: true });
          return;
        }
      }

      // API ADMINS (Publicly list admin usernames)
      if (pathname === '/api/admins' && req.method === 'GET') {
        if (useMySQL) {
          try {
            const list = await db.getUsers();
            jsonResponse(res, 200, list.map(u => ({ username: u.username })));
            return;
          } catch (err) {
            console.error('Failed to get admins from MySQL, falling back to JSON:', err);
          }
        }
        const list = getJsonData(USERS_FILE);
        jsonResponse(res, 200, list.map(u => ({ username: u.username })));
        return;
      }

      // API USERS (Admin management, requires authentication)
      if (pathname === '/api/users') {
        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        // GET /api/users
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getUsers();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed to get users from MySQL, falling back to JSON:', err);
            }
          }
          const list = getJsonData(USERS_FILE);
          jsonResponse(res, 200, list.map(u => ({ id: u.id, username: u.username, created_at: u.created_at || new Date().toISOString() })));
          return;
        }

        // POST /api/users (Create)
        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.username || !body.password) {
            jsonResponse(res, 400, { error: 'Username dan password wajib diisi' });
            return;
          }

          if (useMySQL) {
            try {
              const allUsers = await db.getUsers();
              if (allUsers.some(u => u.username.toLowerCase() === body.username.toLowerCase())) {
                jsonResponse(res, 400, { error: 'Username sudah digunakan' });
                return;
              }
              await db.createUser({ username: body.username, password: body.password });
              jsonResponse(res, 201, { success: true });
              return;
            } catch (err) {
              console.error('Failed creating user in MySQL:', err);
              jsonResponse(res, 500, { error: 'Gagal membuat user di database' });
              return;
            }
          }

          const list = getJsonData(USERS_FILE);
          if (list.some(u => u.username.toLowerCase() === body.username.toLowerCase())) {
            jsonResponse(res, 400, { error: 'Username sudah digunakan' });
            return;
          }
          const newUser = {
            id: Date.now().toString(),
            username: body.username,
            password: body.password,
            created_at: new Date().toISOString()
          };
          list.push(newUser);
          saveJsonData(USERS_FILE, list);
          jsonResponse(res, 201, { success: true });
          return;
        }

        // PUT /api/users (Update)
        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (!body.id || !body.username) {
            jsonResponse(res, 400, { error: 'ID dan Username wajib diisi' });
            return;
          }

          if (useMySQL) {
            try {
              const allUsers = await db.getUsers();
              if (allUsers.some(u => u.username.toLowerCase() === body.username.toLowerCase() && String(u.id) !== String(body.id))) {
                jsonResponse(res, 400, { error: 'Username sudah digunakan' });
                return;
              }
              await db.updateUser({ id: body.id, username: body.username, password: body.password });
              jsonResponse(res, 200, { success: true });
              return;
            } catch (err) {
              console.error('Failed updating user in MySQL:', err);
              jsonResponse(res, 500, { error: 'Gagal memperbarui user' });
              return;
            }
          }

          const list = getJsonData(USERS_FILE);
          const idx = list.findIndex(u => String(u.id) === String(body.id));
          if (idx === -1) {
            jsonResponse(res, 404, { error: 'User tidak ditemukan' });
            return;
          }
          if (list.some((u, i) => u.username.toLowerCase() === body.username.toLowerCase() && i !== idx)) {
            jsonResponse(res, 400, { error: 'Username sudah digunakan' });
            return;
          }
          list[idx].username = body.username;
          if (body.password) {
            list[idx].password = body.password;
          }
          saveJsonData(USERS_FILE, list);
          jsonResponse(res, 200, { success: true });
          return;
        }

        // DELETE /api/users (Delete)
        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) {
            jsonResponse(res, 400, { error: 'Missing id parameter' });
            return;
          }

          if (useMySQL) {
            try {
              const allUsers = await db.getUsers();
              const userToDelete = allUsers.find(u => String(u.id) === String(id));
              if (!userToDelete) {
                jsonResponse(res, 404, { error: 'User tidak ditemukan' });
                return;
              }
              if (userToDelete.username === 'admin') {
                jsonResponse(res, 400, { error: 'Tidak dapat menghapus super admin utama (admin)' });
                return;
              }
              await db.deleteUser(id);
              jsonResponse(res, 200, { success: true });
              return;
            } catch (err) {
              console.error('Failed deleting user in MySQL:', err);
              jsonResponse(res, 500, { error: 'Gagal menghapus user' });
              return;
            }
          }

          const list = getJsonData(USERS_FILE);
          const idx = list.findIndex(u => String(u.id) === String(id));
          if (idx === -1) {
            jsonResponse(res, 404, { error: 'User tidak ditemukan' });
            return;
          }
          if (list[idx].username === 'admin') {
            jsonResponse(res, 400, { error: 'Tidak dapat menghapus super admin utama (admin)' });
            return;
          }
          list.splice(idx, 1);
          saveJsonData(USERS_FILE, list);
          jsonResponse(res, 200, { success: true });
          return;
        }
      }

      // API GURU (Tabel guru)
      if (pathname === '/api/guru') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getGuru();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting guru:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.nama_lengkap) {
            jsonResponse(res, 400, { error: 'Nama lengkap wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createGuru(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (!body.id || !body.nama_lengkap) {
            jsonResponse(res, 400, { error: 'ID dan Nama lengkap wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.updateGuru(body);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deleteGuru(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API SISWA (Tabel siswa)
      if (pathname === '/api/siswa') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getSiswa();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting siswa:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.nis || !body.nama_lengkap) {
            jsonResponse(res, 400, { error: 'NIS dan Nama lengkap wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createSiswa(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (!body.id || !body.nama_lengkap) {
            jsonResponse(res, 400, { error: 'ID dan Nama wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.updateSiswa(body);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deleteSiswa(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API EKSTRAKURIKULER (Tabel ekstrakurikuler)
      if (pathname === '/api/ekstrakurikuler') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getEkstrakurikuler();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting ekstrakurikuler:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.nama_ekskul) {
            jsonResponse(res, 400, { error: 'Nama ekskul wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createEkstrakurikuler(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (!body.id || !body.nama_ekskul) {
            jsonResponse(res, 400, { error: 'ID dan Nama ekskul wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.updateEkstrakurikuler(body);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deleteEkstrakurikuler(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API GALERI (Tabel galeri)
      if (pathname === '/api/galeri') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getGaleri();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting galeri:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.judul || !body.gambar) {
            jsonResponse(res, 400, { error: 'Judul dan gambar wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createGaleri(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deleteGaleri(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API PRESTASI (Tabel prestasi)
      if (pathname === '/api/prestasi') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getPrestasi();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting prestasi:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.nama_prestasi) {
            jsonResponse(res, 400, { error: 'Nama prestasi wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createPrestasi(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deletePrestasi(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API AGENDA (Tabel agenda)
      if (pathname === '/api/agenda') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const list = await db.getAgenda();
              jsonResponse(res, 200, list);
              return;
            } catch (err) {
              console.error('Failed getting agenda:', err);
            }
          }
          jsonResponse(res, 200, []);
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          if (!body.judul) {
            jsonResponse(res, 400, { error: 'Judul agenda wajib diisi' });
            return;
          }
          if (useMySQL) {
            await db.createAgenda(body);
            jsonResponse(res, 201, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (useMySQL && id) {
            await db.deleteAgenda(id);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 400, { error: 'Invalid request' });
          return;
        }
      }

      // API PROFIL SEKOLAH (Tabel profil_sekolah)
      if (pathname === '/api/profil') {
        if (req.method === 'GET') {
          if (useMySQL) {
            try {
              const profil = await db.getProfilSekolah();
              jsonResponse(res, 200, profil || {});
              return;
            } catch (err) {
              console.error('Failed getting profil:', err);
            }
          }
          jsonResponse(res, 200, { nama_sekolah: 'SMK Negeri 6 Kendari' });
          return;
        }

        if (!isAuthenticated(req)) {
          jsonResponse(res, 401, { error: 'Unauthorized' });
          return;
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (useMySQL) {
            await db.updateProfilSekolah(body);
            jsonResponse(res, 200, { success: true });
            return;
          }
          jsonResponse(res, 500, { error: 'MySQL not connected' });
          return;
        }
      }

      // API DASHBOARD STATS
      if (pathname === '/api/stats' && req.method === 'GET') {
        if (useMySQL) {
          try {
            const newsCount = (await db.getNews()).length;
            const announcCount = (await db.getAnnouncements()).length;
            const guruCount = (await db.getGuru()).length;
            const siswaCount = (await db.getSiswa()).length;
            const ekskulCount = (await db.getEkstrakurikuler()).length;
            const galeriCount = (await db.getGaleri()).length;
            const prestasiCount = (await db.getPrestasi()).length;
            const userCount = (await db.getUsers()).length;

            jsonResponse(res, 200, {
              newsCount,
              announcCount,
              guruCount,
              siswaCount,
              ekskulCount,
              galeriCount,
              prestasiCount,
              userCount,
              databaseName: 'db_sekolah'
            });
            return;
          } catch (err) {
            console.error('Failed getting stats:', err);
          }
        }
        jsonResponse(res, 200, { newsCount: 2, announcCount: 4, guruCount: 2, siswaCount: 0, ekskulCount: 4, galeriCount: 3, prestasiCount: 1, userCount: 1, databaseName: 'Offline JSON' });
        return;
      }

      jsonResponse(res, 404, { error: 'API Endpoint tidak ditemukan' });
      return;

    } catch (apiErr) {
      console.error(apiErr);
      jsonResponse(res, 500, { error: 'Internal Server Error: ' + apiErr.message });
      return;
    }
  }

  // 2. STATIC PAGE REDIRECT ROUTING FOR ADMIN PANEL
  if (pathname === '/admin.html') {
    if (!isAuthenticated(req)) {
      res.writeHead(302, { 'Location': '/admin-login.html' });
      res.end();
      return;
    }
  }

  if (pathname === '/admin-login.html') {
    if (isAuthenticated(req)) {
      res.writeHead(302, { 'Location': '/admin.html' });
      res.end();
      return;
    }
  }

  // 3. STATIC FILE SERVING
  let filePath = pathname === '/' ? './index.html' : '.' + decodeURIComponent(pathname);
  const absolutePath = path.resolve(__dirname, filePath);

  if (!absolutePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (streamErr) => {
      console.error(streamErr);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  });
});

// Start Server after checking MySQL
(async () => {
  console.log('🔄 Memeriksa koneksi database MySQL...');
  useMySQL = await db.testConnection();

  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🏫 SMK Negeri 6 Kendari Web Server Running`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔑 Admin Login: http://localhost:${PORT}/admin-login.html`);
    console.log(`🗄️  Database Status: ${useMySQL ? `✅ Terhubung ke MySQL (Database: ${db.DB_CONFIG.database})` : '⚠️  MySQL Offline (Menggunakan fallback JSON)'}`);
    console.log(`💻 Default Admin Username: admin`);
    console.log(`🔑 Default Admin Password: adminsmk6`);
    console.log(`==================================================\n`);
  });
})();
