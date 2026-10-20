CREATE DATABASE IF NOT EXISTS subradar_db;
USE subradar_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    monthly_budget DECIMAL(10, 2) DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    color_code VARCHAR(20) NOT NULL
);

-- 3. Subscriptions Table (Linked via Foreign Keys)
CREATE TABLE IF NOT EXISTS subscriptions (
    sub_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    billing_cycle ENUM('Monthly', 'Yearly') DEFAULT 'Monthly',
    next_renewal_date DATE NOT NULL,
    status ENUM('Active', 'Paused') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

-- Insert Default User
INSERT IGNORE INTO users (user_id, username, email, monthly_budget) 
VALUES (1, 'Arun', 'arun@mait.ac.in', 4500.00);

-- Insert Default Categories
INSERT IGNORE INTO categories (category_id, category_name, color_code) VALUES
(1, 'Cloud & Dev Tools', '#6366f1'),
(2, 'Fitness & Health', '#10b981'),
(3, 'Entertainment', '#f43f5e'),
(4, 'Gaming & Passes', '#f59e0b'),
(5, 'Utilities & Storage', '#06b6d4');

-- Insert Sample Subscriptions
INSERT INTO subscriptions (user_id, category_id, service_name, cost, billing_cycle, next_renewal_date, status) VALUES
(1, 2, 'Gym Membership', 1500.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Active'),
(1, 1, 'GitHub Copilot Pro', 850.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'Active'),
(1, 3, 'Netflix Standard', 499.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 18 DAY), 'Active'),
(1, 4, 'Clash Royale Pass', 449.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Active'),
(1, 5, 'Apple iCloud+ 50GB', 75.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 22 DAY), 'Active'),
(1, 3, 'Crunchyroll Fan', 79.00, 'Monthly', DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Paused');