-- Schema Database SMK Negeri 6 Kendari
CREATE DATABASE IF NOT EXISTS `smk_kendari`;
USE `smk_kendari`;

-- Tabel Admin
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table Berita (News)
CREATE TABLE IF NOT EXISTS `news` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` LONGTEXT,
  `date` VARCHAR(100),
  `image` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table Pengumuman (Announcements)
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` VARCHAR(100),
  `text` TEXT NOT NULL,
  `link` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table Pesan (Messages)
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `subject` VARCHAR(255),
  `message` TEXT NOT NULL,
  `timestamp` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin user if not exists
INSERT IGNORE INTO `users` (`id`, `username`, `password`) VALUES (1, 'admin', 'adminsmk6');

-- Insert initial sample news if table is empty
INSERT IGNORE INTO `news` (`id`, `title`, `excerpt`, `content`, `date`, `image`) VALUES
('1', 'Pelepasan Siswa KKN & PKL Tahun 2026', 'SMK Negeri 6 Kendari secara resmi melepas siswa-siswi yang akan mengikuti program praktik kerja lapangan.', 'Acara pelepasan berlangsung khidmat di aula sekolah dengan dihadiri seluruh dewan guru dan orang tua siswa. Kepala Sekolah berpesan agar siswa menjaga nama baik sekolah dan mengasah keterampilan di dunia kerja.', '20 Mei 2026', 'upacara pelepasan.jpeg'),
('2', 'Juara 1 Lomba LKS Tingkat Provinsi', 'Siswa SMK Negeri 6 Kendari meraih Juara 1 pada Lomba Kompetensi Siswa (LKS) bidang IT Network Systems.', 'Prestasi membanggakan kembali diraih oleh siswa SMK Negeri 6 Kendari. Melalui persiapan matang dan pembimbingan insentif, kontingen sekolah berhasil menyabet gelar juara 1 dan berhak maju ke tingkat nasional.', '15 Mei 2026', 'lomba LKS.jpeg');

-- Insert initial sample announcements if table is empty
INSERT IGNORE INTO `announcements` (`id`, `date`, `text`, `link`) VALUES
('1', '25 Mei 2026', 'Jadwal Ujian Akhir Semester Genap Tahun Ajaran 2025/2026 dapat diunduh di portal pengumuman.', '#'),
('2', '18 Mei 2026', 'Penerimaan Peserta Didik Baru (PPDB) T.A. 2026/2027 telah dibuka secara online.', '#');
