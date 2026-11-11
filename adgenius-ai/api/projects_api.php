<?php
// ============================================================================
// File    : api/projects_api.php (Part 4E — Saved Ads List, Search aur Delete)
// Kaam    : MySQL 'ad_projects' table se ads laata hai, search karta hai aur
//           delete button dabne par chuni hui ad ko hata deta hai.
// ============================================================================

require_once dirname(__DIR__) . '/config/db.php';

// Current user ki id aur MySQL ka PDO connection lete hain
$userId = requireAuthAPI();
$pdo = getDBConnection();

// Action ka naam URL query (?action=list) ya POST JSON body se padhte hain
$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $action = $body['action'] ?? $action;
}

// ============================================================================
// ACTION 0: SEARCH — SQL LIKE se saved ads filter karta hai (search requirement)
// Title, category aur platform me keyword dhundhta hai. % wildcard ke saath
// bindValue use hota hai, isliye query injection safe rehti hai.
// ============================================================================
if ($action === 'search') {
    $term = trim($_GET['q'] ?? ($body['q'] ?? ''));

    $like = '%' . $term . '%';
    $stmt = $pdo->prepare(
        "SELECT * FROM ad_projects
         WHERE user_id = ?
           AND (product_name LIKE ? OR category LIKE ? OR platform LIKE ?)
         ORDER BY id DESC
         LIMIT 30"
    );
    $stmt->execute([$userId, $like, $like, $like]);
    $rows = $stmt->fetchAll();

    $found = [];
    foreach ($rows as $row) {
        $found[] = [
            'id'           => (int) $row['id'],
            'product_name' => $row['product_name'],
            'product_desc' => $row['product_desc'],
            'category'     => $row['category'],
            'platform'     => $row['platform'],
            'aspect_ratio' => $row['aspect_ratio'],
            'ad_language'  => $row['ad_language'],
            'duration_sec' => (int) $row['duration_sec'],
            'scenes'       => json_decode($row['scenes_json'], true) ?: [],
            'caption_text' => $row['caption_text'],
            'hashtags'     => $row['hashtags'],
            'created_at'   => date('d M Y', strtotime($row['created_at']))
        ];
    }

    sendJSON(['success' => true, 'projects' => $found, 'query' => $term]);
}

// ============================================================================
// ACTION 1: LIST — user ke saare saved ads MySQL se laata hai
// ORDER BY id DESC se sabse naya ad sabse upar dikhta hai.
// ============================================================================
if ($action === 'list' || empty($action)) {
    $stmt = $pdo->prepare("SELECT * FROM ad_projects WHERE user_id = ? ORDER BY id DESC LIMIT 30");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $projects = [];
    foreach ($rows as $row) {
        $projects[] = [
            'id'           => (int) $row['id'],
            'product_name' => $row['product_name'],
            'product_desc' => $row['product_desc'],
            'category'     => $row['category'],
            'platform'     => $row['platform'],
            'aspect_ratio' => $row['aspect_ratio'],
            'ad_language'  => $row['ad_language'],
            'duration_sec' => (int) $row['duration_sec'],
            // Database me pada JSON text wapas scenes array ban jata hai
            'scenes'       => json_decode($row['scenes_json'], true) ?: [],
            'caption_text' => $row['caption_text'],
            'hashtags'     => $row['hashtags'],
            'created_at'   => date('d M Y', strtotime($row['created_at']))
        ];
    }

    sendJSON(['success' => true, 'projects' => $projects]);
}

// ============================================================================
// ACTION 2: DELETE — saved ad ko MySQL table se hata deta hai
// WHERE id = ? AND user_id = ? ki wajah se user sirf apni hi ad delete kar sakta hai.
// ============================================================================
if ($action === 'delete') {
    $projectId = (int) ($body['project_id'] ?? ($_GET['id'] ?? 0));
    $del = $pdo->prepare("DELETE FROM ad_projects WHERE id = ? AND user_id = ?");
    $del->execute([$projectId, $userId]);

    sendJSON(['success' => true, 'message' => 'Campaign deleted']);
}

sendJSON(['success' => false, 'message' => 'Unknown action'], 400);
?>