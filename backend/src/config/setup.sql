CREATE DATABASE IF NOT EXISTS hotvid;
USE hotvid;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role ENUM('viewer','creator','admin') DEFAULT 'viewer',
  is_verified TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
  id VARCHAR(36) PRIMARY KEY,
  follower_id VARCHAR(36) NOT NULL,
  following_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(36) PRIMARY KEY,
  creator_id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  cloudflare_video_id VARCHAR(255),
  duration INT DEFAULT 0,
  views INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  hashtags TEXT,
  status ENUM('processing','live','removed') DEFAULT 'live',
  is_promoted TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  video_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  video_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  parent_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ads (
  id VARCHAR(36) PRIMARY KEY,
  advertiser_id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  video_url TEXT,
  banner_url TEXT,
  target_country VARCHAR(5) DEFAULT 'UG',
  budget_ugx BIGINT DEFAULT 0,
  spent_ugx BIGINT DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  status ENUM('active','paused','completed') DEFAULT 'active',
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10),
  price_ugx BIGINT NOT NULL,
  creator_cut_percent INT DEFAULT 70,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_transactions (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  gift_id VARCHAR(36) NOT NULL,
  amount_ugx BIGINT NOT NULL,
  platform_cut_ugx BIGINT NOT NULL,
  creator_cut_ugx BIGINT NOT NULL,
  video_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL,
  balance_ugx BIGINT DEFAULT 0,
  total_earned_ugx BIGINT DEFAULT 0,
  total_withdrawn_ugx BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50),
  title VARCHAR(255),
  body TEXT,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO gifts (id, name, emoji, price_ugx, creator_cut_percent) VALUES
('g1','Rose','🌹',500,70),
('g2','Trophy','🏆',5000,70),
('g3','Rocket','🚀',25000,70),
('g4','Crown','👑',100000,70),
('g5','Diamond','💎',500000,70);
