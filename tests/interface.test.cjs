const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
async function finish(app){await new Promise(setImmediate);app.dom.window.close();}
async function until(test,label){for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Timed out: '+label);}
function makeApp({photoCount=1,avatarCount=6,broken=false,entries=[]}={}){
 const errors=[];
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://insight-doby.github.io/wedding-1205/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.addEventListener('error',e=>errors.push(e.error));
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 let random=20260924;w.Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 w.scrollTo=(x,y)=>Object.defineProperty(w,'scrollY',{value:y,writable:true,configurable:true});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLElement.prototype.animate=function(){return {finished:Promise.resolve(),set onfinish(f){f();}};};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.Image=class {set src(src){this._src=src;const pathname=new URL(src).pathname.replace('/wedding-1205/','');this.naturalWidth=fs.existsSync(path.join(root,pathname))?512:0;queueMicrotask(()=>this.naturalWidth?this.onload?.():this.onerror?.());}get src(){return this._src;}};
 w.IntersectionObserver=class{constructor(fn){this.fn=fn;}observe(target){queueMicrotask(()=>this.fn([{target,isIntersecting:true}]));}disconnect(){}};
 w.localStorage.setItem('two-winters-preview-v1',JSON.stringify(entries));
 function evaluate(file){const script=w.document.createElement('script');script.src=new URL(file,w.location.href).href;Object.defineProperty(w.document,'currentScript',{value:script,configurable:true});w.eval(fs.readFileSync(path.join(root,file),'utf8')+'\n//# sourceURL='+file);}
 evaluate('assets/js/config.js');evaluate('assets/js/fallback-data.js');
 const originals=w.WEDDING_FALLBACK.characters.filter(a=>a.active);
 w.WEDDING_FALLBACK.characters=[...w.WEDDING_FALLBACK.characters.filter(a=>!a.active),...Array.from({length:avatarCount},(_,i)=>({...originals[i%6],id:8+i,name:'친구 '+i}))];
 if(broken&&avatarCount)w.WEDDING_FALLBACK.characters.at(-1).image_url='assets/images/does-not-exist.png';
 w.WEDDING_FALLBACK.gallery=Array.from({length:photoCount},(_,i)=>({...w.WEDDING_FALLBACK.gallery[0],id:i+1,alt:'사진 '+(i+1),sort_order:i}));
 evaluate('assets/js/shared-data.js');evaluate('assets/js/invitation.js');evaluate('assets/js/map.js');
 return {dom,w,errors,$:id=>w.document.getElementById(id)};
}
(async()=>{
 let app=makeApp({photoCount:19,avatarCount:12});let {w,$}=app;
 await until(()=>$('avatarOptions').children.length===6&&!$('shuffleAvatars').disabled,'six choices');
 check($('avatarOptions').children[0].querySelector('input').checked,'random is first and selected');
 check($('avatarOptions').children[0].querySelector('img').alt==='물음표','random has question-mark image');
 check(new Set([...$('avatarOptions').querySelectorAll('input')].map(x=>x.value)).size===6,'candidate IDs do not duplicate');
 check($('galleryTrack').children.length===18,'first album page holds exactly 18');
 $('galleryNext').click();check($('galleryTrack').children.length===1,'second page holds remaining photo');check($('galleryNext').disabled,'last page disables next');
 $('galleryPrev').click();$('galleryTrack').children[17].click();
 check($('photoDialog').open&&w.document.body.style.position==='fixed','photo modal locks background scroll');
 check($('largeCount').textContent==='18 / 19','photo numbering retains global order');
 $('largeNext').click();check($('largeCount').textContent==='19 / 19','photo next spans album pages');
 $('largePrev').click();check($('largeCount').textContent==='18 / 19','photo previous works');
 w.document.querySelector('[data-close="photoDialog"]').click();check(!$('photoDialog').open&&w.document.body.style.position==='','closing restores body scrolling');
 const blocked=new w.Event('contextmenu',{bubbles:true,cancelable:true});$('galleryTrack').dispatchEvent(blocked);check(blocked.defaultPrevented,'gallery context menu suppressed');
 const outside=new w.Event('copy',{bubbles:true,cancelable:true});w.document.body.dispatchEvent(outside);check(!outside.defaultPrevented,'copy suppression is scoped to gallery');
 let resetObserved=false;
 for(let i=0;i<12&&!resetObserved;i++){
  const radio=$('avatarOptions').querySelectorAll('input')[1];radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));const selected=radio.value;
  $('shuffleAvatars').click();await until(()=>!$('shuffleAvatars').disabled,'shuffle');
  const exists=[...$('avatarOptions').querySelectorAll('input')].some(x=>x.value===selected);
  const checked=$('avatarOptions').querySelector('input:checked').value;
  check(checked===(exists?selected:'random'),'selection follows changed candidates');if(!exists)resetObserved=true;
 }
 check(resetObserved,'removed selection really returns to random');
 $('openGuestbook').click();check($('avatarOptions').querySelector('input:checked').value==='random','opening starts with random');
 const chosen=$('avatarOptions').querySelectorAll('input')[2];chosen.checked=true;chosen.dispatchEvent(new w.Event('change',{bubbles:true}));const chosenId=Number(chosen.value);
 $('guestName').value='검증 손님';$('guestMessage').value='<img src=x onerror=alert(1)> 축하합니다';
 $('guestbookForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>JSON.parse(w.localStorage.getItem('two-winters-preview-v1')).length===1,'guest saved');
 await until(()=>!$('writeDialog').open,'guest entrance');
 const saved=JSON.parse(w.localStorage.getItem('two-winters-preview-v1'))[0];check(saved.a===chosenId,'stored character equals selected character');
 check($('gardenGuests').querySelector('.char-name').textContent==='검증 손님','registered name displayed');
 $('toggleMessages').click();check(!$('messageList').querySelector('img'),'message text cannot inject an image');check($('messageList').textContent.includes('<img src=x'),'message is rendered as literal text');
 check(w.document.querySelector('.invitation-copy').textContent.includes('2024.12.28'),'first meeting date correct');
 check(w.document.querySelector('.cover-date').textContent.includes('2026. 12. 05.'),'wedding date unchanged');
 check(w.document.querySelector('.venue-address').textContent.includes('새말로 97'),'original venue address preserved');
 check($('kakaoMapLink').href.includes('map.kakao.com/link/search'),'map fallback link remains without key');
 check(!app.errors.length,'no runtime errors in normal flow');await finish(app);
 for(const count of [0,1,3]){
  app=makeApp({avatarCount:count});({w,$}=app);await until(()=>$('avatarPoolNote').textContent.length>0,'small catalog');
  check($('avatarOptions').children.length===count+1,`${count} avatars have no empty cards`);
  check(count? !$('sendGuestbook').disabled : $('sendGuestbook').disabled,`${count} avatar submission state`);
  check(!app.errors.length,'small catalog has no runtime errors');await finish(app);
 }
 app=makeApp({broken:true});({w,$}=app);await until(()=>!$('shuffleAvatars').disabled,'broken media fallback');
 check($('avatarOptions').children.length===6,'broken candidate replaced by remaining valid candidate');check(![...$('avatarOptions').querySelectorAll('input')].some(x=>x.value==='13'),'broken image not selectable');await finish(app);
 const existing=Array.from({length:8},(_,i)=>({n:'손님 '+i,m:'축하 '+i,a:8+i%6,d:'2026.09.24'}));
 app=makeApp({avatarCount:300,entries:existing});({w,$}=app);await until(()=>$('gardenCount').textContent.includes('8개'),'existing guests');
 check(!$('gardenPagination').hidden,'guest count may exceed six');$('gardenNext').click();check($('gardenGuests').children.length===2,'remaining guests accessible');
 await until(()=>!$('shuffleAvatars').disabled,'large pool');check($('avatarPoolNote').textContent.includes('300명'),'300-character catalog supported');check($('avatarOptions').children.length===6,'large catalog still has exactly six choice cards');
 check(!app.errors.length,'large catalog has no runtime errors');await finish(app);
 console.log(`PASS ${checks} DOM integration checks (logic only; not a rendered mobile browser).`);
})().catch(error=>{console.error(error);process.exit(1);});
