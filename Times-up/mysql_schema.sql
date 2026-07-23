-- =====================================================================
-- Time's Up Parental Control System - MySQL Schema & Seed Script
-- =====================================================================
-- Designed to be run in MySQL Workbench for local development.
-- Compatible with MySQL 8.0+
-- =====================================================================

-- 1. Create and select Database
CREATE DATABASE IF NOT EXISTS times_up;
USE times_up;

-- 2. Drop existing tables if they exist to allow clean re-runs
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS commands;
DROP TABLE IF EXISTS rules;
DROP TABLE IF EXISTS children;
DROP TABLE IF EXISTS parents;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- TABLE: parents
-- ==========================================
CREATE TABLE parents (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parents_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLE: children
-- ==========================================
CREATE TABLE children (
    id VARCHAR(36) PRIMARY KEY,
    parentId VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    deviceToken VARCHAR(255) NOT NULL UNIQUE,
    batteryPercent INT DEFAULT 100,
    networkType VARCHAR(50) DEFAULT 'WiFi',
    lastSeenAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isLocked BOOLEAN DEFAULT FALSE,
    platform VARCHAR(20) DEFAULT 'android',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parentId) REFERENCES parents(id) ON DELETE CASCADE,
    INDEX idx_children_token (deviceToken),
    INDEX idx_children_parent (parentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLE: rules
-- ==========================================
CREATE TABLE rules (
    id VARCHAR(36) PRIMARY KEY,
    childId VARCHAR(36) NOT NULL,
    ruleType VARCHAR(50) NOT NULL,
    config JSON NOT NULL, -- Holds configuration like blocked apps/domains, screen limit, bedtime startTime/endTime
    enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (childId) REFERENCES children(id) ON DELETE CASCADE,
    INDEX idx_rules_child (childId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLE: commands
-- ==========================================
CREATE TABLE commands (
    id VARCHAR(36) PRIMARY KEY,
    childId VARCHAR(36) NOT NULL,
    command VARCHAR(50) NOT NULL, -- lock, unlock, ring, locate, reset
    status VARCHAR(50) DEFAULT 'pending', -- pending, ack, done
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (childId) REFERENCES children(id) ON DELETE CASCADE,
    INDEX idx_commands_child_status (childId, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLE: activity_logs
-- ==========================================
CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    childId VARCHAR(36) NOT NULL,
    logType VARCHAR(50) NOT NULL, -- location, app_usage, screen_time, message, web_visit, installed_app, call_log, sms
    data JSON NOT NULL, -- Rich payload (e.g. coordinates, call durations, SMS texts)
    occurredAt DATETIME NOT NULL,
    FOREIGN KEY (childId) REFERENCES children(id) ON DELETE CASCADE,
    INDEX idx_logs_child_type (childId, logType),
    INDEX idx_logs_occurred (occurredAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- SEED SAMPLE DATA (Optional but highly recommended)
-- ==========================================

-- 1. Add Parent
-- Email: parent@timesup.com | Password Plain: password123 (bcrypt-hashed with 10 rounds)
INSERT INTO parents (id, email, passwordHash, createdAt) 
VALUES (
    'parent-uuid-001', 
    'parent@timesup.com', 
    '$2a$10$fJtpxI/Z15v8Gsh17L0FkuL.L65r2hK9mXpP6C10GkZ4EisDq3v3e', 
    NOW()
);

-- 2. Add Children
INSERT INTO children (id, parentId, name, deviceToken, batteryPercent, networkType, isLocked, platform, createdAt)
VALUES (
    'alex-child-uuid', 
    'parent-uuid-001', 
    'Alex', 
    'alex-device-uuid-123', 
    85, 
    'WiFi', 
    FALSE, 
    'android', 
    NOW()
);

INSERT INTO children (id, parentId, name, deviceToken, batteryPercent, networkType, isLocked, platform, createdAt)
VALUES (
    'sophia-child-uuid', 
    'parent-uuid-001', 
    'Sophia', 
    'sophia-device-uuid-456', 
    92, 
    'LTE', 
    FALSE, 
    'ios', 
    NOW()
);

-- 3. Add Default Rules for Alex
INSERT INTO rules (id, childId, ruleType, config, enabled) VALUES 
('rule-alex-1', 'alex-child-uuid', 'bedtime', '{"startTime": "22:00", "endTime": "06:00", "timezone": "UTC"}', TRUE),
('rule-alex-2', 'alex-child-uuid', 'screen_time_limit', '{"maxMinutesPerDay": 120}', TRUE),
('rule-alex-3', 'alex-child-uuid', 'blocked_app', '{"appName": "TikTok", "package": "com.zhiliaoapp.musically"}', TRUE),
('rule-alex-4', 'alex-child-uuid', 'blocked_app', '{"appName": "Instagram", "package": "com.instagram.android"}', TRUE),
('rule-alex-5', 'alex-child-uuid', 'blocked_website', '{"domain": "tiktok.com"}', TRUE),
('rule-alex-6', 'alex-child-uuid', 'blocked_website', '{"domain": "instagram.com"}', TRUE);

-- 4. Add Default Rules for Sophia
INSERT INTO rules (id, childId, ruleType, config, enabled) VALUES 
('rule-sophia-1', 'sophia-child-uuid', 'bedtime', '{"startTime": "22:00", "endTime": "06:00", "timezone": "UTC"}', TRUE),
('rule-sophia-2', 'sophia-child-uuid', 'screen_time_limit', '{"maxMinutesPerDay": 120}', TRUE),
('rule-sophia-3', 'sophia-child-uuid', 'blocked_app', '{"appName": "TikTok", "package": "com.zhiliaoapp.musically"}', TRUE),
('rule-sophia-4', 'sophia-child-uuid', 'blocked_app', '{"appName": "Instagram", "package": "com.instagram.android"}', TRUE),
('rule-sophia-5', 'sophia-child-uuid', 'blocked_website', '{"domain": "tiktok.com"}', TRUE),
('rule-sophia-6', 'sophia-child-uuid', 'blocked_website', '{"domain": "instagram.com"}', TRUE);

-- 5. Add Location Log History (Sample points around San Francisco and LA)
INSERT INTO activity_logs (id, childId, logType, data, occurredAt) VALUES 
('log-loc-1', 'alex-child-uuid', 'location', '{"lat": 37.7749, "lng": -122.4194, "accuracy": 15}', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('log-loc-2', 'alex-child-uuid', 'location', '{"lat": 37.7801, "lng": -122.4210, "accuracy": 12}', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('log-loc-3', 'sophia-child-uuid', 'location', '{"lat": 34.0522, "lng": -118.2437, "accuracy": 20}', DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 6. Add Web Visit Logs
INSERT INTO activity_logs (id, childId, logType, data, occurredAt) VALUES 
('log-web-1', 'alex-child-uuid', 'web_visit', '{"url": "https://www.duolingo.com/learn", "title": "Learn Spanish Online - Duolingo", "domain": "duolingo.com"}', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('log-web-2', 'alex-child-uuid', 'web_visit', '{"url": "https://scratch.mit.edu", "title": "Scratch - Imagine, Program, Share", "domain": "mit.edu"}', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
('log-web-3', 'sophia-child-uuid', 'web_visit', '{"url": "https://en.wikipedia.org/wiki/Parental_control", "title": "Parental Control - Wikipedia", "domain": "wikipedia.org"}', DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- 7. Add Screen Time / App Usage logs
INSERT INTO activity_logs (id, childId, logType, data, occurredAt) VALUES 
('log-st-1', 'alex-child-uuid', 'screen_time', '{"minutes": 115}', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('log-st-2', 'sophia-child-uuid', 'screen_time', '{"minutes": 85}', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('log-app-1', 'alex-child-uuid', 'app_usage', '{"app": "Duolingo", "minutes": 45, "category": "Education"}', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('log-app-2', 'alex-child-uuid', 'app_usage', '{"app": "Roblox", "minutes": 70, "category": "Gaming"}', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('log-app-3', 'sophia-child-uuid', 'app_usage', '{"app": "YouTube", "minutes": 55, "category": "Entertainment"}', DATE_SUB(NOW(), INTERVAL 25 MINUTE));

-- 8. Add Installed Apps
INSERT INTO activity_logs (id, childId, logType, data, occurredAt) VALUES 
('log-inst-1', 'alex-child-uuid', 'installed_app', '{"package": "org.duolingo", "name": "Duolingo", "installedAt": "2026-06-01T12:00:00Z"}', DATE_SUB(NOW(), INTERVAL 30 DAY)),
('log-inst-2', 'alex-child-uuid', 'installed_app', '{"package": "com.roblox.client", "name": "Roblox", "installedAt": "2026-06-15T15:00:00Z"}', DATE_SUB(NOW(), INTERVAL 15 DAY));

-- 9. Add Commands history
INSERT INTO commands (id, childId, command, status, createdAt) VALUES 
('cmd-uuid-1', 'alex-child-uuid', 'locate', 'done', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('cmd-uuid-2', 'alex-child-uuid', 'lock', 'pending', DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
SELECT 'Parents count' AS info, COUNT(*) FROM parents UNION ALL
SELECT 'Children count' AS info, COUNT(*) FROM children UNION ALL
SELECT 'Rules count' AS info, COUNT(*) FROM rules;
