/**
 * Database Module for SMK Negeri 6 Kendari
 * Connects Node.js server directly to MySQL database 'db_sekolah'
 */

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_sekolah'
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
 * Test DB Connection & Ensure db_sekolah database
 */
async function testConnection() {
  try {
    const res = await query("SELECT 1 AS connected;");
    const connected = res.length > 0 && String(res[0].connected) === '1';
    if (connected) {
      await seedDatabaseIfEmpty();
    }
    return connected;
  } catch (e) {
    return false;
  }
}

/**
 * Auto-Seed database if tables are empty
 */
async function seedDatabaseIfEmpty() {
  try {
    // 1. Roles
    const roles = await query("SELECT COUNT(*) AS count FROM roles;");
    if (parseInt(roles[0]?.count || 0) === 0) {
      await query(`INSERT INTO roles (id, nama_role, deskripsi) VALUES 
        (1, 'Administrator', 'Super admin pengelola website sekolah'),
        (2, 'Guru', 'Tenaga pendidik'),
        (3, 'Siswa', 'Peserta didik');`);
    }

    // 2. Users (Admin)
    const users = await query("SELECT COUNT(*) AS count FROM users;");
    if (parseInt(users[0]?.count || 0) === 0) {
      await query(`INSERT INTO users (id, username, password, email, role_id, status) VALUES 
        (1, 'admin', 'adminsmk6', 'admin@smkn6kendari.sch.id', 1, 'aktif');`);
    }

    // 3. Profil Sekolah
    const profil = await query("SELECT COUNT(*) AS count FROM profil_sekolah;");
    if (parseInt(profil[0]?.count || 0) === 0) {
      await query(`INSERT INTO profil_sekolah 
        (id, nama_sekolah, npsn, alamat, email, telepon, website, logo, foto, visi, misi, sejarah) VALUES 
        (1, 'SMK Negeri 6 Kendari', '40403211', 'Jl. Ahmad Yani No. 120, Kota Kendari, Sulawesi Tenggara', 
         'info@smkn6kendari.sch.id', '(0401) 3123456', 'https://smkn6kendari.sch.id', 'logo smk6.png', 'gedung smk6.jpeg',
         'Menjadi Sekolah Menengah Kejuruan yang unggul, berkarakter, berdaya saing global, dan berwawasan lingkungan pada tahun 2030.',
         '1. Menyelenggarakan pendidikan kejuruan berkualitas berbasis industri.\\n2. Membentuk karakter peserta didik yang berakhlak mulia dan berjiwa wirausaha.\\n3. Meningkatkan kemitraan strategis dengan Dunia Usaha dan Dunia Industri (DUDI).',
         'SMK Negeri 6 Kendari didirikan sebagai pusat keunggulan pendidikan kejuruan di Sulawesi Tenggara.');`);
    }

    // 4. Berita
    const berita = await query("SELECT COUNT(*) AS count FROM berita;");
    if (parseInt(berita[0]?.count || 0) === 0) {
      await query(`INSERT INTO berita (id, judul, slug, isi, gambar, penulis_id, status, tanggal_publish) VALUES 
        (1, 'Pelepasan Siswa KKN & PKL Tahun 2026', 'pelepasan-siswa-kkn-pkl-2026', 'SMK Negeri 6 Kendari secara resmi melepas siswa-siswi yang akan mengikuti program praktik kerja lapangan di berbagai DU/DI.', 'upacara pelepasan.jpeg', 1, 'publish', '2026-05-20'),
        (2, 'Juara 1 Lomba LKS Tingkat Provinsi', 'juara-1-lomba-lks-provinsi', 'Siswa SMK Negeri 6 Kendari meraih Juara 1 pada Lomba Kompetensi Siswa (LKS) bidang IT Network Systems dan Web Technologies.', 'lomba LKS.jpeg', 1, 'publish', '2026-05-15');`);
    }

    // 5. Pengumuman
    const pengumuman = await query("SELECT COUNT(*) AS count FROM pengumuman;");
    if (parseInt(pengumuman[0]?.count || 0) === 0) {
      await query(`INSERT INTO pengumuman (id, judul, isi, tanggal_mulai, tanggal_selesai, status) VALUES 
        (1, 'Jadwal Ujian Akhir Semester Genap', 'Jadwal Ujian Akhir Semester Genap Tahun Ajaran 2025/2026 dapat diakses di portal pengumuman.', '2026-05-25', '2026-06-05', 'aktif'),
        (2, 'Penerimaan Peserta Didik Baru (PPDB) 2026/2027', 'Penerimaan Peserta Didik Baru (PPDB) T.A. 2026/2027 telah dibuka secara online.', '2026-05-18', '2026-06-30', 'aktif');`);
    }

    // 6. Guru
    const guru = await query("SELECT COUNT(*) AS count FROM guru;");
    if (parseInt(guru[0]?.count || 0) === 0) {
      await query(`INSERT INTO guru (id, nip, nama_lengkap, jenis_kelamin, jabatan, email, no_hp, status, foto) VALUES 
        (1, '197508122005011002', 'Drs. H. Ahmad Fauzi, M.Pd.', 'L', 'Kepala Sekolah', 'kepala.sekolah@smkn6kendari.sch.id', '081234567890', 'aktif', 'kepala sekolah.png'),
        (2, '198203152010012015', 'Siti Rahmawati, S.Kom., M.T.', 'P', 'Kaprog RPL', 'siti.rahma@smkn6kendari.sch.id', '081298765432', 'aktif', 'siswa rpl.jpeg');`);
    }

    // 7. Ekstrakurikuler
    const ekskul = await query("SELECT COUNT(*) AS count FROM ekstrakurikuler;");
    if (parseInt(ekskul[0]?.count || 0) === 0) {
      await query(`INSERT INTO ekstrakurikuler (id, nama_ekskul, deskripsi, jadwal, lokasi, foto, status) VALUES 
        (1, 'Pramuka Gudep SMKN 6 Kendari', 'Kegiatan kepramukaan pembentuk kedisiplinan dan jiwa kepemimpinan.', 'Jumat, 15.30 WITA', 'Lapangan Utama', 'pramuka.jpeg', 'aktif'),
        (2, 'Paskibra', 'Pasukan Pengibar Bendera Sekolah.', 'Sabtu, 08.00 WITA', 'Lapangan Utama', 'paskib.jpeg', 'aktif'),
        (3, 'PMR (Palang Merah Remaja)', 'Pelatihan pertolongan pertama dan kemanusiaan.', 'Rabu, 16.00 WITA', 'Ruang UKS', 'pmr.jpeg', 'aktif'),
        (4, 'Futsal Club', 'Ekstrakurikuler olahraga futsal.', 'Kamis, 16.00 WITA', 'Lapangan Olahraga', 'futsal.jpeg', 'aktif');`);
    }

    // 8. Galeri
    const galeri = await query("SELECT COUNT(*) AS count FROM galeri;");
    if (parseInt(galeri[0]?.count || 0) === 0) {
      await query(`INSERT INTO galeri (id, judul, gambar, kategori, deskripsi, tanggal) VALUES 
        (1, 'Upacara Pelepasan PKL', 'upacara pelepasan.jpeg', 'Kegiatan', 'Pelepasan siswa PKL 2026', '2026-05-20'),
        (2, 'Lomba LKS Provinsi', 'lomba LKS.jpeg', 'Prestasi', 'Juara 1 LKS IT Network Systems', '2026-05-15'),
        (3, 'Gedung Utama SMK Negeri 6 Kendari', 'gedung smk6.jpeg', 'Fasilitas', 'Tampak depan gedung utama sekolah', '2026-01-10');`);
    }

    // 9. Prestasi
    const prestasi = await query("SELECT COUNT(*) AS count FROM prestasi;");
    if (parseInt(prestasi[0]?.count || 0) === 0) {
      await query(`INSERT INTO prestasi (id, nama_prestasi, tingkat, peringkat, penyelenggara, tanggal, deskripsi, foto) VALUES 
        (1, 'Lomba Kompetensi Siswa (LKS) Web Technologies', 'Provinsi', 'Juara 1', 'Dinas Pendidikan Sultra', '2026-05-15', 'Meraih medali emas LKS tingkat provinsi', 'lomba LKS.jpeg');`);
    }

    // 10. Agenda
    const agenda = await query("SELECT COUNT(*) AS count FROM agenda;");
    if (parseInt(agenda[0]?.count || 0) === 0) {
      await query(`INSERT INTO agenda (id, judul, deskripsi, tanggal_mulai, tanggal_selesai, lokasi, status) VALUES 
        (1, 'Rapat Koordinasi Guru dan Staf', 'Persiapan Ujian Akhir Semester Genap', '2026-05-28 09:00:00', '2026-05-28 12:00:00', 'Aula SMKN 6 Kendari', 'akan_datang');`);
    }

    console.log('✅ Auto-seeding database db_sekolah selesai.');
  } catch (err) {
    console.error('⚠️ Auto-seeding db_sekolah notice:', err.message);
  }
}

// Module Exports
module.exports = {
  query,
  escapeSqlString,
  testConnection,
  DB_CONFIG,

  // User Auth & Users CRUD (users & roles)
  async verifyUser(username, password) {
    const sql = `SELECT u.*, r.nama_role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.username = ${escapeSqlString(username)} AND u.password = ${escapeSqlString(password)} LIMIT 1;`;
    const rows = await query(sql);
    return rows.length > 0 ? rows[0] : null;
  },

  async getUsers() {
    return await query("SELECT u.id, u.username, u.email, u.status, u.created_at, r.nama_role FROM users u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.id ASC;");
  },

  async createUser({ username, password, email, role_id = 1 }) {
    const sql = `INSERT INTO users (username, password, email, role_id, status) VALUES (
      ${escapeSqlString(username)},
      ${escapeSqlString(password)},
      ${escapeSqlString(email || username + '@smkn6kendari.sch.id')},
      ${escapeSqlString(role_id)},
      'aktif'
    );`;
    await query(sql);
    return true;
  },

  async updateUser({ id, username, password, email }) {
    let updates = [`username = ${escapeSqlString(username)}`];
    if (password) updates.push(`password = ${escapeSqlString(password)}`);
    if (email) updates.push(`email = ${escapeSqlString(email)}`);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  async deleteUser(id) {
    const sql = `DELETE FROM users WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // Berita CRUD (tabel berita)
  async getNews() {
    const rows = await query("SELECT id, judul AS title, isi AS content, isi AS excerpt, DATE_FORMAT(tanggal_publish, '%d %M %Y') AS date, gambar AS image, status FROM berita ORDER BY created_at DESC, id DESC;");
    return rows.map(r => ({
      ...r,
      date: r.date || 'Terbaru'
    }));
  },

  async createNews({ title, excerpt, content, date, image }) {
    const slug = (title || 'berita').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sql = `INSERT INTO berita (judul, slug, isi, gambar, status, tanggal_publish) VALUES (
      ${escapeSqlString(title)},
      ${escapeSqlString(slug + '-' + Date.now())},
      ${escapeSqlString(content || excerpt)},
      ${escapeSqlString(image)},
      'publish',
      NOW()
    );`;
    await query(sql);
    return { title, excerpt, content, date, image };
  },

  async updateNews({ id, title, excerpt, content, image }) {
    const sql = `UPDATE berita SET 
      judul = ${escapeSqlString(title)},
      isi = ${escapeSqlString(content || excerpt)},
      gambar = ${escapeSqlString(image)}
      WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return { id, title, excerpt, content, image };
  },

  async deleteNews(id) {
    const sql = `DELETE FROM berita WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // Pengumuman CRUD (tabel pengumuman)
  async getAnnouncements() {
    const rows = await query("SELECT id, judul, isi AS text, DATE_FORMAT(tanggal_mulai, '%d %M %Y') AS date, status FROM pengumuman ORDER BY created_at DESC, id DESC;");
    return rows.map(r => ({
      ...r,
      link: '#',
      date: r.date || 'Terbaru'
    }));
  },

  async createAnnouncement({ title, text, link }) {
    const sql = `INSERT INTO pengumuman (judul, isi, tanggal_mulai, status) VALUES (
      ${escapeSqlString(title || text)},
      ${escapeSqlString(text || title)},
      CURDATE(),
      'aktif'
    );`;
    await query(sql);
    return { title, text, link };
  },

  async updateAnnouncement({ id, title, text }) {
    const sql = `UPDATE pengumuman SET 
      judul = ${escapeSqlString(title || text)},
      isi = ${escapeSqlString(text || title)}
      WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return { id, title, text };
  },

  async deleteAnnouncement(id) {
    const sql = `DELETE FROM pengumuman WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  // Guru CRUD (tabel guru)
  async getGuru() {
    return await query("SELECT * FROM guru ORDER BY id ASC;");
  },

  async createGuru({ nip, nama_lengkap, jenis_kelamin = 'L', jabatan, email, no_hp, foto }) {
    const sql = `INSERT INTO guru (nip, nama_lengkap, jenis_kelamin, jabatan, email, no_hp, status, foto) VALUES (
      ${escapeSqlString(nip)},
      ${escapeSqlString(nama_lengkap)},
      ${escapeSqlString(jenis_kelamin)},
      ${escapeSqlString(jabatan)},
      ${escapeSqlString(email)},
      ${escapeSqlString(no_hp)},
      'aktif',
      ${escapeSqlString(foto || 'kepala sekolah.png')}
    );`;
    await query(sql);
    return true;
  },

  async updateGuru({ id, nip, nama_lengkap, jenis_kelamin, jabatan, email, no_hp, foto }) {
    let sql = `UPDATE guru SET 
      nip = ${escapeSqlString(nip)},
      nama_lengkap = ${escapeSqlString(nama_lengkap)},
      jenis_kelamin = ${escapeSqlString(jenis_kelamin)},
      jabatan = ${escapeSqlString(jabatan)},
      email = ${escapeSqlString(email)},
      no_hp = ${escapeSqlString(no_hp)}`;
    if (foto) sql += `, foto = ${escapeSqlString(foto)}`;
    sql += ` WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  async deleteGuru(id) {
    await query(`DELETE FROM guru WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Siswa CRUD (tabel siswa)
  async getSiswa() {
    return await query("SELECT * FROM siswa ORDER BY id DESC;");
  },

  async createSiswa({ nis, nisn, nama_lengkap, jenis_kelamin = 'L', email, no_hp, status = 'aktif', foto }) {
    const sql = `INSERT INTO siswa (nis, nisn, nama_lengkap, jenis_kelamin, email, no_hp, status, foto, tahun_masuk) VALUES (
      ${escapeSqlString(nis)},
      ${escapeSqlString(nisn)},
      ${escapeSqlString(nama_lengkap)},
      ${escapeSqlString(jenis_kelamin)},
      ${escapeSqlString(email)},
      ${escapeSqlString(no_hp)},
      ${escapeSqlString(status)},
      ${escapeSqlString(foto || 'siswa rpl.jpeg')},
      YEAR(CURDATE())
    );`;
    await query(sql);
    return true;
  },

  async updateSiswa({ id, nis, nisn, nama_lengkap, jenis_kelamin, email, no_hp, status, foto }) {
    let sql = `UPDATE siswa SET 
      nis = ${escapeSqlString(nis)},
      nisn = ${escapeSqlString(nisn)},
      nama_lengkap = ${escapeSqlString(nama_lengkap)},
      jenis_kelamin = ${escapeSqlString(jenis_kelamin)},
      email = ${escapeSqlString(email)},
      no_hp = ${escapeSqlString(no_hp)},
      status = ${escapeSqlString(status)}`;
    if (foto) sql += `, foto = ${escapeSqlString(foto)}`;
    sql += ` WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  async deleteSiswa(id) {
    await query(`DELETE FROM siswa WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Ekstrakurikuler CRUD (tabel ekstrakurikuler)
  async getEkstrakurikuler() {
    return await query("SELECT * FROM ekstrakurikuler ORDER BY id ASC;");
  },

  async createEkstrakurikuler({ nama_ekskul, deskripsi, jadwal, lokasi, foto }) {
    const sql = `INSERT INTO ekstrakurikuler (nama_ekskul, deskripsi, jadwal, lokasi, foto, status) VALUES (
      ${escapeSqlString(nama_ekskul)},
      ${escapeSqlString(deskripsi)},
      ${escapeSqlString(jadwal)},
      ${escapeSqlString(lokasi)},
      ${escapeSqlString(foto || 'pramuka.jpeg')},
      'aktif'
    );`;
    await query(sql);
    return true;
  },

  async updateEkstrakurikuler({ id, nama_ekskul, deskripsi, jadwal, lokasi, foto }) {
    let sql = `UPDATE ekstrakurikuler SET 
      nama_ekskul = ${escapeSqlString(nama_ekskul)},
      deskripsi = ${escapeSqlString(deskripsi)},
      jadwal = ${escapeSqlString(jadwal)},
      lokasi = ${escapeSqlString(lokasi)}`;
    if (foto) sql += `, foto = ${escapeSqlString(foto)}`;
    sql += ` WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  async deleteEkstrakurikuler(id) {
    await query(`DELETE FROM ekstrakurikuler WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Galeri CRUD (tabel galeri)
  async getGaleri() {
    return await query("SELECT * FROM galeri ORDER BY created_at DESC, id DESC;");
  },

  async createGaleri({ judul, gambar, kategori, deskripsi, tanggal }) {
    const sql = `INSERT INTO galeri (judul, gambar, kategori, deskripsi, tanggal) VALUES (
      ${escapeSqlString(judul)},
      ${escapeSqlString(gambar)},
      ${escapeSqlString(kategori || 'Kegiatan')},
      ${escapeSqlString(deskripsi)},
      ${escapeSqlString(tanggal || new Date().toISOString().slice(0,10))}
    );`;
    await query(sql);
    return true;
  },

  async updateGaleri({ id, judul, gambar, kategori, deskripsi, tanggal }) {
    let sql = `UPDATE galeri SET 
      judul = ${escapeSqlString(judul)},
      kategori = ${escapeSqlString(kategori)},
      deskripsi = ${escapeSqlString(deskripsi)},
      tanggal = ${escapeSqlString(tanggal)}`;
    if (gambar) sql += `, gambar = ${escapeSqlString(gambar)}`;
    sql += ` WHERE id = ${escapeSqlString(id)};`;
    await query(sql);
    return true;
  },

  async deleteGaleri(id) {
    await query(`DELETE FROM galeri WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Prestasi CRUD (tabel prestasi)
  async getPrestasi() {
    return await query("SELECT * FROM prestasi ORDER BY id DESC;");
  },

  async createPrestasi({ nama_prestasi, tingkat, peringkat, penyelenggara, tanggal, deskripsi, foto }) {
    const sql = `INSERT INTO prestasi (nama_prestasi, tingkat, peringkat, penyelenggara, tanggal, deskripsi, foto) VALUES (
      ${escapeSqlString(nama_prestasi)},
      ${escapeSqlString(tingkat)},
      ${escapeSqlString(peringkat)},
      ${escapeSqlString(penyelenggara)},
      ${escapeSqlString(tanggal || new Date().toISOString().slice(0,10))},
      ${escapeSqlString(deskripsi)},
      ${escapeSqlString(foto || 'lomba LKS.jpeg')}
    );`;
    await query(sql);
    return true;
  },

  async deletePrestasi(id) {
    await query(`DELETE FROM prestasi WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Agenda CRUD (tabel agenda)
  async getAgenda() {
    return await query("SELECT *, DATE_FORMAT(tanggal_mulai, '%d %M %Y %H:%i') AS start_date FROM agenda ORDER BY tanggal_mulai DESC;");
  },

  async createAgenda({ judul, deskripsi, tanggal_mulai, tanggal_selesai, lokasi }) {
    const sql = `INSERT INTO agenda (judul, deskripsi, tanggal_mulai, tanggal_selesai, lokasi, status) VALUES (
      ${escapeSqlString(judul)},
      ${escapeSqlString(deskripsi)},
      ${escapeSqlString(tanggal_mulai || new Date().toISOString().slice(0,19).replace('T',' '))},
      ${escapeSqlString(tanggal_selesai)},
      ${escapeSqlString(lokasi)},
      'akan_datang'
    );`;
    await query(sql);
    return true;
  },

  async deleteAgenda(id) {
    await query(`DELETE FROM agenda WHERE id = ${escapeSqlString(id)};`);
    return true;
  },

  // Profil Sekolah CRUD (tabel profil_sekolah)
  async getProfilSekolah() {
    const rows = await query("SELECT * FROM profil_sekolah LIMIT 1;");
    return rows.length > 0 ? rows[0] : null;
  },

  async updateProfilSekolah({ nama_sekolah, npsn, alamat, email, telepon, website, visi, misi, sejarah, logo, foto }) {
    let updates = [
      `nama_sekolah = ${escapeSqlString(nama_sekolah)}`,
      `npsn = ${escapeSqlString(npsn)}`,
      `alamat = ${escapeSqlString(alamat)}`,
      `email = ${escapeSqlString(email)}`,
      `telepon = ${escapeSqlString(telepon)}`,
      `website = ${escapeSqlString(website)}`,
      `visi = ${escapeSqlString(visi)}`,
      `misi = ${escapeSqlString(misi)}`,
      `sejarah = ${escapeSqlString(sejarah)}`
    ];
    if (logo) updates.push(`logo = ${escapeSqlString(logo)}`);
    if (foto) updates.push(`foto = ${escapeSqlString(foto)}`);

    const sql = `UPDATE profil_sekolah SET ${updates.join(', ')} WHERE id = 1;`;
    await query(sql);
    return true;
  }
};

