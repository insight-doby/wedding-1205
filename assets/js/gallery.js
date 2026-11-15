/* Native scrolling keeps the gallery usable in mobile and in-app browsers. */
(() => {
  'use strict';
  window.WeddingGallery={init({openDialog,closeDialog}){
    const data=window.WEDDING_GALLERY;
    const $=id=>document.getElementById(id);
    if(!data?.pages?.length)return;
    const track=$('galleryTrack'),dialog=$('photoDialog'),lightbox=$('galleryLightbox'),dots=$('galleryDots');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const photos=data.pages.flatMap(p=>p.items.map(item=>({...data.photos[item.id],position:item.position})));
    const pageNodes=[],photoNodes=[],fullNodes=[],dotNodes=[];
    let current=0,selected=0,ready=false,openedFrom=null,scrollFrame=0,fullFrame=0,suppressClick=false;
    const warmed=new Set();
    function absolute(src){return new URL(src,document.baseURI).href;}
    function load(img){if(!img.dataset.src)return;img.src=img.dataset.src;delete img.dataset.src;}
    function warmPage(index){
      if(index<0||index>=pageNodes.length)return;
      pageNodes[index].querySelectorAll('img').forEach(load);
    }
    function preloadPhoto(index){const p=photos[index];if(!p||warmed.has(p.src))return;warmed.add(p.src);const img=new Image();img.decoding='async';img.src=absolute(p.src);}
    function setPage(index){
      current=Math.max(0,Math.min(data.pages.length-1,index));
      $('galleryCount').textContent=`${current+1} / ${data.pages.length}`;
      $('galleryPrev').disabled=current===0;$('galleryNext').disabled=current===data.pages.length-1;
      dotNodes.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));
      if(current>0)$('gallerySwipeHint').classList.add('is-used');
      warmPage(current);warmPage(current+1);
    }
    function goPage(index,behavior=reduced?'auto':'smooth'){
      index=Math.max(0,Math.min(data.pages.length-1,index));
      track.scrollTo({left:pageNodes[index].offsetLeft-16,behavior});setPage(index);
    }
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
      if(suppressClick)return;
      openedFrom=button;openDialog(dialog,button);
      // The modal must be laid out before measuring its viewport width.
      ready=false;goPhoto(index,'instant');requestAnimationFrame(()=>{goPhoto(index,'instant');ready=true;});
    }
    let flat=0;
    data.pages.forEach((page,index)=>{
      const node=document.createElement('div');node.className=`gallery-page pattern-${page.pattern}`;
      node.setAttribute('role','group');node.setAttribute('aria-label',`${index+1} / ${data.pages.length} · ${page.group}`);
      page.items.forEach(item=>{
        const photo=data.photos[item.id],photoIndex=flat++;
        const button=document.createElement('button');button.type='button';button.className='gallery-tile';button.style.setProperty('--photo-position',item.position);button.dataset.photoId=item.id;
        button.setAttribute('aria-label',`${photo.alt} 크게 보기`);
        const img=document.createElement('img');img.alt=photo.alt;img.width=photo.width;img.height=photo.height;img.decoding='async';img.draggable=false;
        img.dataset.src=absolute(photo.src);img.loading=index===0?'eager':'lazy';
        img.addEventListener('load',()=>img.classList.add('is-loaded'));
        img.addEventListener('error',()=>{$('galleryStatus').textContent='일부 사진을 불러오지 못했어요. 새로고침해 주세요.';});
        if(index===0)load(img);
        button.append(img);button.addEventListener('click',()=>openPhoto(photoIndex,button));node.append(button);photoNodes.push(button);
        const slide=document.createElement('div');slide.className='lightbox-slide';
        const full=document.createElement('img');full.alt=photo.alt;full.width=photo.width;full.height=photo.height;full.draggable=false;full.decoding='async';full.dataset.src=absolute(photo.src);
        slide.append(full);lightbox.append(slide);fullNodes.push(full);
      });
      track.append(node);pageNodes.push(node);
      const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',`${index+1}페이지 · ${page.group}`);dot.addEventListener('click',()=>goPage(index));dots.append(dot);dotNodes.push(dot);
    });
    track.addEventListener('scroll',()=>{
      if(scrollFrame)return;
      scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;let nearest=0,distance=Infinity;pageNodes.forEach((node,i)=>{const d=Math.abs(node.offsetLeft-16-track.scrollLeft);if(d<distance){distance=d;nearest=i;}});setPage(nearest);});
    },{passive:true});
    let touchStart=null;
    track.addEventListener('touchstart',e=>{touchStart=e.touches[0]?.clientX;suppressClick=false;},{passive:true});
    track.addEventListener('touchmove',e=>{if(touchStart!==null&&Math.abs(e.touches[0].clientX-touchStart)>8)suppressClick=true;},{passive:true});
    track.addEventListener('touchend',()=>setTimeout(()=>{suppressClick=false;},150),{passive:true});
    track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();goPage(current+(e.key==='ArrowRight'?1:-1));}});
    $('galleryPrev').addEventListener('click',()=>goPage(current-1));$('galleryNext').addEventListener('click',()=>goPage(current+1));
    $('largePrev').addEventListener('click',()=>goPhoto(selected-1));$('largeNext').addEventListener('click',()=>goPhoto(selected+1));
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();goPhoto(selected+(e.key==='ArrowRight'?1:-1));}});
    lightbox.addEventListener('scroll',()=>{if(!ready||fullFrame)return;fullFrame=requestAnimationFrame(()=>{fullFrame=0;setSelected(Math.round(lightbox.scrollLeft/lightbox.clientWidth));});},{passive:true});
    let fullStart=null,fullDragged=false;
    lightbox.addEventListener('pointerdown',e=>{fullStart={x:e.clientX,y:e.clientY};fullDragged=false;},{passive:true});
    lightbox.addEventListener('pointermove',e=>{if(fullStart&&(Math.abs(e.clientX-fullStart.x)>8||Math.abs(e.clientY-fullStart.y)>8))fullDragged=true;},{passive:true});
    lightbox.addEventListener('click',e=>{if(!fullDragged&&e.target.tagName!=='IMG')closeDialog(dialog);});
    dialog.addEventListener('close',()=>{ready=false;fullStart=null;if(openedFrom?.isConnected)openedFrom.focus({preventScroll:true});});
    let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{goPage(current,'instant');if(dialog.open)goPhoto(selected,'instant');});},{passive:true});
    // No timer animation or per-frame transforms during a swipe.
    setPage(0);
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const i=pageNodes.indexOf(e.target);warmPage(i);warmPage(i+1);}},{root:track,threshold:.1});pageNodes.forEach(p=>observer.observe(p));}
    $('galleryStatus').textContent='';
  }};
})();
