/* ============================================================================
   File : assets/js/ad_media_pack.js (Part 3A — Commercial Images Map)
   Kaam : Global JS dictionary (window.ADGENIUS_MEDIA) jo har category ki photo
          ka path rakhti hai (food, study, tech, fashion, coffee, beauty),
          taaki video_engine.js 60fps frame banane se pehle photo load kar le.
   ============================================================================ */

// Object window par banta hai taaki har JS file padh sake.
// Chhoti key (jaise food_1) ko assets/images/ ki asli .jpg se jodta hai.
window.ADGENIUS_MEDIA = {
    food_1:    'assets/images/food_ad.jpg',      // Food ad shot 1: wood-fired pizza aur burger
    food_2:    'assets/images/food_ad_2.jpg',    // Food ad shot 2: double cheeseburger aur fries
    study_1:   'assets/images/study_ad.jpg',     // Study ad shot 1: modern college campus
    study_2:   'assets/images/study_ad_2.jpg',   // Study ad shot 2: practical coding lab
    tech_1:    'assets/images/tech_ad.jpg',      // Tech ad shot: wireless studio headphone
    fashion_1: 'assets/images/fashion_ad.jpg',   // Sneakers ad shot: streetwear shoes
    coffee_1:  'assets/images/coffee_ad.jpg',    // Coffee ad shot: iced arabica cold brew
    beauty_1:  'assets/images/beauty_ad.jpg'     // Skincare ad shot: botanical glow serum
};
