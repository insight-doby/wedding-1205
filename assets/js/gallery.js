/* Native scrolling keeps the gallery usable in mobile and in-app browsers. */
(() => {
  'use strict';
  window.WeddingGallery={init({openDialog,closeDialog}){
    const data=window.WEDDING_GALLERY;
    const $=id=>document.getElementById(id);
    if(!data?.pages?.length)return;
    const track=$('galleryTrack'),dialog=$('photoDialog'),lightbox=$('galleryLightbox');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const photos=data.pages.flatMap(p=>p.items.map(item=>({...data.photos[item.id],position:item.position})));
    const photoNodes=[],fullNodes=[];
    let selected=0,ready=false,openedFrom=null,fullFrame=0,visibleCount=18;
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


    // Upgrade the gallery DOM locally; leave the original HTML/configuration untouched.
    $('gallerySwipeHint')?.remove();
    document.querySelector('#gallery .gallery-pagination')?.remove();
    track.removeAttribute('tabindex');track.setAttribute('aria-label','웨딩 사진 갤러리');
    const more=document.createElement('button');more.type='button';more.id='galleryMore';more.className='gallery-more';more.textContent='사진 더 보기';
    const shown=document.createElement('span');shown.id='galleryShown';shown.className='gallery-shown';shown.setAttribute('aria-live','polite');
    $('gallery').append(more,shown);

    let observer;
    function updateVisible(){
      photoNodes.forEach((node,i)=>{
        node.hidden=i>=visibleCount;
        if(i<visibleCount){
          const img=node.querySelector('img');
          if(i<2||!observer)load(img);else observer.observe(img);
        }
      });
      more.hidden=visibleCount>=photos.length;
      more.textContent='사진 더 보기 ('+Math.max(0,photos.length-visibleCount)+'장)';
      $('galleryShown').textContent=Math.min(visibleCount,photos.length)+' / '+photos.length;
    }
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.isIntersecting){load(entry.target);observer.unobserve(entry.target);}
      },{rootMargin:'300px 0px'});
    }
    // Preserve original image proportions. Pair related portrait shots only.
    const groups=data.pages.flatMap(page=>page.items.map(item=>page.group));
    const pairWithNext=new Set();
    for(let i=1;i<photos.length-1;i++){
      const p=photos[i],next=photos[i+1];
      if(p.width<p.height && next.width<next.height && groups[i]===groups[i+1]){
        pairWithNext.add(i);i++;
      }
    }
    // The ring -> eye-contact sequence is deliberately one side-by-side row.
    const ring=photos.findIndex(p=>p.id==='n09');
    if(ring>=0)pairWithNext.add(ring);
    const paired=new Set([...pairWithNext].flatMap(i=>[i,i+1]));
    photos.forEach((photo,index)=>{
      const button=document.createElement('button');button.type='button';
      button.className='gallery-tile'+(!paired.has(index)?' gallery-wide':'');
      button.dataset.photoId=photo.id;button.setAttribute('aria-label',photo.alt+' 크게 보기');
      const img=document.createElement('img');img.alt=photo.alt;img.width=photo.width;img.height=photo.height;
      img.decoding='async';img.draggable=false;img.loading=index===0?'eager':'lazy';img.dataset.src=absolute(photo.src);
      img.addEventListener('load',()=>img.classList.add('is-loaded'));
      img.addEventListener('error',()=>{$('galleryStatus').textContent='일부 사진을 불러오지 못했어요. 새로고침해 주세요.';});
      button.append(img);button.addEventListener('click',()=>openPhoto(index,button));track.append(button);photoNodes.push(button);
      const slide=document.createElement('div');slide.className='lightbox-slide';
      const full=document.createElement('img');full.alt=photo.alt;full.width=photo.width;full.height=photo.height;
      full.draggable=false;full.decoding='async';full.dataset.src=absolute(photo.src);
      slide.append(full);lightbox.append(slide);fullNodes.push(full);
    });
    // Never split a paired row at the initial fold.
    if(pairWithNext.has(visibleCount-1))visibleCount++;
    updateVisible();
    more.addEventListener('click',()=>{
      const firstNew=photoNodes[visibleCount];visibleCount=photos.length;updateVisible();
      firstNew?.focus({preventScroll:true});
    });
    $('largePrev').addEventListener('click',()=>goPhoto(selected-1));$('largeNext').addEventListener('click',()=>goPhoto(selected+1));
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();goPhoto(selected+(e.key==='ArrowRight'?1:-1));}});
    lightbox.addEventListener('scroll',()=>{if(!ready||fullFrame)return;fullFrame=requestAnimationFrame(()=>{fullFrame=0;setSelected(Math.round(lightbox.scrollLeft/lightbox.clientWidth));});},{passive:true});
    let fullStart=null,fullDragged=false;
    lightbox.addEventListener('pointerdown',e=>{fullStart={x:e.clientX,y:e.clientY};fullDragged=false;},{passive:true});
    lightbox.addEventListener('pointermove',e=>{if(fullStart&&(Math.abs(e.clientX-fullStart.x)>8||Math.abs(e.clientY-fullStart.y)>8))fullDragged=true;},{passive:true});
    lightbox.addEventListener('click',e=>{if(!fullDragged&&e.target.tagName!=='IMG')closeDialog(dialog);});
    dialog.addEventListener('close',()=>{ready=false;fullStart=null;if(openedFrom?.isConnected)openedFrom.focus({preventScroll:true});});

    let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(dialog.open)goPhoto(selected,'instant');});},{passive:true});
    $('galleryStatus').textContent='';
  }};
})();
