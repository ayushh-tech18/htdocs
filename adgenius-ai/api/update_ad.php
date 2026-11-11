<?php
// ============================================================================
// File    : api/update_ad.php (Part 4G — Saved Campaign ko Update karna)
// Kaam    : CRUD ka U (Update) part. Naye form values se 4 scene dobara bana kar
//           MySQL row UPDATE karta hai. WHERE me user_id hai, isliye har user
//           sirf apna hi campaign edit kar sakta hai.
// ============================================================================

require_once __DIR__ . '/includes/ad_builder.php';

$userId = requireAuthAPI();
$pdo    = getDBConnection();

// fetch() ne jo JSON body bheji hai use padhte hain
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    sendJSON(['success' => false, 'message' => 'Invalid request data.'], 400);
}

$projectId   = (int) ($data['id'] ?? 0);
$productName = trim($data['product_name'] ?? '');
$productDesc = trim($data['product_desc'] ?? '');
$platform    = trim($data['platform'] ?? 'Instagram Reels');
$aspectRatio = trim($data['aspect_ratio'] ?? '9:16');
$category    = trim($data['category'] ?? 'auto');

// Server-side validation, bilkul generate_ad.php jaisa
if ($projectId <= 0) {
    sendJSON(['success' => false, 'message' => 'Campaign id is missing.'], 400);
}
if (strlen($productName) < 3 || strlen($productDesc) < 10) {
    sendJSON(['success' => false, 'message' => 'Product name and offer are too short.'], 400);
}

// Naye values se storyboard dobara banate hain
$built = buildCommercialStoryboard([
    'product_name' => $productName,
    'product_desc' => $productDesc,
    'ad_language'  => 'English',
    'category'     => $category
]);

// Prepared statement se UPDATE hota hai (SQL injection safe)
$sql = "UPDATE ad_projects
        SET product_name = ?, product_desc = ?, category = ?, platform = ?,
            aspect_ratio = ?, scenes_json = ?, caption_text = ?, hashtags = ?
        WHERE id = ? AND user_id = ?";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    $productName,
    $productDesc,
    $built['category'],
    $platform,
    $aspectRatio,
    json_encode($built['scenes'], JSON_UNESCAPED_UNICODE),
    $built['caption_text'],
    $built['hashtags'],
    $projectId,
    $userId
]);

sendJSON([
    'success' => true,
    'message' => 'Campaign updated',
    'project' => [
        'id'           => $projectId,
        'product_name' => $productName,
        'product_desc' => $productDesc,
        'category'     => $built['category'],
        'platform'     => $platform,
        'aspect_ratio' => $aspectRatio,
        'ad_language'  => 'English',
        'duration_sec' => 15,
        'scenes'       => $built['scenes'],
        'caption_text' => $built['caption_text'],
        'hashtags'     => $built['hashtags'],
        'created_at'   => date('d M Y, h:i A')
    ]
]);
?>
