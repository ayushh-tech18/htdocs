<?php
// ============================================================================
// Kaam    : Pure PHP engine jo 4-scene commercial script banata hai. Product name
//           aur offer se category pakadta hai, phir 4 scene (headline, photo,
//           color, CTA) aur ready caption banata hai.
// ============================================================================

require_once dirname(__DIR__, 2) . '/config/db.php';

// Category pakadne wala function (preg_match se keyword matching).
// Text me pizza likha ho to 'food', college ya btech ho to 'study' return karta hai.
function detectVisualCategory(string $text, string $explicitCat = 'auto'): string {
    if ($explicitCat !== '' && $explicitCat !== 'auto') {
        return $explicitCat;
    }
    $t = strtolower($text);

    // Food ke keywords check karta hai
    if (preg_match('/pizza|burger|food|cafe|restaur|fries|momo|biryani|snack|meal|kitchen|cheese|zomato|swiggy/', $t)) {
        return 'food';
    }
    // College aur study ke keywords check karta hai
    if (preg_match('/study|college|universit|campus|course|exam|jee|neet|bca|btech|mba|class|academy|coaching|student|learn|coding|degree/', $t)) {
        return 'study';
    }
    // Coffee aur beverage ke keywords check karta hai
    if (preg_match('/coffee|brew|latte|espresso|chai|tea|drink|beverage/', $t)) {
        return 'coffee';
    }
    // Fashion aur sneakers ke keywords check karta hai
    if (preg_match('/shoe|sneaker|fashion|hoodie|shirt|wear|jacket|clothing|apparel|style/', $t)) {
        return 'fashion';
    }
    // Skincare aur beauty ke keywords check karta hai
    if (preg_match('/serum|skin|glow|beauty|cream|cosmetic|face|perfume|hair/', $t)) {
        return 'beauty';
    }
    // Baaki har product ke liye default me tech theme use hoti hai
    return 'tech';
}

// Main 4-scene storyboard builder function. 4 scene ka array, social media
// caption aur hashtags return karta hai.
function buildCommercialStoryboard(array $input): array {
    $product  = trim($input['product_name']);
    $desc     = trim($input['product_desc']);
    $lang     = 'English';   // video ka copy sirf English me hai
    $catInput = trim($input['category'] ?? 'auto');
    $cat      = detectVisualCategory($product . ' ' . $desc, $catInput);

    // Chhe commercial category ki visual theme dictionary. Har category ke photo
    // keys (img1, img2), accent color aur CTA button yahan set hote hain.
    $themes = [
        'food' => [
            'img1' => 'food_1', 'img2' => 'food_2', 'accent' => '#f97316',
            'kicker' => 'HOT & FRESH KITCHEN', 'watermark' => 'CRAVING',
            'specs' => ['100% Real Mozzarella & Smashed Double Patty', '25-Minute Piping Hot Doorstep Delivery'],
            'cta' => 'ORDER FRESH NOW'
        ],
        'study' => [
            'img1' => 'study_1', 'img2' => 'study_2', 'accent' => '#38bdf8',
            'kicker' => 'ADMISSIONS OPEN 2026', 'watermark' => 'FUTURE',
            'specs' => ['Modern Software, Cloud & Robotics Labs', '96% Placement Track Record With Top MNCs'],
            'cta' => 'APPLY FOR 2026 BATCH'
        ],
        'coffee' => [
            'img1' => 'coffee_1', 'img2' => 'coffee_1', 'accent' => '#f59e0b',
            'kicker' => 'CRAFT COLD BREW', 'watermark' => 'ARABICA',
            'specs' => ['100% Roasted Arabica • Zero Added Sugar', 'Smooth Ice-Cold Energy Anytime'],
            'cta' => 'SHOP COLD BREW'
        ],
        'fashion' => [
            'img1' => 'fashion_1', 'img2' => 'fashion_1', 'accent' => '#fb7185',
            'kicker' => 'NEW SEASON DROP', 'watermark' => 'STREET',
            'specs' => ['Ultra-Light Cushion & Breathable Knit', 'Limited Edition Streetwear Silhouette'],
            'cta' => 'EXPLORE COLLECTION'
        ],
        'beauty' => [
            'img1' => 'beauty_1', 'img2' => 'beauty_1', 'accent' => '#eab308',
            'kicker' => 'DERMAT TESTED CARE', 'watermark' => 'RADIANCE',
            'specs' => ['Pure Botanical Actives • Zero Parabens', 'Visible Glass-Skin Radiance In 7 Days'],
            'cta' => 'SHOP SKINCARE'
        ],
        'tech' => [
            'img1' => 'tech_1', 'img2' => 'tech_1', 'accent' => '#818cf8',
            'kicker' => 'NEXT-GEN ENGINEERING', 'watermark' => 'FLAGSHIP',
            'specs' => ['Studio-Grade Acoustics & All-Day Battery', 'Precision Matte Finish • Fast Charge'],
            'cta' => 'SHOP NOW'
        ]
    ];

    // Chuni hui category ki theme uthata hai aur lamba offer 64 character me chhota karta hai
    $th = $themes[$cat] ?? $themes['food'];
    $shortDesc = mb_strlen($desc) > 64 ? mb_substr($desc, 0, 61) . '...' : $desc;

    // 4 scene banate hain: Scene 1 (hook), Scene 2 (highlights), Scene 3 (experience), Scene 4 (offer CTA)
    $scenes = [
        [
            'scene_no'  => 1,
            'tag'       => $th['kicker'],
            'headline'  => "Experience {$product}",
            'subtext'   => $shortDesc,
            'duration'  => 3.6,
            'image_key' => $th['img1'],
            'accent'    => $th['accent'],
            'badge'     => 'FEATURED'
        ],
        [
            'scene_no'  => 2,
            'tag'       => 'SIGNATURE QUALITY',
            'headline'  => 'Crafted For Everyday Excellence',
            'subtext'   => $shortDesc,
            'specs'     => $th['specs'],
            'duration'  => 3.6,
            'image_key' => $th['img2'],
            'accent'    => $th['accent'],
            'badge'     => 'VERIFIED'
        ],
        [
            'scene_no'  => 3,
            'tag'       => 'THE DIFFERENCE',
            'headline'  => "Upgrade Your Everyday With {$product}",
            'subtext'   => $desc,
            'watermark' => $th['watermark'],
            'duration'  => 3.6,
            'image_key' => $th['img1'],
            'accent'    => $th['accent'],
            'badge'     => 'TOP RATED'
        ],
        [
            'scene_no'  => 4,
            'tag'       => 'EXCLUSIVE OFFER',
            'headline'  => $product,
            'subtext'   => $shortDesc,
            'cta_text'  => $th['cta'],
            'duration'  => 3.6,
            'image_key' => $th['img2'],
            'accent'    => $th['accent'],
            'badge'     => 'LIMITED PERIOD OFFER'
        ]
    ];
    $caption = "Discover {$product}. {$desc} Designed for those who expect the best.";

    // Brand name se space aur symbol hata kar saaf hashtag banata hai
    $cleanBrand = preg_replace('/[^a-zA-Z0-9]/', '', ucwords($product)) ?: 'BrandAd';
    $hashtags = "#{$cleanBrand} #CommercialAd #BrandCampaign #ShortVideoAd";

    // Final storyboard data api/generate_ad.php ko wapas deta hai
    return [
        'category'     => $cat,
        'caption_text' => $caption,
        'hashtags'     => $hashtags,
        'scenes'       => $scenes
    ];
}
?>
