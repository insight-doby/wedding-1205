/* Public data and administrator data share the same Supabase project. */
(() => {
  'use strict';
  const root = new URL('../../', document.currentScript.src);
  const settings = window.WEDDING_CONNECTION || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(settings.supabaseUrl || '') && /^sb_publishable_/.test(settings.supabasePublishableKey || '');
  const appScriptConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/i.test(window.WEDDING_CONFIG?.guestbookEndpoint || '');
  let clientPromise;
  function assetUrl(value) {
    if (!value) return '';
    try { const url = new URL(value, root); return /^https?:$/.test(url.protocol) || (root.protocol === 'file:' && url.protocol === 'file:') ? url.href : ''; } catch { return ''; }
  }
  function timeout(promise, ms = 15000) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요.')), ms); })]).finally(() => clearTimeout(timer));
  }
  async function getClient() {
    if (!configured) throw new Error('먼저 config.js의 Supabase 프로젝트 주소와 publishable key를 설정해 주세요.');
    if (!clientPromise) clientPromise = (async () => {
      if (!window.supabase) await timeout(new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('assets/vendor/supabase.js', root).href;
        script.onload = resolve; script.onerror = () => reject(new Error('연결 프로그램을 불러오지 못했어요. 파일 경로를 확인해 주세요.'));
        document.head.append(script);
      }));
      return window.supabase.createClient(settings.supabaseUrl, settings.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'wedding-1205-admin-auth' },
        global: { fetch: (input, init = {}) => {
          // Publishable keys belong in apikey, never in a JWT Bearer header.
          // Preserve the administrator's real Auth access token when present.
          const headers = new Headers(init.headers);
          if (headers.get('Authorization') === `Bearer ${settings.supabasePublishableKey}`) headers.delete('Authorization');
          return fetch(input, { ...init, headers, signal: init.signal || AbortSignal.timeout(15000) });
        } }
      });
    })().catch(error => { clientPromise = null; throw error; });
    return clientPromise;
  }
  function unwrap(result) { if (result.error) throw new Error(result.error.message || '요청을 처리하지 못했어요.'); return result.data; }
  async function rows(table, columns = '*', admin = false) {
    const client = await getClient(), all = [];
    for (let offset = 0; ; offset += 500) {
      let query = client.from(table).select(columns).order(table === 'wedding_messages' ? 'created_at' : 'id', { ascending: table !== 'wedding_messages' }).order('id').range(offset, offset + 499);
      if (!admin && table === 'wedding_messages') query = query.eq('visible', true);
      const batch = unwrap(await timeout(query)); all.push(...batch);
      if (batch.length < 500) return all;
    }
  }
  async function mediaRows(items, admin = false) {
    const paths = [...new Set(items.map(row => row.storage_path).filter(Boolean))];
    const signed = new Map();
    if (paths.length) {
      const client = await getClient();
      for (let i = 0; i < paths.length; i += 100) {
        const data = unwrap(await timeout(client.storage.from(settings.storageBucket).createSignedUrls(paths.slice(i, i + 100), admin ? 3600 : 300)));
        for (const item of data) if (!item.error && item.signedUrl) signed.set(item.path, item.signedUrl);
      }
    }
    return items.map(row => ({ ...row, src: row.storage_path ? signed.get(row.storage_path) || '' : assetUrl(row.image_url) }));
  }
  // 방명록 전용 추가 캐릭터. 기존 웨딩 갤러리 목록과 별도로 관리합니다.
  const extraGuests = [
  {
    "id": 16,
    "name": "라벤더 무스탕 · 카메라",
    "image_url": "assets/images/guests/guest_016.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 107,
    "name": "사원증 직장인",
    "image_url": "assets/images/guests/guest_107.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 150,
    "name": "반짝 카멜 퀼팅",
    "image_url": "assets/images/guests/guest_150.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 174,
    "name": "블루 코트 할머니",
    "image_url": "assets/images/guests/guest_174.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 190,
    "name": "버터 떡볶이코트 꼬마",
    "image_url": "assets/images/guests/guest_190.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 204,
    "name": "턱시도냥 · 코트",
    "image_url": "assets/images/guests/guest_204.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "cat"
  },
  {
    "id": 234,
    "name": "시바 · 하트",
    "image_url": "assets/images/guests/guest_234.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "dog"
  },
  {
    "id": 268,
    "name": "오리 · 멜빵",
    "image_url": "assets/images/guests/guest_268.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "bird"
  },
  {
    "id": 295,
    "name": "북극곰 · 선물",
    "image_url": "assets/images/guests/guest_295.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "bear"
  },
  {
    "id": 300,
    "name": "토끼 · 멜빵",
    "image_url": "assets/images/guests/guest_300.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "rabbit"
  },
  {
    "id": 329,
    "name": "라벤더 목도리 친구",
    "image_url": "assets/images/guests/guest_329.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 330,
    "name": "웃는 회사원",
    "image_url": "assets/images/guests/guest_330.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 331,
    "name": "버건디 코트 친구",
    "image_url": "assets/images/guests/guest_331.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 332,
    "name": "윙크하는 노랑 고양이",
    "image_url": "assets/images/guests/guest_332.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "cat"
  },
  {
    "id": 333,
    "name": "꽃다발 든 강아지",
    "image_url": "assets/images/guests/guest_333.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "dog"
  },
  {
    "id": 334,
    "name": "인사하는 닭",
    "image_url": "assets/images/guests/guest_334.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "bird"
  },
  {
    "id": 335,
    "name": "민트 니트 · 카메라",
    "image_url": "assets/images/guests/guest_335.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 336,
    "name": "레트로 야구 팬",
    "image_url": "assets/images/guests/guest_336.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 337,
    "name": "안경 쓴 책벌레",
    "image_url": "assets/images/guests/guest_337.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 338,
    "name": "셰프 친구",
    "image_url": "assets/images/guests/guest_338.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 339,
    "name": "캠핑 배낭",
    "image_url": "assets/images/guests/guest_339.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 340,
    "name": "꽃집 친구",
    "image_url": "assets/images/guests/guest_340.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 341,
    "name": "자전거 라이더",
    "image_url": "assets/images/guests/guest_341.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 342,
    "name": "음악 애호가",
    "image_url": "assets/images/guests/guest_342.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 343,
    "name": "보드게임 친구",
    "image_url": "assets/images/guests/guest_343.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 344,
    "name": "여행가",
    "image_url": "assets/images/guests/guest_344.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 345,
    "name": "사진작가",
    "image_url": "assets/images/guests/guest_345.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 346,
    "name": "겨울 목도리",
    "image_url": "assets/images/guests/guest_346.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 347,
    "name": "스케이트보더",
    "image_url": "assets/images/guests/guest_347.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 348,
    "name": "플로리스트",
    "image_url": "assets/images/guests/guest_348.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 349,
    "name": "우주 탐험가",
    "image_url": "assets/images/guests/guest_349.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 350,
    "name": "댄서 친구",
    "image_url": "assets/images/guests/guest_350.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 351,
    "name": "책 읽는 어르신",
    "image_url": "assets/images/guests/guest_351.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 352,
    "name": "노란 우비 친구",
    "image_url": "assets/images/guests/guest_352.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "human"
  },
  {
    "id": 353,
    "name": "파란 스웨터 여우",
    "image_url": "assets/images/guests/guest_353.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "fox"
  },
  {
    "id": 354,
    "name": "하트 든 수달",
    "image_url": "assets/images/guests/guest_354.png",
    "active": true,
    "region": null,
    "atlas_size": null,
    "season": [],
    "personality": [],
    "features": [],
    "kind": "otter"
  }
];
  const fallback = {
    characters: [...(window.WEDDING_FALLBACK?.characters || []), ...extraGuests].map(row => ({ ...row, src: assetUrl(row.image_url), label: row.name, atlasSize: row.atlas_size })),
    gallery: (window.WEDDING_FALLBACK?.gallery || []).map(row => ({ ...row, src: assetUrl(row.image_url) }))
  };
  async function catalog(admin = false) {
    const [characters, gallery] = await Promise.all([rows('wedding_characters', '*', admin), rows('wedding_gallery', '*', admin)]);
    const media = await mediaRows([...characters, ...gallery], admin);
    return {
      characters: media.slice(0, characters.length).map(row => ({ ...row, label: row.name, atlasSize: row.atlas_size })),
      gallery: media.slice(characters.length).filter(row => admin || row.visible).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    };
  }
  async function messages(admin = false) {
    if (appScriptConfigured && !admin) return legacyRead();
    return rows('wedding_messages', 'id,name,message,character_id,date_label,visible,created_at', admin);
  }
  async function register(name, message, characterId, requestId) {
    if (appScriptConfigured) {
      // The existing sheet stores three columns; keep the chosen avatar in the message suffix.
      const storedMessage = message + '\n\n[tw-avatar:' + characterId + ']';
      await scriptRequest({ action: 'add', n: name, m: storedMessage });
      const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '.');
      return { n: name, m: storedMessage, d: date, a: characterId, id: requestId };
    }
    const client = await getClient();
    return unwrap(await timeout(client.rpc('register_wedding_guest', { p_name: name, p_message: message, p_character_id: characterId, p_request_id: requestId })));
  }
  async function isAdmin() { const client = await getClient(); return unwrap(await timeout(client.rpc('wedding_is_admin'))) === true; }
  async function mutate(table, action, payload, id) {
    const client = await getClient();
    let query;
    if (action === 'insert') query = client.from(table).insert(payload);
    else if (action === 'update') query = client.from(table).update(payload).eq('id', id);
    else if (action === 'delete') query = client.from(table).delete().eq('id', id);
    else throw new Error('지원하지 않는 작업입니다.');
    const result = unwrap(await timeout(query.select(table === 'wedding_messages' ? 'id' : '*')));
    if (!result.length) throw new Error('변경할 항목이 없거나 수정 권한이 없어요. 새로고침 후 다시 확인해 주세요.');
    return result;
  }
  function scriptRequest(parameters) {
    return new Promise((resolve, reject) => {
      const endpoint = window.WEDDING_CONFIG?.guestbookEndpoint;
      if (!endpoint) { reject(new Error('방명록 연결 주소가 없어요.')); return; }
      const key = 'wedding_' + crypto.randomUUID().replaceAll('-', '');
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('방명록 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.')), 15000);
      function finish(error, result) {
        if (done) return;
        done = true; clearTimeout(timer); script.remove(); delete window[key];
        if (error) reject(error); else resolve(result);
      }
      window[key] = result => result?.ok
        ? finish(null, result)
        : finish(new Error(result?.error || '방명록 요청을 처리하지 못했어요.'));
      script.onerror = () => finish(new Error('방명록에 연결하지 못했어요. 앱스크립트 배포 설정을 확인해 주세요.'));
      script.src = endpoint + '?' + new URLSearchParams({ ...parameters, callback: key });
      document.head.append(script);
    });
  }
  function legacyRead() {
    return scriptRequest({ action: 'list' }).then(result => result.items || []);
  }
  async function validateImage(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG, JPG, WebP 이미지만 올릴 수 있어요.');
    if (file.size > 10 * 1024 * 1024) throw new Error('이미지는 한 장당 10MB 이하로 올려 주세요.');
    const bitmap = await createImageBitmap(file);
    const info = { width: bitmap.width, height: bitmap.height }; bitmap.close();
    if (info.width < 64 || info.height < 64) throw new Error('가로·세로 64px 이상의 이미지를 사용해 주세요.');
    return info;
  }
  async function upload(file, type) {
    await validateImage(file);
    const client = await getClient();
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
    const path = `${type}/${crypto.randomUUID()}.${ext}`;
    unwrap(await timeout(client.storage.from(settings.storageBucket).upload(path, file, { cacheControl: '300', upsert: false, contentType: file.type }), 30000));
    return path;
  }
  async function removeMedia(path) { if (!path) return; const client = await getClient(); unwrap(await timeout(client.storage.from(settings.storageBucket).remove([path]))); }
  function loadImage(src) {
    if (!src) return Promise.resolve(false);
    return new Promise(resolve => {
      const img = new Image(); const timer = setTimeout(() => resolve(false), 7000);
      img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 0); };
      img.onerror = () => { clearTimeout(timer); resolve(false); }; img.src = src;
    });
  }
  window.WeddingData = { configured, appScriptConfigured, root, settings, fallback, assetUrl, getClient, timeout, unwrap, catalog, messages, register, isAdmin, mutate, mediaRows, legacyRead, validateImage, upload, removeMedia, loadImage };
})();
