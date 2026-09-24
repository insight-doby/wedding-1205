const embeddedCoupleArtwork="assets/images/couple.png";window.WEDDING_CONFIG = {"siteUrl": "https://insight-doby.github.io/wedding-1205/", "preview": false, "guestbookEndpoint": "https://script.google.com/macros/s/AKfycbxomevMICFV4kTY-2q_XBXcLskSdxxjD0A5toe6VdMllWhfhAsARk-JWeeiGQ2Anp1fyA/exec", "kakaoKey": "2aad38244991547c604b64ab67937c6b", "groomPhone": "", "bridePhone": "", "accounts": [{"label": "신랑측", "items": [{"name": "김도훈", "bank": "카카오뱅크", "number": "3333-16-0106781"}, {"name": "김형석", "bank": "농협", "number": "302-1282-7857-31"}, {"name": "이정자", "bank": "우리", "number": "1002-256-516645"}]}, {"label": "신부측", "items": [{"name": "이영현", "bank": "카카오뱅크", "number": "3333-08-8056644"}, {"name": "이창규", "bank": "국민", "number": "078-24-0713-839"}, {"name": "박순미", "bank": "국민", "number": "078-21-0373-321"}]}], "photos": [{"src": "assets/images/gallery/wedding-01.jpg", "alt": "꽃다발을 든 도훈과 웃고 있는 영현의 웨딩 사진"}], "cover": "assets/images/gallery/wedding-01.jpg", "music": "assets/audio/bgm.mp3", "weddingTime": "2026-12-05T15:40:00+09:00", "avatarTag": "tw-avatar", "coupleAvatars": {"groom": {"src": embeddedCoupleArtwork, "atlasSize": [1536, 1024], "region": [218, 48, 404, 924]}, "bride": {"src": embeddedCoupleArtwork, "atlasSize": [1536, 1024], "region": [780, 80, 624, 899]}}};

// 여기 세 곳만 직접 입력합니다. 비밀번호 / secret / service_role 키는 넣지 않습니다.
window.WEDDING_CONNECTION = {
  supabaseUrl: "SUPABASE_PROJECT_URL",
  supabasePublishableKey: "SUPABASE_PUBLISHABLE_KEY",
  kakaoMapJavaScriptKey: "2aad38244991547c604b64ab67937c6b",
  storageBucket: "wedding-media"
};
window.WEDDING_VENUE = {
  name: "웨딩시티 아모르홀",
  address: "서울특별시 구로구 새말로 97",
  detail: "신도림테크노마트 8층",
  latitude: null, longitude: null,
  expectedRoad: { region: "구로구", road: "새말로", number: "97" }
};
