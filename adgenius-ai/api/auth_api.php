<?php
// ============================================================================
// Kaam    : MySQL 'users' table me account save aur verify karta hai.
//           password_hash() se password encrypt hota hai, password_verify() se
//           check hota hai, aur login $_SESSION me yaad rehta hai.
// ============================================================================

require_once dirname(__DIR__) . '/config/db.php';

// fetch() ki bheji raw JSON body ko PHP array me padhte hain
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);
if (!is_array($data)) {
    $data = $_POST;
}

$action = $data['action'] ?? ($_GET['action'] ?? '');
$pdo = getDBConnection();

// ============================================================================
// 1. REGISTER — naya user account banata hai
// ============================================================================
if ($action === 'register') {
    $fullName = trim($data['full_name'] ?? '');
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    // Name, email ka format aur password ki length check karta hai
    if (strlen($fullName) < 2) {
        sendJSON(['success' => false, 'message' => 'Kripya apna poora naam likhein.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJSON(['success' => false, 'message' => 'Kripya sahi Email ID daalein.'], 400);
    }
    if (strlen($password) < 5) {
        sendJSON(['success' => false, 'message' => 'Password kam se kam 5 characters ka hona chahiye.'], 400);
    }

    // Yeh email MySQL me pehle se hai ya nahi, check karta hai
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        sendJSON(['success' => false, 'message' => 'Yeh Email pehle se registered hai. Kripya Sign In karein.'], 409);
    }

    // password_hash() plain password ko safe Bcrypt hash bana deta hai.
    // Plain password kabhi database me store nahi hota.
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $insertStmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)");
    $insertStmt->execute([$fullName, $email, $hashedPassword]);

    // Naye user ka login PHP session me save karta hai
    $_SESSION['user_id']    = (int) $pdo->lastInsertId();
    $_SESSION['user_name']  = $fullName;
    $_SESSION['user_email'] = $email;

    sendJSON(['success' => true]);
}

// ============================================================================
// 2. LOGIN — purane user ka password verify karta hai
// ============================================================================
if ($action === 'login') {
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // password_verify() typed password ko Bcrypt hash se compare karta hai.
    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendJSON(['success' => false, 'message' => 'Galat Email ya Password.'], 401);
    }

    $_SESSION['user_id']    = (int) $user['id'];
    $_SESSION['user_name']  = $user['full_name'];
    $_SESSION['user_email'] = $user['email'];

    sendJSON(['success' => true]);
}

// ============================================================================
// 3. DEMO LOGIN — ek click me demo account login
// ============================================================================
if ($action === 'demo_login') {
    $stmt = $pdo->prepare("SELECT id, full_name, email FROM users WHERE email = '[email protected]' LIMIT 1");
    $stmt->execute();
    $demoUser = $stmt->fetch();

    if (!$demoUser) {
        $hash = password_hash('demo123', PASSWORD_DEFAULT);
        $ins = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)");
        $ins->execute(['Demo User', '[email protected]', $hash]);
        $demoUser = [
            'id'        => (int) $pdo->lastInsertId(),
            'full_name' => 'Demo User',
            'email'     => '[email protected]'
        ];
    }

    $_SESSION['user_id']    = (int) $demoUser['id'];
    $_SESSION['user_name']  = $demoUser['full_name'];
    $_SESSION['user_email'] = $demoUser['email'];

    sendJSON(['success' => true]);
}

// ============================================================================
// 4. SAVE ACCOUNT — index.html ke 'Account' tab me login aur signup dono yahi se
// Email pehle se ho to password verify kar ke login, naya ho to account bana deta hai.
// ============================================================================
if ($action === 'save_account') {
    $fullName = trim($data['full_name'] ?? '');
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if (strlen($fullName) < 2) {
        sendJSON(['success' => false, 'message' => 'Kripya apna poora naam likhein.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJSON(['success' => false, 'message' => 'Kripya sahi Email ID daalein.'], 400);
    }
    if (strlen($password) < 4) {
        sendJSON(['success' => false, 'message' => 'Password kam se kam 4 characters ka hona chahiye.'], 400);
    }

    // Yeh email MySQL 'users' table me pehle se hai ya nahi
    $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Account pehle se hai to password verify karta hai
        if (!password_verify($password, $existing['password_hash'])) {
            sendJSON(['success' => false, 'message' => 'Is email ka password galat hai.'], 401);
        }
        $upd = $pdo->prepare("UPDATE users SET full_name = ? WHERE id = ?");
        $upd->execute([$fullName, (int) $existing['id']]);
        $userId = (int) $existing['id'];
    } else {
        // Email naya hai to password hash kar ke naya user INSERT karta hai
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $ins = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)");
        $ins->execute([$fullName, $email, $hashedPassword]);
        $userId = (int) $pdo->lastInsertId();
    }

    // Login session me save karta hai aur naam frontend ko wapas bhejta hai
    $_SESSION['user_id']    = $userId;
    $_SESSION['user_name']  = $fullName;
    $_SESSION['user_email'] = $email;

    sendJSON([
        'success' => true,
        'user'    => [
            'id'        => $userId,
            'full_name' => $fullName,
            'email'     => $email
        ]
    ]);
}

// ============================================================================
// 5. LOGOUT — session ko destroy kar deta hai
// ============================================================================
if ($action === 'logout') {
    session_unset();
    session_destroy();
    sendJSON(['success' => true]);
}

sendJSON(['success' => false, 'message' => 'Invalid request'], 400);
?>
