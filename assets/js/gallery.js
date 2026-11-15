/* Native scrolling keeps the gallery usable in mobile and in-app browsers. */
(() => {
  'use strict';
  window.WeddingGallery={init({openDialog,closeDialog}){
    const data=window.WEDDING_GALLERY;
    const $=id=>document.getElementById(id);
    if(!data?.pages?.length)return;
    const track=$('galleryTrack'),dialog=$('photoDialog'),lightbox=$('galleryLightbox');
    const layoutStyle=document.createElement('style');layoutStyle.textContent="\n/* Full compositions in a compact, constant-height album. */\n#gallery{padding-left:0;padding-right:0;overflow:hidden}\n#gallery>.eyebrow,#gallery>.serif-title,#gallery>.section-caption{margin-left:30px;margin-right:30px}\n#gallery .gallery-frame{position:relative;padding:0;margin:0 0 12px;background:transparent;box-shadow:none;transform:none}\n#gallery .gallery-track{position:relative;display:flex;grid-template-columns:none;gap:4px;aspect-ratio:auto;height:58vh;height:58svh;min-height:240px;max-height:560px;padding:0 16px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-padding-left:16px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x pan-y pinch-zoom}\n#gallery .gallery-track::-webkit-scrollbar{display:none}\n#gallery .gallery-page{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:4px;flex:0 0 94%;height:100%;min-width:0;min-height:0;aspect-ratio:auto;scroll-snap-align:start;scroll-snap-stop:always;background:var(--peach-light)}\n#gallery .gallery-page.gallery-pair{grid-template-columns:repeat(2,minmax(0,1fr))}\n#gallery .gallery-page:last-child{margin-right:calc(6% + 4px)}\n#gallery .gallery-tile{display:flex;align-items:center;justify-content:center;margin:0;padding:0;width:100%;height:100%;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent;overflow:hidden}\n#gallery .gallery-tile img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;opacity:0;transition:opacity .4s}\n#gallery .gallery-tile img.is-loaded{opacity:1}\n#gallery .gallery-swipe-hint{margin:0 20px 10px;text-align:right;font-size:11px;color:var(--muted);min-height:20px;transition:opacity .3s}\n#gallery .gallery-swipe-hint.is-used{opacity:0}\n#gallery .gallery-pagination{display:flex;flex-direction:column;align-items:center;gap:5px;padding:0 16px}\n#gallery .gallery-dots{display:flex;flex-wrap:wrap;justify-content:center;max-width:100%}\n#gallery .gallery-dots button{display:grid;place-items:center;width:11px;height:18px;padding:0}\n#gallery .gallery-dots button:before{content:'';width:3px;height:3px;border-radius:50%;background:var(--line)}\n#gallery .gallery-dots button[aria-current=true]:before{background:var(--rose);transform:scale(1.5)}\n#gallery .gallery-control{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--rose);font-size:10px}\n#gallery .gallery-hint{margin:4px 16px 0;font-size:10px;color:var(--muted)}\n@media(prefers-reduced-motion:reduce){#gallery .gallery-tile img,#gallery .gallery-swipe-hint{transition:none}}\n";document.head.append(layoutStyle);
    track.dataset.galleryVersion='20261116-contain-v1';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const photos=data.pages.flatMap(p=>p.items.map(item=>({...data.photos[item.id],position:item.position})));
    const photoNodes=[],fullNodes=[];
    let selected=0,ready=false,openedFrom=null,fullFrame=0,currentPage=0;
    function absolute(src){return new URL(src,document.baseURI).href;}
    function load(img){if(!img.dataset.src)return;img.src=img.dataset.src;delete img.dataset.src;}
    function loadFull(index){if(fullNodes[index])load(fullNodes[index]);}
    function setSelected(index){
      selected=Math.max(0,Math.min(photos.length-1,index));
      $('largeCount').textContent=`${selected+1} / ${photos.length}`;
      $('largePrev').disabled=selected===0;$('largeNext').disabled=selected===photos.length-1;
      loadFull(selected);loadFull(selected-1);loadFull(selected+1);
    }
    function goPhoto(index,behavior=reduced?'auto':'smooth'){
      setSelected(index);lightbox.scrollTo({left:selected*lightbox.clientWidth,behavior});
    }
    function openPhoto(index,button){
      openedFrom=button;openDialog(dialog,button);
      // The modal must be laid out before measuring its viewport width.
      ready=false;goPhoto(index,'instant');requestAnimationFrame(()=>{goPhoto(index,'instant');ready=true;});
    }



    $('galleryMore')?.remove();$('galleryShown')?.remove();
    document.querySelector('#gallery .gallery-pagination')?.remove();$('gallerySwipeHint')?.remove();
    track.setAttribute('tabindex','0');track.setAttribute('aria-label','웨딩 앨범, 좌우로 넘기기');
    const hint=document.createElement('p');hint.id='gallerySwipeHint';hint.className='gallery-swipe-hint';hint.textContent='옆으로 넘겨보세요 →';
    document.querySelector('#gallery .gallery-frame').before(hint);
    const nav=document.createElement('div');nav.className='gallery-pagination';
    nav.innerHTML='<div id="galleryDots" class="gallery-dots" aria-label="앨범 페이지 선택"></div><div class="gallery-control"><button type="button" id="galleryPrev" class="round-control" aria-label="이전 앨범 페이지">←</button><span id="galleryCount" aria-live="polite"></span><button type="button" id="galleryNext" class="round-control" aria-label="다음 앨범 페이지">→</button></div>';
    document.querySelector('#gallery .gallery-frame').after(nav);
    const groups=data.pages.flatMap(page=>page.items.map(item=>page.group)),pages=[];
    for(let i=0;i<photos.length;i++){
      const indices=[i],p=photos[i],next=photos[i+1];
      if(i>0 && next && p.width<p.height && next.width<next.height && groups[i]===groups[i+1]){indices.push(i+1);i++;}
      pages.push(indices);
    }
    const pageNodes=[],dots=[];
    function warmPage(index){pageNodes[index]?.querySelectorAll('img').forEach(load);}
    function setPage(index){
      currentPage=Math.max(0,Math.min(pages.length-1,index));
      $('galleryCount').textContent=(currentPage+1)+' / '+pages.length;
      $('galleryPrev').disabled=currentPage===0;$('galleryNext').disabled=currentPage===pages.length-1;
      dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===currentPage)));
      if(currentPage>0)hint.classList.add('is-used');
      warmPage(currentPage);warmPage(currentPage+1);
    }
    function goPage(index,behavior=reduced?'auto':'smooth'){
      index=Math.max(0,Math.min(pages.length-1,index));
      track.scrollTo({left:pageNodes[index].offsetLeft-16,behavior});setPage(index);
    }
    pages.forEach((indices,pageIndex)=>{
      const frame=document.createElement('div');frame.className='gallery-page'+(indices.length===2?' gallery-pair':'');
      frame.setAttribute('role','group');frame.setAttribute('aria-label',(pageIndex+1)+' / '+pages.length);
      indices.forEach(index=>{
        const photo=photos[index],button=document.createElement('button');button.type='button';button.className='gallery-tile';button.dataset.photoId=photo.id;
        button.setAttribute('aria-label',photo.alt+' 크게 보기');
        const img=document.createElement('img');img.alt=photo.alt;img.width=photo.width;img.height=photo.height;img.decoding='async';img.draggable=false;
        img.loading=pageIndex===0?'eager':'lazy';img.dataset.src=absolute(photo.src);
        img.addEventListener('load',()=>img.classList.add('is-loaded'));
        img.addEventListener('error',()=>{$('galleryStatus').textContent='일부 사진을 불러오지 못했어요. 새로고침해 주세요.';});
        button.append(img);button.addEventListener('click',()=>openPhoto(index,button));frame.append(button);photoNodes.push(button);
      });
      track.append(frame);pageNodes.push(frame);
      const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',(pageIndex+1)+'페이지');
      dot.addEventListener('click',()=>goPage(pageIndex));$('galleryDots').append(dot);dots.push(dot);
    });
    photos.forEach(photo=>{
      const slide=document.createElement('div');slide.className='lightbox-slide';
      const full=document.createElement('img');full.alt=photo.alt;full.width=photo.width;full.height=photo.height;
      full.draggable=false;full.decoding='async';full.dataset.src=absolute(photo.src);slide.append(full);lightbox.append(slide);fullNodes.push(full);
    });
    let frameRequest=0;
    track.addEventListener('scroll',()=>{
      if(frameRequest)return;frameRequest=requestAnimationFrame(()=>{
        frameRequest=0;let nearest=0,distance=Infinity;
        pageNodes.forEach((node,i)=>{const d=Math.abs(node.offsetLeft-16-track.scrollLeft);if(d<distance){nearest=i;distance=d;}});setPage(nearest);
      });
    },{passive:true});
    $('galleryPrev').addEventListener('click',()=>goPage(currentPage-1));$('galleryNext').addEventListener('click',()=>goPage(currentPage+1));
    track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();goPage(currentPage+(e.key==='ArrowRight'?1:-1));}});
    setPage(0);
    $('largePrev').addEventListener('click',()=>goPhoto(selected-1));$('largeNext').addEventListener('click',()=>goPhoto(selected+1));
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();goPhoto(selected+(e.key==='ArrowRight'?1:-1));}});
    lightbox.addEventListener('scroll',()=>{if(!ready||fullFrame)return;fullFrame=requestAnimationFrame(()=>{fullFrame=0;setSelected(Math.round(lightbox.scrollLeft/lightbox.clientWidth));});},{passive:true});
    let fullStart=null,fullDragged=false;
    lightbox.addEventListener('pointerdown',e=>{fullStart={x:e.clientX,y:e.clientY};fullDragged=false;},{passive:true});
    lightbox.addEventListener('pointermove',e=>{if(fullStart&&(Math.abs(e.clientX-fullStart.x)>8||Math.abs(e.clientY-fullStart.y)>8))fullDragged=true;},{passive:true});
    lightbox.addEventListener('click',e=>{if(!fullDragged&&e.target.tagName!=='IMG')closeDialog(dialog);});
    dialog.addEventListener('close',()=>{ready=false;fullStart=null;if(openedFrom?.isConnected)openedFrom.focus({preventScroll:true});});

    let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{goPage(currentPage,'instant');if(dialog.open)goPhoto(selected,'instant');});},{passive:true});
    $('galleryStatus').textContent='';
  }};
})();
