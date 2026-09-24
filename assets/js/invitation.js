(() => {
  'use strict';
  const config = window.WEDDING_CONFIG || {};
  const Data = window.WeddingData;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const preview = config.preview === true || params.get('preview') === '1' || !(Data.configured || Data.appScriptConfigured);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'two-winters-preview-v1';
  const MAX_GARDEN_GUESTS = 50;
  let guestAvatars = preview ? Data.fallback.characters.filter(a => a.active) : [];
  let avatarById = new Map((preview ? Data.fallback.characters : []).map(a => [a.id, a]));
  const failedAvatarIds = new Set();
  const verifiedImages = new Set();
  let visibleAvatarIds = [], selectedAvatarId = 'random', shuffling = false;
  let catalogReady = Promise.resolve(), catalogUpdatedAt = 0, pendingSubmission = null;
  let entries = [], shownEntries = [], waitingEntries = [], rotationSlot = 0, rotationTimer;
  let selectedPhoto = 0, messageLimit = 20, ownEntry = null, moving = !prefersReducedMotion.matches, sending = false, currentOpener = null, lastSuccess = 0, hasLoaded = false;
  const transientEntries = [];
  let toastTimer;

  function notify(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3000); }
  function hash(value) { let h = 0; for (const c of String(value)) h = (Math.imul(h, 31) + c.codePointAt(0)) | 0; return h >>> 0; }
  function koreaDate() { return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-', '.'); }
  function normalizeEntry(row) {
    row = row && typeof row === 'object' ? row : {};
    const raw = String(row.m ?? row.message ?? '');
    const match = raw.match(/\n?\n?\[tw-avatar:(\d+)\]\s*$/);
    const n = String(row.n ?? row.name ?? '축하 손님').slice(0,40);
    const m = match ? raw.slice(0, match.index) : raw;
    const d = String(row.d ?? row.date_label ?? row.date ?? '').slice(0,30);
    const requestedAvatar = Number(match ? match[1] : row.character_id ?? row.a);
    // Never silently change the avatar chosen for an existing message.
    const a = Number.isSafeInteger(requestedAvatar) ? requestedAvatar : null;
    return {n,m,d,a,key:row.id || hash(n+'|'+raw+'|'+d).toString(36)};
  }
  function shuffled(items) {
    const result = [...items];
    for(let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
    return result;
  }
  async function usableAvatar(avatar) {
    if(verifiedImages.has(avatar.src)) return true;
    if(failedAvatarIds.has(avatar.id)) return false;
    const valid = await Data.loadImage(avatar.src);
    if(valid) verifiedImages.add(avatar.src); else failedAvatarIds.add(avatar.id);
    return valid;
  }
  function setAvatar(element,index) {
    const avatar=index===0 ? config.coupleAvatars?.groom : index===1 ? config.coupleAvatars?.bride : avatarById.get(index);
    element.classList.toggle('missing-avatar', !avatar?.src);
    if(!avatar?.src) return;
    element.style.setProperty('--avatar-image', `url(${JSON.stringify(Data.assetUrl(avatar.src))})`);
    const region=avatar.region, size=avatar.atlasSize || avatar.atlas_size;
    const valid=Array.isArray(region)&&region.length===4&&Array.isArray(size)&&size.length===2&&[...region,...size].every(Number.isFinite)&&region[0]>=0&&region[1]>=0&&region[2]>0&&region[3]>0&&region[0]+region[2]<=size[0]&&region[1]+region[3]<=size[1];
    if(!valid) { element.style.setProperty('--figure-width','100%'); element.style.setProperty('--atlas-size','contain'); element.style.setProperty('--atlas-position','center bottom'); return; }
    const [x,y,w,h]=region;
    element.style.setProperty('--figure-width',`${w/h*100}%`);
    element.style.setProperty('--atlas-size',`${size[0]/w*100}% ${size[1]/h*100}%`);
    element.style.setProperty('--atlas-position',`${x/Math.max(1,size[0]-w)*100}% ${y/Math.max(1,size[1]-h)*100}%`);
  }
  function createDoll(index) { const node = document.createElement('span'); node.className = 'doll'; node.setAttribute('aria-hidden','true'); setAvatar(node,index); return node; }
  let savedScroll=0;
  function openDialog(dialog,opener) {
    currentOpener=opener||document.activeElement;
    if(!document.querySelector('dialog[open]')) {
      savedScroll=window.scrollY; document.body.style.position='fixed'; document.body.style.top=`-${savedScroll}px`; document.body.style.width='100%';
    }
    dialog.showModal(); document.body.classList.add('dialog-open');
  }
  function closeDialog(dialog) { dialog.close(); }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) { document.body.classList.remove('dialog-open'); document.body.style.position=''; document.body.style.top=''; document.body.style.width=''; const previous=document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0,savedScroll); document.documentElement.style.scrollBehavior=previous; } if (currentOpener?.isConnected) currentOpener.focus({preventScroll:true}); });
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog); });
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog($(button.dataset.close))));

  if (preview) { $('previewBanner').hidden = false; $('previewFormNote').hidden = false; document.querySelector('.public-note').textContent='배포된 청첩장에서는 이름과 메시지가 공개돼요.'; }
  setAvatar(document.querySelector('.groom .doll'),0);setAvatar(document.querySelector('.bride .doll'),1);
  if (config.cover) $('coverPhoto').src = config.cover;

  let photos=preview ? Data.fallback.gallery.filter(p=>p.visible) : [], galleryPage=0;
  const PHOTO_PAGE_SIZE=18;
  function renderGallery() {
    const pages=Math.max(1,Math.ceil(photos.length/PHOTO_PAGE_SIZE));
    galleryPage=Math.min(galleryPage,pages-1); $('galleryTrack').replaceChildren();
    photos.slice(galleryPage*PHOTO_PAGE_SIZE,(galleryPage+1)*PHOTO_PAGE_SIZE).forEach((photo,offset)=>{
      const index=galleryPage*PHOTO_PAGE_SIZE+offset;
      const button=document.createElement('button'); button.className='gallery-slide'; button.type='button'; button.setAttribute('aria-label',`웨딩 사진 ${index+1} 크게 보기`);
      const img=document.createElement('img'); img.src=photo.src; img.alt=photo.alt||'두 사람의 웨딩 사진'; img.loading='lazy'; img.draggable=false; button.append(img);
      img.addEventListener('error',()=>{ button.hidden=true; $('galleryStatus').textContent='일부 사진을 불러오지 못했어요. 잠시 후 새로고침해 주세요.'; });
      button.addEventListener('click',()=>{ selectedPhoto=index; updateLargePhoto(); openDialog($('photoDialog'),button); }); $('galleryTrack').append(button);
    });
    $('galleryCount').textContent=`${galleryPage+1} / ${pages}`;
    $('galleryPrev').disabled=galleryPage===0; $('galleryNext').disabled=galleryPage>=pages-1;
    document.querySelector('.gallery-control').hidden=photos.length<=PHOTO_PAGE_SIZE;
    $('galleryStatus').textContent=photos.length?'':'사진을 준비하고 있어요.';
  }
  function updateLargePhoto() {
    if(!photos.length) return;
    selectedPhoto=(selectedPhoto+photos.length)%photos.length;
    const photo=photos[selectedPhoto]; $('largePhoto').src=photo.src; $('largePhoto').alt=photo.alt||'두 사람의 웨딩 사진'; $('largePhoto').draggable=false;
    $('largeCount').textContent=`${selectedPhoto+1} / ${photos.length}`;
    $('largePrev').disabled=photos.length<2; $('largeNext').disabled=photos.length<2;
  }
  $('galleryPrev').addEventListener('click',()=>{galleryPage--;renderGallery();});
  $('galleryNext').addEventListener('click',()=>{galleryPage++;renderGallery();});
  $('largePrev').addEventListener('click',()=>{selectedPhoto--;updateLargePhoto();});
  $('largeNext').addEventListener('click',()=>{selectedPhoto++;updateLargePhoto();});
  $('photoDialog').addEventListener('keydown',event=>{if(event.key==='ArrowLeft')$('largePrev').click();if(event.key==='ArrowRight')$('largeNext').click();});
  for(const area of [$('galleryTrack'),$('photoDialog')]) for(const type of ['contextmenu','dragstart','selectstart','copy']) area.addEventListener(type,event=>event.preventDefault());
  renderGallery();

  let day=1; const first=new Date(Date.UTC(2026,11,1)).getUTCDay();
  for(let row=0;row<5;row++){const tr=document.createElement('tr');for(let col=0;col<7;col++){const td=document.createElement('td');if((row>0||col>=first)&&day<=31){const span=document.createElement('span');span.textContent=String(day);if(day===5){span.className='wedding-day';td.setAttribute('aria-label','12월 5일, 결혼식');}td.append(span);day++;}tr.append(td);}$('calendarBody').append(tr);}
  function updateCountdown(){const today=new Date();const kst=new Date(today.getTime()+9*60*60*1000);const midnight=Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate());const days=Math.round((Date.UTC(2026,11,5)-midnight)/86400000);$('countdown').replaceChildren();const strong=document.createElement('strong');if(days>0){strong.textContent=`${days}일`;$('countdown').append('도훈과 영현의 결혼식이 ',strong,' 남았습니다.');}else if(days===0){strong.textContent='오늘';$('countdown').append('드디어 ',strong,', 함께해 주셔서 감사합니다.');}else{$('countdown').textContent='우리의 시작을 함께해 주셔서 감사합니다.';}}
  updateCountdown();document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCountdown();});
  $('saveDate').addEventListener('click',()=>{const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Two Winters//Wedding//KO','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:wedding-1205-dh-yh@insight-doby.github.io','DTSTAMP:'+new Date().toISOString().replace(/[-:]|\.\d{3}/g,''),'DTSTART:20261205T064000Z','SUMMARY:김도훈 · 이영현 결혼식','LOCATION:웨딩시티 아모르홀 / 서울시 구로구 새말로 97 신도림테크노마트 8층','DESCRIPTION:2026년 12월 5일 토요일 오후 3시 40분\\n'+config.siteUrl,'URL:'+config.siteUrl,'END:VEVENT','END:VCALENDAR',''].join('\r\n');const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='dohun-younghyun-wedding.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('캘린더 파일을 열어 일정을 추가해 주세요.');});

  async function copy(text,success){try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{const el=document.createElement('textarea');el.value=text;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw new Error('copy');}notify(success);}catch{notify('자동 복사가 어려워요. 표시된 내용을 길게 눌러 복사해 주세요.');}}
  $('copyAddress').addEventListener('click',()=>copy('서울시 구로구 새말로 97 신도림테크노마트 8층 웨딩시티 아모르홀','예식장 주소를 복사했어요.'));
  $('copyLink').addEventListener('click',()=>copy(config.siteUrl,'청첩장 링크를 복사했어요.'));
  let kakaoPromise;
  function loadKakao(){if(window.Kakao)return Promise.resolve(window.Kakao);if(kakaoPromise)return kakaoPromise;kakaoPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';script.crossOrigin='anonymous';script.onload=()=>window.Kakao?resolve(window.Kakao):reject(new Error('load'));script.onerror=reject;document.head.append(script);});return kakaoPromise;}
  $('shareKakao').addEventListener('click',async()=>{if(preview){notify('배포 후 기존 청첩장 주소로 공유돼요.');return;}try{const Kakao=await loadKakao();if(!Kakao.isInitialized())Kakao.init(config.kakaoKey);Kakao.Share.sendDefault({objectType:'feed',content:{title:'도훈 ♥ 영현, 우리의 행복한 겨울에 초대합니다',description:'2026.12.05 토요일 오후 3:40 · 신도림 웨딩시티 아모르홀',imageUrl:new URL('assets/images/gallery/wedding-01.jpg?v=20260924',config.siteUrl).href,link:{mobileWebUrl:config.siteUrl,webUrl:config.siteUrl}},buttons:[{title:'청첩장 보기',link:{mobileWebUrl:config.siteUrl,webUrl:config.siteUrl}}]});}catch{if(navigator.share){try{await navigator.share({title:'도훈 · 영현 결혼식에 초대합니다',url:config.siteUrl});return;}catch(e){if(e.name==='AbortError')return;}}await copy(config.siteUrl,'청첩장 링크를 복사했어요. 카카오톡에 붙여 넣어 주세요.');}});
  const music=$('backgroundMusic');music.src=config.music||'assets/audio/bgm.mp3';music.volume=.35;
  $('musicButton').addEventListener('click',async()=>{try{if(music.paused){await music.play();$('musicButton').setAttribute('aria-pressed','true');$('musicButton').setAttribute('aria-label','배경음악 끄기');$('musicLabel').textContent='ON';}else{music.pause();$('musicButton').setAttribute('aria-pressed','false');$('musicButton').setAttribute('aria-label','배경음악 켜기');$('musicLabel').textContent='OFF';}}catch{notify('음악을 재생하지 못했어요. 잠시 후 다시 눌러 주세요.');}});

  [['groomPhone','신랑에게 연락하기'],['bridePhone','신부에게 연락하기']].forEach(([field,label])=>{const phone=String(config[field]||'').replace(/[^0-9+]/g,'');if(!/^\+?\d{9,13}$/.test(phone)||/0{7}/.test(phone))return;const a=document.createElement('a');a.href='tel:'+phone;a.textContent=label;$('contacts').append(a);$('contacts').hidden=false;});
  if(Array.isArray(config.accounts)&&config.accounts.length){for(const group of config.accounts){if(!Array.isArray(group.items)||!group.items.length)continue;const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=group.label||'마음 전하실 곳';const content=document.createElement('div');for(const item of group.items){if(!item.bank||!item.number||/0{3}[- ]?0{3}/.test(item.number))continue;const row=document.createElement('div');row.className='account-row';const info=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name||'';const p=document.createElement('p');p.textContent=item.bank+' '+item.number;info.append(name,p);const btn=document.createElement('button');btn.type='button';btn.textContent='복사';btn.addEventListener('click',()=>copy(item.number.replace(/\D/g,''),'계좌번호를 복사했어요.'));row.append(info,btn);content.append(row);}if(content.children.length){details.append(summary,content);$('accountsList').append(details);$('accountsSection').hidden=false;}}}

  function choice(avatar) {
    const label=document.createElement('label'); label.className='avatar-option';
    const radio=document.createElement('input'); radio.type='radio'; radio.name='avatar'; radio.value=avatar?String(avatar.id):'random'; radio.checked=radio.value===String(selectedAvatarId);
    const name=avatar?.label||'무작위'; radio.setAttribute('aria-label',name);
    radio.addEventListener('change',()=>{selectedAvatarId=radio.value;pendingSubmission=null;});
    const small=document.createElement('small');small.textContent=name;
    let figure;
    if(avatar)figure=createDoll(avatar.id);else{figure=document.createElement('img');figure.className='random-image';figure.src=Data.assetUrl('assets/images/guests/random.svg');figure.alt='물음표';figure.draggable=false;}
    label.append(radio,figure,small);return label;
  }
  function redrawChoices() {
    if(selectedAvatarId!=='random'&&!visibleAvatarIds.includes(Number(selectedAvatarId))) {selectedAvatarId='random';pendingSubmission=null;}
    $('avatarOptions').replaceChildren(choice(null),...visibleAvatarIds.map(id=>choice(avatarById.get(id))));
  }
  async function renderAvatarChoices() {
    if(shuffling)return;
    shuffling=true; $('shuffleAvatars').disabled=true; $('sendGuestbook').disabled=true;
    const pool=shuffled(guestAvatars.filter(a=>!failedAvatarIds.has(a.id)));
    // Prefer unseen friends but keep drawing without duplicates for small pools.
    pool.sort((a,b)=>Number(visibleAvatarIds.includes(a.id))-Number(visibleAvatarIds.includes(b.id)));
    const selected=[];
    while(pool.length&&selected.length<5){
      const batch=pool.splice(0,5-selected.length);
      const valid=await Promise.all(batch.map(usableAvatar));
      batch.forEach((avatar,i)=>{if(valid[i])selected.push(avatar.id);});
    }
    visibleAvatarIds=selected;redrawChoices();
    const count=guestAvatars.filter(a=>!failedAvatarIds.has(a.id)).length;
    $('avatarPoolNote').textContent=count?`${count}명의 친구가 기다려요. 주사위로 다시 만나 보세요.`:'지금은 만날 수 있는 친구를 준비하고 있어요.';
    shuffling=false; $('shuffleAvatars').disabled=count===0; $('sendGuestbook').disabled=count===0||sending;
  }
  async function loadCatalog() {
    try {
      const data=(preview||Data.appScriptConfigured)?Data.fallback:await Data.catalog();
      avatarById=new Map(data.characters.map(a=>[a.id,a]));
      guestAvatars=data.characters.filter(a=>a.active&&a.src);
      photos=data.gallery.filter(p=>p.visible&&p.src); failedAvatarIds.clear(); catalogUpdatedAt=Date.now();
      await renderAvatarChoices(); renderGallery(); renderGarden(); if(!$('messageList').hidden)renderMessages();
    } catch(error) {
      $('avatarPoolNote').textContent='친구들을 불러오지 못했어요. 잠시 후 새로고침해 주세요.';
      $('galleryStatus').textContent='사진을 불러오지 못했어요. 잠시 후 새로고침해 주세요.';
      $('sendGuestbook').disabled=guestAvatars.length===0;
      setGuestbookError(error.message); throw error;
    }
  }
  $('shuffleAvatars').addEventListener('click',renderAvatarChoices);
  redrawChoices();
  $('openGuestbook').addEventListener('click',()=>{
    selectedAvatarId='random';pendingSubmission=null;redrawChoices();$('formError').hidden=true;
    if(Date.now()-catalogUpdatedAt>240000){catalogReady=loadCatalog();catalogReady.catch(()=>{});}
    if(!hasLoaded)loadEntries();openDialog($('writeDialog'),$('openGuestbook'));
  });
  $('guestMessage').addEventListener('input',()=>{$('messageLength').textContent=`${$('guestMessage').value.length} / 240`;});
  function showMessage(entry,opener){setAvatar($('messageAvatar'),entry.a);$('messageTitle').textContent=entry.n+' 님의 축하';$('messageBody').textContent=entry.m;$('messageDate').textContent=entry.d;openDialog($('messageDialog'),opener);}
  document.querySelectorAll('.couple').forEach(button=>button.addEventListener('click',()=>showMessage({n:button.classList.contains('groom')?'도훈':'영현',m:'우리의 행복한 시작에 함께해 주셔서 감사합니다.\n12월 5일, 반갑게 만나요!',d:'2026.12.05',a:button.classList.contains('groom')?0:1},button)));
  function isOwn(entry){return ownEntry&&entry.n===ownEntry.n&&entry.m===ownEntry.m&&entry.a===ownEntry.a;}
  function gardenSlots(count) {
    const columns=count<=6?Math.max(1,Math.ceil(count/2)):Math.min(10,Math.ceil(Math.sqrt(count*2)));
    const rows=Math.max(1,Math.ceil(count/columns));
    return Array.from({length:count},(_,i)=>{
      const row=Math.floor(i/columns);
      return {x:5+90*(i%columns+.5)/columns,y:52+36*(row+.5)/rows,size:Math.min(21,80/columns,36/rows*1.05),z:4+row};
    });
  }
  function putGuest(button,entry) {
    button.gardenEntry=entry;
    button.dataset.key=entry.key;
    button.classList.toggle('is-mine',Boolean(isOwn(entry)));
    button.setAttribute('aria-label',entry.n+' 님의 축하 메시지 보기');
    const name=document.createElement('span');name.className='char-name';name.textContent=entry.n;
    button.replaceChildren(createDoll(entry.a),name);
  }
  function rotateGarden() {
    if(!waitingEntries.length)return;
    const buttons=$('gardenGuests').children;
    const batch=Math.min(5,waitingEntries.length);
    for(let i=0;i<batch;i++){
      const slot=(rotationSlot+i)%shownEntries.length;
      const outgoing=shownEntries[slot];
      const incoming=waitingEntries.shift();
      shownEntries[slot]=incoming;
      putGuest(buttons[slot],incoming);
      waitingEntries.push(outgoing);
    }
    rotationSlot=(rotationSlot+batch)%shownEntries.length;
  }
  function updateGardenRotation() {
    clearInterval(rotationTimer);
    if(waitingEntries.length&&$('garden').classList.contains('is-active'))
      rotationTimer=setInterval(rotateGarden,9000);
  }
  function renderGarden(){
    shownEntries=entries.slice(0,MAX_GARDEN_GUESTS);
    waitingEntries=shuffled(entries.slice(MAX_GARDEN_GUESTS));
    rotationSlot=0;
    const slots=gardenSlots(shownEntries.length), fragment=document.createDocumentFragment();
    shownEntries.forEach((entry,i)=>{
      const button=document.createElement('button');button.type='button';
      button.className='character guest'+(shownEntries.length>36&&i%2?'':' animated-guest');
      button.style.setProperty('--x',slots[i].x+'%');
      button.style.setProperty('--y',slots[i].y+'%');
      button.style.setProperty('--guest-size',slots[i].size+'%');
      button.style.setProperty('--z',String(slots[i].z));
      button.style.setProperty('--delay',(-i*.37)+'s');
      button.addEventListener('click',()=>showMessage(button.gardenEntry,button));
      putGuest(button,entry);fragment.append(button);
    });
    $('gardenGuests').replaceChildren(fragment);
    $('garden').classList.toggle('dense',shownEntries.length>6);
    $('garden').classList.toggle('crowded',shownEntries.length>36);
    $('gardenWelcome').hidden=entries.length>0;
    $('gardenCount').textContent=entries.length?`${entries.length}개의 따뜻한 마음이 함께하고 있어요`:'첫 번째 축하를 기다리고 있어요';
    updateGardenRotation();
  }
  function renderMessages(){const fragment=document.createDocumentFragment();if(!entries.length){const p=document.createElement('p');p.className='message-list-empty';p.textContent='첫 번째 축하 메시지를 남겨 주세요.';fragment.append(p);}for(const entry of entries.slice(0,messageLimit)){const card=document.createElement('article');card.className='message-card';const content=document.createElement('div');content.className='message-card-content';const head=document.createElement('div');head.className='message-card-head';const name=document.createElement('strong');name.textContent=entry.n;const date=document.createElement('time');date.textContent=entry.d;const message=document.createElement('p');message.textContent=entry.m;head.append(name,date);content.append(head,message);card.append(createDoll(entry.a),content);fragment.append(card);}if(entries.length>messageLimit){const more=document.createElement('button');more.type='button';more.className='text-button';more.textContent='메시지 더 보기';more.addEventListener('click',()=>{messageLimit+=20;renderMessages();});fragment.append(more);}$('messageList').replaceChildren(fragment);}
  $('toggleMessages').addEventListener('click',()=>{const open=$('messageList').hidden;$('messageList').hidden=!open;$('toggleMessages').setAttribute('aria-expanded',String(open));$('toggleMessages').textContent=open?'축하 메시지 접기 ↑':'축하 메시지 모두 보기 ↓';if(open)renderMessages();});
  function updateMotion(){moving=moving&&!prefersReducedMotion.matches;$('garden').classList.toggle('motion-off',!moving);$('motionToggle').textContent=moving?'움직임 끄기':'움직임 켜기';$('motionToggle').setAttribute('aria-pressed',String(!moving));$('motionToggle').setAttribute('aria-label',moving?'캐릭터 움직임 끄기':'캐릭터 움직임 켜기');}
  $('motionToggle').addEventListener('click',()=>{if(prefersReducedMotion.matches){notify('기기의 동작 줄이기 설정을 따르고 있어요.');return;}moving=!moving;updateMotion();});prefersReducedMotion.addEventListener('change',()=>{moving=!prefersReducedMotion.matches;updateMotion();});updateMotion();

  function previewRead(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value:[];}catch{return [];}}
  function setGuestbookError(message){$('guestbookStatus').replaceChildren();const span=document.createElement('span');span.textContent=message+' ';const retry=document.createElement('button');retry.type='button';retry.textContent='다시 불러오기';retry.addEventListener('click',()=>{catalogReady=loadCatalog();catalogReady.catch(()=>{});loadEntries(true);});$('guestbookStatus').append(span,retry);}
  let loadingEntries=false;
  async function loadEntries(force=false) {
    if(loadingEntries||hasLoaded&&!force)return;loadingEntries=true;
    $('guestbookStatus').textContent=preview?'':'축하 메시지를 불러오고 있어요.';
    try {
      await catalogReady;
      const rows=preview?[...transientEntries,...previewRead()]:await Data.messages();
      entries=rows.map(normalizeEntry);hasLoaded=true;$('guestbookStatus').textContent='';renderGarden();if(!$('messageList').hidden)renderMessages();
    }catch(e){setGuestbookError(e.message);if(!hasLoaded)$('gardenCount').textContent='축하 메시지를 불러오지 못했어요';}
    finally{loadingEntries=false;}
  }
  async function entrance(entry){const button=[...$('gardenGuests').querySelectorAll('.character')].find(el=>el.gardenEntry===entry);if(!button)return;$('garden').scrollIntoView({behavior:prefersReducedMotion.matches?'instant':'smooth',block:'center'});if(!moving||prefersReducedMotion.matches){notify(entry.n+' 님, 정원에 오신 걸 환영해요!');return;}button.classList.add('entering');const animation=button.animate([{transform:'translate(-50%, calc(-50% + 150px))',opacity:0},{transform:'translate(-50%, calc(-50% + 115px))',opacity:1,offset:.15},{transform:'translate(-50%, -50%)',opacity:1}],{duration:1800,easing:'ease-out'});button.querySelector('.doll').animate([{transform:'translateY(0) rotate(-3deg)'},{transform:'translateY(-5px) rotate(3deg)'},{transform:'translateY(0) rotate(-3deg)'}],{duration:300,iterations:6});try{await animation.finished;}catch{}button.classList.remove('entering');button.querySelector('.doll').animate([{transform:'translateY(0)'},{transform:'translateY(-11px)',offset:.4},{transform:'translateY(0)'}],{duration:550,easing:'ease-out'});for(let i=0;i<7;i++){const heart=document.createElement('span');heart.className='celebration-heart';heart.textContent=i%3===0?'✦':'♥';heart.style.left=button.style.getPropertyValue('--x');heart.style.top=(parseFloat(button.style.getPropertyValue('--y'))-7)+'%';$('gardenEffects').append(heart);const a=heart.animate([{transform:'translate(0,0) scale(.4)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${(i-3)*20}px, ${-65-Math.abs(i-3)*9}px) scale(.9)`,opacity:0}],{duration:1100,delay:i*45,easing:'ease-out'});a.onfinish=()=>heart.remove();}notify(entry.n+' 님, 따뜻한 마음을 고맙게 간직할게요.');}
  $('guestbookForm').addEventListener('submit',async event=>{
    event.preventDefault();if(sending||shuffling)return;
    const n=$('guestName').value.trim(),m=$('guestMessage').value.trim();$('formError').hidden=true;
    function formError(text){$('formError').textContent=text;$('formError').hidden=false;}
    if(!n||!m){formError('이름과 축하 메시지를 적어 주세요.');(!n?$('guestName'):$('guestMessage')).focus();return;}
    if(n.length>12||m.length>240){formError('이름은 12자, 메시지는 240자까지 적을 수 있어요.');return;}
    if(Date.now()-lastSuccess<15000){formError('방금 남긴 마음이 잘 도착했어요. 잠시 후 다시 남겨 주세요.');return;}
    sending=true;$('sendGuestbook').disabled=true;$('sendGuestbook').textContent='마음을 전하고 있어요…';
    try {
      await catalogReady;
      const signature=JSON.stringify([n,m,selectedAvatarId]);
      let a;
      if(pendingSubmission?.signature===signature)a=pendingSubmission.a;
      else {
        const pool=selectedAvatarId==='random'?shuffled(guestAvatars.filter(x=>!failedAvatarIds.has(x.id))):guestAvatars.filter(x=>x.id===Number(selectedAvatarId)&&visibleAvatarIds.includes(x.id));
        for(const avatar of pool)if(await usableAvatar(avatar)){a=avatar.id;break;}
        if(a===undefined)throw new Error('선택할 수 있는 친구가 없어요. 주사위로 다시 골라 주세요.');
        pendingSubmission={signature,a,id:crypto.randomUUID()};
      }
      let row={n,m,d:koreaDate(),a,id:pendingSubmission.id};
      if(preview){const saved=previewRead();if(!saved.some(item=>item.id===row.id)){saved.unshift(row);try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{transientEntries.unshift(row);}}}
      else row=await Data.register(n,m,a,pendingSubmission.id);
      const entry=normalizeEntry(row);entries=entries.filter(item=>item.key!==entry.key);entries.unshift(entry);ownEntry=entry;lastSuccess=Date.now();hasLoaded=true;pendingSubmission=null;
      renderGarden();if(!$('messageList').hidden)renderMessages();$('guestMessage').value='';$('messageLength').textContent='0 / 240';closeDialog($('writeDialog'));
      $('guestbookStatus').textContent=preview?'이 기기에 저장했어요. 공유 연결 후 다른 기기에서도 볼 수 있어요.':'';await entrance(entry);
    }catch(e){formError(e.message);}
    finally{sending=false;$('sendGuestbook').disabled=guestAvatars.length===0;$('sendGuestbook').textContent='마음 남기고 입장하기';}
  });
  catalogReady=loadCatalog();catalogReady.catch(()=>{});

  renderGarden();
  if('IntersectionObserver'in window){const gardenObserver=new IntersectionObserver(changes=>{changes.forEach(change=>{if(change.target===$('garden')){$('garden').classList.toggle('is-active',change.isIntersecting);updateGardenRotation();if(change.isIntersecting)loadEntries();}});},{rootMargin:'100px'});gardenObserver.observe($('garden'));const navObserver=new IntersectionObserver(changes=>{for(const change of changes){if(change.isIntersecting){document.querySelectorAll('.bottom-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+change.target.id));}}},{rootMargin:'-5% 0px -65% 0px',threshold:0});['top','date','location','guestbook'].forEach(id=>navObserver.observe($(id)));}else{$('garden').classList.add('is-active');loadEntries();}
})();
