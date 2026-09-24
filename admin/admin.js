(() => {
  'use strict';
  const Data = window.WeddingData, $ = id => document.getElementById(id);
  let catalog = { characters: [], gallery: [] }, messages = [], importItems = [], client, busy = false, accessVersion = 0;
  const pages = { character: 0, gallery: 0, message: 0 }, PAGE_SIZE = 24;
  function note(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); }
  function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
  function button(text, action, style = '') { const node = el('button', text, 'button ' + style); node.type = 'button'; node.addEventListener('click', () => run(node, action)); return node; }
  async function run(target, action) {
    if (busy) return;
    busy = true; const wasDisabled = target.disabled; target.disabled = true;
    try { await action(); } catch (error) { note(error.message || '작업을 완료하지 못했어요.', true); }
    finally { busy = false; target.disabled = wasDisabled; }
  }
  function inputField(form, labelText, name, value = '', type = 'text') {
    const id = `${form.id}-${name}`, label = el('label', labelText); label.htmlFor = id;
    const input = document.createElement('input'); input.id = id; input.name = name; input.type = type;
    if (type === 'checkbox') { input.checked = Boolean(value); label.className = 'check'; label.prepend(input); form.append(label); }
    else { input.value = String(value ?? ''); form.append(label, input); }
    return input;
  }
  function picture(row, kind) {
    if (kind === 'gallery') { const img = el('img'); img.className = 'gallery-art'; img.src = row.src; img.alt = row.alt || '웨딩 사진'; img.loading = 'lazy'; return img; }
    const frame = el('div', null, 'character-art');
    if (row.region && row.atlas_size) {
      const [x,y,w,h] = row.region, [aw,ah] = row.atlas_size;
      const art = el('div', null, 'atlas'); art.style.width = `${150*w/h}px`; art.style.backgroundImage = `url(${JSON.stringify(row.src)})`; art.style.backgroundSize = `${aw/w*100}% ${ah/h*100}%`; art.style.backgroundPosition = `${x/(aw-w)*100}% ${y/(ah-h)*100}%`; art.setAttribute('role','img'); art.setAttribute('aria-label',row.name); frame.append(art);
    } else { const img=el('img');img.src=row.src;img.alt=row.name;img.loading='lazy';frame.append(img); }
    return frame;
  }
  function slicePage(items, type) {
    const count = Math.max(1, Math.ceil(items.length / PAGE_SIZE)); pages[type] = Math.min(pages[type], count - 1);
    const area = $(type === 'character' ? 'characterPaging' : type === 'gallery' ? 'galleryPaging' : 'messagePaging');
    area.replaceChildren();
    if (items.length > PAGE_SIZE) {
      const redraw = type === 'character' ? renderCharacters : type === 'gallery' ? renderGallery : renderMessages;
      const prev = button('← 이전', () => { pages[type]--; redraw(); }); prev.disabled=pages[type]===0;
      const next = button('다음 →', () => { pages[type]++; redraw(); }); next.disabled=pages[type]===count-1;
      area.append(prev,el('span',`${pages[type]+1} / ${count}`),next);
    }
    return items.slice(pages[type]*PAGE_SIZE,(pages[type]+1)*PAGE_SIZE);
  }
  function tags(text) { return text.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12); }
  async function saveRow(form, type, row) {
    const values=new FormData(form);
    const payload=type==='character'?{
      name:String(values.get('name')).trim(),season:tags(String(values.get('season'))),personality:tags(String(values.get('personality'))),features:tags(String(values.get('features'))),kind:values.get('kind'),active:values.has('active')
    }:{alt:String(values.get('alt')).trim(),sort_order:Number(values.get('sort_order')),visible:values.has('visible')};
    await Data.mutate(type==='character'?'wedding_characters':'wedding_gallery','update',payload,row.id);
    await refresh(); note('저장했어요. 다른 기기에서 청첩장을 새로고침하면 반영돼요.');
  }
  async function deleteRow(row, type) {
    if(type==='character'&&messages.some(m=>m.character_id===row.id))throw new Error('이 친구를 선택한 하객이 있어요. 기록을 지키기 위해 삭제 대신 공개 체크를 해제해 주세요.');
    const name=type==='character'?row.name:row.alt||'이 사진';
    if(!confirm(`“${name}” 항목을 삭제할까요?${row.storage_path?' 업로드한 이미지 파일도 삭제됩니다.':' GitHub 원본 파일은 그대로 남습니다.'}`))return;
    await Data.mutate(type==='character'?'wedding_characters':'wedding_gallery','delete',null,row.id);
    let cleanupFailed=false;
    if(row.storage_path)try{await Data.removeMedia(row.storage_path);}catch{cleanupFailed=true;}
    await refresh();note(cleanupFailed?'목록에서 삭제했어요. 이미지 파일 정리는 완료되지 않아 Storage에서 확인이 필요해요.':'삭제했어요.',cleanupFailed);
  }
  function renderCharacters() {
    const query=$('characterSearch').value.trim().toLowerCase(), filter=$('characterFilter').value;
    const filtered=catalog.characters.filter(row=>(filter==='all'||(filter==='active'?row.active:!row.active))&&[row.name,...row.season,...row.personality,...row.features].join(' ').toLowerCase().includes(query));
    $('characterList').replaceChildren();
    for(const row of slicePage(filtered,'character')){
      const card=el('article',null,'editor-card'),status=el('span',row.active?'공개 중':'비공개','badge'+(row.active?'':' hidden'));
      const form=el('form');form.id=`character-${row.id}`;
      const name=inputField(form,'친구 이름','name',row.name);name.maxLength=30;name.required=true;
      inputField(form,'계절 (쉼표로 구분)','season',row.season.join(', '));
      const details=el('details'),summary=el('summary','성격과 특색 수정');details.append(summary);
      const extra=el('div');extra.id=form.id+'-extra';
      inputField(extra,'성격','personality',row.personality.join(', ')); inputField(extra,'특색','features',row.features.join(', '));
      const label=el('label','친구 유형'),select=el('select');select.name='kind';select.id=form.id+'-kind';label.htmlFor=select.id;
      for(const [value,text]of [['human','사람'],['cat','고양이'],['dog','강아지'],['animal','다른 동물']]){const option=el('option',text);option.value=value;select.append(option);}select.value=row.kind;extra.append(label,select);details.append(extra);form.append(details);
      inputField(form,'선택 후보로 공개','active',row.active,'checkbox');
      const actions=el('div',null,'actions'),save=el('button','변경 저장','button primary');save.type='submit';actions.append(save,button('삭제',()=>deleteRow(row,'character'),'danger'));form.append(actions);
      form.addEventListener('submit',event=>{event.preventDefault();run(save,()=>saveRow(form,'character',row));});
      card.append(picture(row,'character'),status,form);$('characterList').append(card);
    }
    if(!filtered.length)$('characterList').append(el('p','조건에 맞는 친구가 없어요.','empty'));
  }
  function renderGallery() {
    $('galleryList').replaceChildren();
    for(const row of slicePage(catalog.gallery,'gallery')){
      const card=el('article',null,'editor-card'),form=el('form');form.id=`gallery-${row.id}`;
      const alt=inputField(form,'사진 설명','alt',row.alt);alt.maxLength=120;
      const order=inputField(form,'표시 순서','sort_order',row.sort_order,'number');order.step='1';order.min='0';order.max='1000000';order.required=true;
      inputField(form,'앨범에 공개','visible',row.visible,'checkbox');
      const actions=el('div',null,'actions'),save=el('button','변경 저장','button primary');save.type='submit';actions.append(save,button('삭제',()=>deleteRow(row,'gallery'),'danger'));form.append(actions);
      form.addEventListener('submit',event=>{event.preventDefault();run(save,()=>saveRow(form,'gallery',row));});
      card.append(picture(row,'gallery'),el('span',row.visible?'공개 중':'비공개','badge'+(row.visible?'':' hidden')),form);$('galleryList').append(card);
    }
    if(!catalog.gallery.length)$('galleryList').append(el('p','아직 등록된 사진이 없어요.','empty'));
  }
  function renderMessages() {
    const query=$('messageSearch').value.trim().toLowerCase(),filter=$('messageFilter').value;
    const filtered=messages.filter(row=>(filter==='all'||(filter==='visible'?row.visible:!row.visible))&&(row.name+' '+row.message).toLowerCase().includes(query));
    $('adminMessages').replaceChildren();
    for(const row of slicePage(filtered,'message')){
      const card=el('article',null,'message-card'),header=el('header');header.append(el('strong',row.name),el('time',row.date_label));
      const friend=catalog.characters.find(c=>c.id===row.character_id),actions=el('div',null,'actions');
      actions.append(button(row.visible?'메시지 숨김':'다시 공개',async()=>{await Data.mutate('wedding_messages','update',{visible:!row.visible},row.id);await refresh();note('메시지 공개 상태를 바꿨어요.');}),button('삭제',async()=>{
        if(!confirm(`“${row.name}” 님의 축하 메시지를 삭제할까요? 삭제한 메시지는 복구할 수 없어요.`))return;
        await Data.mutate('wedding_messages','delete',null,row.id);await refresh();note('메시지를 삭제했어요.');
      },'danger'));
      card.append(header,el('span',row.visible?'공개 중':'숨김','badge'+(row.visible?'':' hidden')),el('p',row.message),el('small','선택한 친구: '+(friend?.name||`캐릭터 ${row.character_id}`)),actions);$('adminMessages').append(card);
    }
    if(!filtered.length)$('adminMessages').append(el('p','조건에 맞는 축하 메시지가 없어요.','empty'));
  }
  async function refresh() {
    const result=await Promise.all([Data.catalog(true),Data.messages(true)]);catalog=result[0];messages=result[1];
    $('characterCount').textContent=catalog.characters.filter(c=>c.active).length;$('photoCount').textContent=catalog.gallery.filter(p=>p.visible).length;$('messageCount').textContent=messages.length;
    renderCharacters();renderGallery();renderMessages();
  }
  async function uploadFiles(type) {
    const files=Array.from($(type==='character'?'characterFiles':'galleryFiles').files);
    const publish=$(type==='character'?'publishCharacters':'publishGallery').checked;
    let success=0;const errors=[];let order=Math.max(-1,...catalog.gallery.map(p=>p.sort_order))+1;
    for(const [index,file]of files.entries()){
      note(`${index+1} / ${files.length} · ${file.name} 업로드 중…`);let path;
      try{
        path=await Data.upload(file,type==='character'?'guests':'gallery');
        const base=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim().slice(0,30)||'새 친구';
        await Data.mutate(type==='character'?'wedding_characters':'wedding_gallery','insert',type==='character'?{name:base,storage_path:path,active:publish}:{alt:base,storage_path:path,sort_order:order++,visible:publish});success++;
      }catch(error){errors.push(`${file.name}: ${error.message}`);if(path)try{await Data.removeMedia(path);}catch{errors.push('업로드 파일 정리를 완료하지 못했어요: '+path);}}
    }
    $(type==='character'?'characterFiles':'galleryFiles').value='';await refresh();note(`${success}장 업로드했어요.${publish?' 새로고침하면 청첩장에 보여요.':' 이름과 태그를 확인한 뒤 공개해 주세요.'}${errors.length?'\n'+errors.join('\n'):''}`,errors.length>0);
  }
  function legacyHash(value){let h=0;for(const c of String(value))h=(Math.imul(h,31)+c.codePointAt(0))|0;return h>>>0;}
  function previewImport(rows) {
    if(!Array.isArray(rows))throw new Error('메시지 배열이 들어 있는 JSON 파일이 필요해요.');
    importItems=rows.map(row=>{
      const raw=String(row.m??row.message??''),match=raw.match(/\n?\n?\[tw-avatar:(\d+)\]\s*$/),message=(match?raw.slice(0,match.index):raw).trim(),name=String(row.n??row.name??'').trim();
      const character_id=Number(match?match[1]:row.character_id??row.a??[2,3,4,5,6,7][legacyHash(name+message)%6]);
      return {name,message,character_id,date_label:String(row.d??row.date_label??row.date??'').slice(0,30),visible:true};
    });
    $('importSummary').textContent=`${importItems.length}개의 메시지를 확인했어요. 아래에는 처음 10개를 보여드려요.`;$('importRows').replaceChildren();
    for(const item of importItems.slice(0,10)){const card=el('article',null,'message-card');card.append(el('strong',item.name),el('p',item.message),el('small',item.date_label));$('importRows').append(card);}
    $('confirmImport').disabled=!importItems.length;$('importPreview').hidden=false;
  }
  async function importMessages() {
    if(!confirm(`${importItems.length}개의 기존 메시지를 공유 방명록으로 가져올까요? 이름과 메시지가 청첩장에 공개됩니다.`))return;
    let added=0,skipped=0;const errors=[];
    for(const [index,row]of importItems.entries()){
      if(!row.name||row.name.length>40||!row.message||row.message.length>240||!catalog.characters.some(c=>c.id===row.character_id)){errors.push(`${index+1}번째: 이름·내용·캐릭터를 확인해 주세요.`);continue;}
      const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([row.name,row.message,row.date_label,row.character_id])));
      const legacy_key=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
      try{
        const response=await Data.timeout(client.from('wedding_messages').insert({...row,legacy_key}).select('id'));
        if(response.error?.code==='23505')skipped++;
        else{Data.unwrap(response);added++;}
      }catch(error){errors.push(`${index+1}번째: ${error.message}`);}
    }
    await refresh();note(`${added}개를 가져왔어요. 기존 중복 ${skipped}개는 그대로 유지했어요.${errors.length?'\n'+errors.join('\n'):''}`,errors.length>0);if(!errors.length){importItems=[];$('importPreview').hidden=true;}
  }
  async function authorize() {
    const version=++accessVersion;$('dashboard').hidden=true;
    const {data:{session},error}=await client.auth.getSession();if(error)throw error;
    if(!session){$('loginPanel').hidden=false;catalog={characters:[],gallery:[]};messages=[];return;}
    const admin=await Data.isAdmin();if(version!==accessVersion)return;
    if(!admin){await client.auth.signOut();$('loginPanel').hidden=false;throw new Error('이 계정에는 관리자 권한이 없어요. 설정 안내의 관리자 등록 단계를 확인해 주세요.');}
    $('sessionEmail').textContent=session.user.email||'관리자';$('loginPanel').hidden=true;
    await refresh();if(version===accessVersion)$('dashboard').hidden=false;
  }
  for(const tab of document.querySelectorAll('[data-tab]'))tab.addEventListener('click',()=>{
    for(const other of document.querySelectorAll('[data-tab]')){other.classList.toggle('active',other===tab);if(other===tab)other.setAttribute('aria-current','page');else other.removeAttribute('aria-current');}
    for(const panel of document.querySelectorAll('.tab-panel'))panel.hidden=panel.id!==tab.dataset.tab+'Panel';
  });
  for(const id of ['characterSearch','characterFilter'])$(id).addEventListener('input',()=>{pages.character=0;renderCharacters();});
  for(const id of ['messageSearch','messageFilter'])$(id).addEventListener('input',()=>{pages.message=0;renderMessages();});
  $('loginForm').addEventListener('submit',event=>{event.preventDefault();run($('loginButton'),async()=>{
    note('로그인 확인 중…');try{Data.unwrap(await Data.timeout(client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value})));await authorize();note('반가워요. 오늘의 정원을 함께 가꿔요.');}finally{$('password').value='';}
  });});
  $('logoutButton').addEventListener('click',()=>run($('logoutButton'),async()=>{Data.unwrap(await client.auth.signOut());await authorize();note('로그아웃했어요.');}));
  $('refreshData').addEventListener('click',()=>run($('refreshData'),async()=>{await refresh();note('최신 내용으로 불러왔어요.');}));
  for(const type of ['character','gallery'])$(type+'Upload').addEventListener('submit',event=>{event.preventDefault();run(event.submitter,()=>uploadFiles(type));});
  $('seedDefaults').addEventListener('click',()=>run($('seedDefaults'),async()=>{
    if(!confirm('이번 수정본의 기본 이미지 목록을 등록할까요? 이미 등록한 항목은 바꾸지 않아요.'))return;
    for(const [table,key]of [['wedding_characters','characters'],['wedding_gallery','gallery']])Data.unwrap(await Data.timeout(client.from(table).upsert(window.WEDDING_FALLBACK[key],{onConflict:'id',ignoreDuplicates:true})));
    await refresh();note('기본 이미지 목록을 등록했어요.');
  }));
  $('existingImageForm').addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{
    const path=$('existingPath').value.trim(),type=$('existingType').value,name=$('existingName').value.trim();
    if(!/^assets\/images\/[a-zA-Z0-9_\-/가-힣]+\.(png|jpe?g|webp)$/i.test(path)||path.includes('..'))throw new Error('assets/images/ 아래 실제 이미지 경로를 적어 주세요.');
    if(type==='character'&&!path.startsWith('assets/images/guests/'))throw new Error('하객 이미지는 assets/images/guests/ 아래 파일을 선택해 주세요.');
    if(!await Data.loadImage(Data.assetUrl(path)))throw new Error('해당 이미지를 찾지 못했어요. 경로와 대소문자를 확인해 주세요.');
    await Data.mutate(type==='character'?'wedding_characters':'wedding_gallery','insert',type==='character'?{name,image_url:path,active:false}:{alt:name,image_url:path,visible:false,sort_order:Math.max(-1,...catalog.gallery.map(p=>p.sort_order))+1});await refresh();note('비공개로 등록했어요. 목록에서 확인하고 공개해 주세요.');
  });});
  $('loadLegacy').addEventListener('click',()=>run($('loadLegacy'),async()=>{previewImport(await Data.legacyRead());note('기존 메시지를 읽었어요. 내용을 확인해 주세요.');}));
  $('loadLocal').addEventListener('click',()=>run($('loadLocal'),async()=>{previewImport(JSON.parse(localStorage.getItem('two-winters-preview-v1')||'[]'));note('이 브라우저의 이전 메시지를 읽었어요.');}));
  $('legacyFile').addEventListener('change',()=>run($('legacyFile'),async()=>{const file=$('legacyFile').files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('5MB 이하의 JSON 파일을 선택해 주세요.');const content=JSON.parse(await file.text());previewImport(Array.isArray(content)?content:content.items);$('legacyFile').value='';}));
  $('confirmImport').addEventListener('click',()=>run($('confirmImport'),importMessages));
  (async()=>{
    if(!Data.configured){$('setupPanel').hidden=false;return;}
    try{
      client=await Data.getClient();await authorize();
      client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){++accessVersion;$('dashboard').hidden=true;$('loginPanel').hidden=false;catalog={characters:[],gallery:[]};messages=[];}});
    }catch(error){$('loginPanel').hidden=false;note(error.message,true);}
  })();
})();
