<?php
// ============================================================================
// File    : api/generate_ad.php (Part 4D — Ad Create karne wali API)
// Kaam    : 'Generate Video Ad' button dabne par chalti hai. JS ka JSON leti hai,
//           ad_builder.php se 4 scene banwati hai aur MySQL me INSERT karti hai.
// ============================================================================

require_once __DIR__ . '/includes/ad_builder.php';

// Logged in user ki id (ya demo id = 1) aur MySQL ka PDO connection lete hain
$userId = requireAuthAPI();
$pdo = getDBConnection();

// fetch() ne php://input se jo raw JSON bheja hai use padhta hai.
// json_decode(..., true) us JSON text ko PHP array me badal deta hai.
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    sendJSON(['success' => false, 'message' => 'Invalid request data.'], 400);
}

// Har form value par trim() lagta hai taaki extra space hat jaye
$productName = trim($data['product_name'] ?? '');
$productDesc = trim($data['product_desc'] ?? '');
$platform    = trim($data['platform'] ?? 'Instagram Reels');
$aspectRatio = trim($data['aspect_ratio'] ?? '9:16');
$adLanguage  = trim($data['ad_language'] ?? 'Hinglish');
$category    = trim($data['category'] ?? 'auto');
$durationSec = 15;

// Server-side validation: brand name kam se kam 3 character aur offer 10 character
if (strlen($productName) < 3 || strlen($productDesc) < 10) {
    sendJSON(['success' => false, 'message' => 'Product name (3+ chars) and offer (10+ chars) are required.'], 400);
}

// Step 1: PHP storyboard builder se 4 scene, caption aur hashtags banwaate hain
$built = buildCommercialStoryboard([
    'product_name' => $productName,
    'product_desc' => $productDesc,
    'ad_language'  => $adLanguage,
    'category'     => $category
]);

// Step 2: PDO prepared statement (? placeholder) se safe INSERT hota hai.
// prepare() + execute() ki wajah se SQL injection hacking namumkin hai.
$stmt = $pdo->prepare("INSERT INTO ad_projects (
    user_id, product_name, product_desc, category, platform,
    aspect_ratio, ad_language, duration_sec, scenes_json, caption_text, hashtags
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

$stmt->execute([
    $userId,
    $productName,
    $productDesc,
    $built['category'],
    $platform,
    $aspectRatio,
    $adLanguage,
    $durationSec,
    json_encode($built['scenes'], JSON_UNESCAPED_UNICODE), // 4 scene JSON text me save hote hain
    $built['caption_text'],
    $built['hashtags']
]);

// MySQL ne jo naya AUTO_INCREMENT id banaya, use padhte hain
$projectId = (int) $pdo->lastInsertId();

// Step 3: Naya bana project JSON me frontend ko wapas bhejte hain
sendJSON([
    'success' => true,
    'project' => [
        'id'           => $projectId,
        'product_name' => $productName,
        'product_desc' => $productDesc,
        'category'     => $built['category'],
        'platform'     => $platform,
        'aspect_ratio' => $aspectRatio,
        'ad_language'  => $adLanguage,
        'duration_sec' => $durationSec,
        'scenes'       => $built['scenes'],
        'caption_text' => $built['caption_text'],
        'hashtags'     => $built['hashtags'],
        'created_at'   => date('d M Y, h:i A')
    ]
]);
?>