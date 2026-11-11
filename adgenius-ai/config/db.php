<?php
// ============================================================================
// File    : config/db.php (Part 4B — PDO MySQL Connection aur Auto-Setup)
// Kaam    : PDO se MySQL se safely connect karta hai, pehli baar me database
//           aur tables khud bana deta hai, aur JS ko JSON reply bhejta hai.
// ============================================================================

// config.php pehle load karta hai taaki DB_HOST, DB_NAME sab mil jaye
require_once __DIR__ . '/config.php';

// getDBConnection() MySQL ka PDO object deta hai.
// Agar database nahi bana hai to adgenius_db.sql chala kar bana deta hai.
function getDBConnection(): PDO {
    static $pdo = null;

    // Connection ek baar bana to wahi reuse hota hai (fast rehta hai)
    if ($pdo !== null) {
        return $pdo;
    }

    // PDO ki teen zaroori safety settings
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Error aane par saaf exception do
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Rows ko clean associative array mein do
        PDO::ATTR_EMULATE_PREPARES   => false,                  // SQL Injection hacking se 100% safety
    ];

    try {
        // Seedha 'adgenius_db' database se connect karne ki koshish
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

        // 'users' table pehle se bani hai ya nahi, yeh check karta hai
        $pdo->query("SELECT 1 FROM users LIMIT 1");
        return $pdo;

    } catch (PDOException $e) {
        // Database nahi mila (pehli baar XAMPP chal raha hai), to khud bana dete hain
        try {
            $serverDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
            $rootPdo = new PDO($serverDsn, DB_USER, DB_PASS, $options);

        // database/adgenius_db.sql file padh kar poora SQL chala deta hai
            $sqlFile = dirname(__DIR__) . '/database/adgenius_db.sql';
            if (file_exists($sqlFile)) {
                $sqlContent = file_get_contents($sqlFile);
                $rootPdo->exec($sqlContent);
            }

        // Naye bane 'adgenius_db' se connect ho kar connection return karta hai
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            return $pdo;

        } catch (PDOException $innerEx) {
        // XAMPP me MySQL band ho to saaf error message bhejta hai
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'message' => 'MySQL connect nahi hua! Kripya XAMPP mein MySQL Start karein. Error: ' . $innerEx->getMessage()
            ]));
        }
    }
}

// JSON reply bhejne wala helper function. PHP array ko json_encode se
// JSON text banata hai aur fetch() ko wapas deta hai.
function sendJSON(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Logged in user ki id deta hai. Login na ho to demo user (id = 1) maan leta hai.
function requireAuthAPI(): int {
    if (!empty($_SESSION['user_id'])) {
        return (int) $_SESSION['user_id'];
    }
    $_SESSION['user_id']   = 1;
    $_SESSION['user_name'] = 'Demo User';
    return 1;
}
?>
