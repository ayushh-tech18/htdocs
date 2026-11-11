-- ============================================================================
-- File : database/adgenius_db.sql (Part 5 — Pure MySQL Database Schema)
-- Kaam : MySQL database ka structure aur sample data. 'adgenius_db' database,
-- 'users' aur 'ad_projects' table banata hai, aur 2 sample ad daalta hai.
-- ============================================================================
-- CREATE DATABASE IF NOT EXISTS — database na ho to bana deta hai.
-- utf8mb4 character set har tarah ka text symbol support karta hai.
CREATE DATABASE IF NOT EXISTS adgenius_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Aage jo bhi table banega wo 'adgenius_db' ke andar banega
USE adgenius_db;
-- ============================================================================
-- TABLE 1: users — website ke creators ke login account rakhta hai.
-- id (primary key), full_name, unique email aur encrypted password save karta hai.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
id INT AUTO_INCREMENT PRIMARY KEY, -- Har naye user ko unique id milti hai: 1, 2, 3...
full_name VARCHAR(100) NOT NULL, -- User ka poora naam (khali nahi chhod sakte)
email VARCHAR(150) NOT NULL UNIQUE, -- UNIQUE = ek email se do account nahi ban sakte
password_hash VARCHAR(255) NOT NULL, -- password_hash() se encrypt kiya hua password
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Account banne ki exact date aur time
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ============================================================================
-- TABLE 2: ad_projects — user ki har short video ad aur uske 4 scene.
-- Product name, offer, category, scenes_json aur caption MySQL me rehta hai.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_projects (
id INT AUTO_INCREMENT PRIMARY KEY, -- Har video project ki unique id
user_id INT NOT NULL, -- Yeh ad kis user ne banaya (users.id se juda hua)
product_name VARCHAR(150) NOT NULL, -- Brand ya product ka naam
product_desc TEXT NOT NULL, -- Main offer aur highlights ka text
category VARCHAR(40) NOT NULL DEFAULT 'food', -- Template category (food, study, tech...)
platform VARCHAR(50) NOT NULL DEFAULT 'Instagram Reels',-- Kis social platform ke liye ad hai
aspect_ratio VARCHAR(15) NOT NULL DEFAULT '9:16', -- Video ka size (9:16, 16:9, 1:1)
ad_language VARCHAR(30) NOT NULL DEFAULT 'English', -- Ad ki language
duration_sec INT NOT NULL DEFAULT 15, -- Video ki length (15 second)
scenes_json LONGTEXT NOT NULL, -- Video ke 4 scene JSON array ki tarah
caption_text TEXT NOT NULL, -- Ready social media post ka caption
hashtags VARCHAR(500) NOT NULL, -- Ready hashtags
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- FOREIGN KEY + ON DELETE CASCADE: user delete karne par uski saari ads
-- apne aap saaf ho jaati hain.
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ============================================================================
-- SAMPLE DATA (INSERT IGNORE row pehle se ho to error nahi deta, skip kar deta hai)
-- ============================================================================
-- Default demo user account (email: demo@adgenius.com | password: demo123)
INSERT IGNORE INTO users (id, full_name, email, password_hash)
VALUES (
1,
'Demo User',
'demo@adgenius.com',
'$2y$12$/fbhJhpB5e2xGB4/HrLtv.RDn0.SoWcY.L8SScqZIBRlODhIVN7ei'
);
-- Sample ad 1: food commercial (pizza aur double cheeseburger)
INSERT IGNORE INTO ad_projects (
id, user_id, product_name, product_desc, category, platform,
aspect_ratio, ad_language, duration_sec, scenes_json, caption_text, hashtags
) VALUES (
1,
1,
'FlameCraft Pizza & Burger',
'Wood-fired pepperoni pizza and a double smashed cheeseburger - Buy 1 Get 1 Free, 25 minute hot delivery.',
'food',
'Instagram Reels',
'9:16',
'English',
15,
'[{"scene_no":1,"tag":"HOT & FRESH KITCHEN","headline":"Experience FlameCraft Pizza & Burger","subtext":"Wood-fired pepperoni pizza and a double smashed che
'Wood-fired pizza and a double smashed cheeseburger at your doorstep in just 25 minutes. Order today - Buy 1 Get 1 Free is live.',
'#FlameCraft #PizzaAndBurger #FoodCommercial #ReelsAd #ShortVideoAd'
);
-- Sample ad 2: college aur study commercial
INSERT IGNORE INTO ad_projects (
id, user_id, product_name, product_desc, category, platform,
aspect_ratio, ad_language, duration_sec, scenes_json, caption_text, hashtags
) VALUES (
2,
1,
'Apex Institute of Technology',
'B.Tech, BCA & Computer Science Admissions 2026 Open — Modern Labs, Mentors & Up to 50% Merit Scholarship.',
'study',
'Instagram Reels',
'9:16',
'English',
15,
'[{"scene_no":1,"tag":"ADMISSIONS OPEN 2026","headline":"Experience Apex Institute of Technology","subtext":"B.Tech, BCA and Computer Science programs with industry focused learning","duration":3.6,"image_key":"study_1","accent":"#38bdf8","badge":"FEATURED"},{"scene_no":2,"tag":"SIGNATURE QUALITY","headline":"Crafted For Everyday Excellence","subtext":"Hands-on live projects from the very first semester","specs":["Modern Software, Cloud & Robotics Labs","96% Placement Track Record With Top MNCs"],"duration":3.6,"image_key":"study_2","accent":"#38bdf8","badge":"VERIFIED"},{"scene_no":3,"tag":"THE DIFFERENCE","headline":"Upgrade Your Everyday With Apex Institute of Technology","subtext":"One-on-one mentorship, hackathons and global internships","watermark":"FUTURE","duration":3.6,"image_key":"study_1","accent":"#38bdf8","badge":"TOP RATED"},{"scene_no":4,"tag":"EXCLUSIVE OFFER","headline":"Apex Institute of Technology","subtext":"Up to 50% Merit Scholarship - Seats Limited","cta_text":"APPLY FOR 2026 BATCH","duration":3.6,"image_key":"study_2","accent":"#38bdf8","badge":"LIMITED PERIOD OFFER"}]',
    'Admissions Open 2026 at Apex Institute of Technology. Build your future with modern coding labs, hands-on projects and strong campus placements.',
    '#ApexInstitute #CollegeAdmissions2026 #StudySmart #CampusLife #ShortVideoAd'
);
