<?php
// ============================================================================
// File    : config/config.php (Part 4A — PHP Session aur Database Setting)
// Kaam    : PHP session start karta hai aur XAMPP MySQL ki host, port,
//           username aur database name define karta hai.
// ============================================================================

// Session already chalu hai ya nahi, yeh check karta hai.
// session_start() secure cookie setting ke saath chalta hai taaki $_SESSION kaam kare.
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    // Cookie 1 din (86400 sec) tak zinda rehti hai aur httponly se protect hoti hai
    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);
    session_start();
}

// Indian Standard Time (IST) set karta hai, taaki saved ads par sahi time dikhe.
date_default_timezone_set('Asia/Kolkata');

// XAMPP MySQL ki default value. XAMPP me user 'root' aur password khali ('') hota hai.
define('DB_HOST', '127.0.0.1');     // localhost ka IP address
define('DB_PORT', '3306');          // MySQL ka default port number
define('DB_USER', 'root');          // XAMPP MySQL ka default username
define('DB_PASS', '');              // XAMPP MySQL ka default khali password
define('DB_NAME', 'adgenius_db');   // Hamare project ke database ka naam

define('APP_NAME', 'AdGenius Studio');
?>
