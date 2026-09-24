(() => {
  'use strict';
  const key = window.WEDDING_CONNECTION?.kakaoMapJavaScriptKey;
  const venue = window.WEDDING_VENUE;
  const container = document.getElementById('kakaoMap');
  const fallback = () => { container.replaceChildren(); const p = document.createElement('p'); p.textContent = '지도를 바로 불러오지 못했어요. 아래 카카오맵 버튼으로 위치를 확인해 주세요.'; container.append(p); };
  if (!key || key === 'KAKAO_MAP_JAVASCRIPT_KEY' || !venue) return;
  let done = false;
  const timer = setTimeout(() => { if (!done) { done = true; fallback(); } }, 12000);
  function show(latitude, longitude) {
    if (done) return;
    done = true; clearTimeout(timer); container.replaceChildren();
    try {
      const position = new kakao.maps.LatLng(latitude, longitude);
      const map = new kakao.maps.Map(container, { center: position, level: 3 });
      const marker = new kakao.maps.Marker({ position, map });
      const label = document.createElement('div'); label.className = 'map-pin-label'; label.textContent = venue.name;
      new kakao.maps.InfoWindow({ content: label }).open(map, marker);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      map.setZoomable(false);
      document.getElementById('kakaoMapLink').href = `https://map.kakao.com/link/map/${encodeURIComponent(venue.name)},${latitude},${longitude}`;
      if ('ResizeObserver' in window) new ResizeObserver(() => { map.relayout(); map.setCenter(position); }).observe(container);
    } catch { fallback(); }
  }
  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
  script.onerror = () => { done = true; clearTimeout(timer); fallback(); };
  script.onload = () => {
    if (!window.kakao?.maps?.load) { done = true; clearTimeout(timer); fallback(); return; }
    kakao.maps.load(() => {
      if (Number.isFinite(venue.latitude) && Number.isFinite(venue.longitude)) { show(venue.latitude, venue.longitude); return; }
      new kakao.maps.services.Geocoder().addressSearch(venue.address, (results, status) => {
        if (done) return;
        const expected = venue.expectedRoad;
        const match = status === kakao.maps.services.Status.OK && results.find(row => {
          const road = row.road_address;
          return road && road.region_2depth_name === expected.region && road.road_name === expected.road && road.main_building_no === expected.number && (!road.sub_building_no || road.sub_building_no === '0');
        });
        if (match && Number.isFinite(Number(match.x)) && Number.isFinite(Number(match.y))) show(Number(match.y), Number(match.x));
        else { done = true; clearTimeout(timer); fallback(); }
      });
    });
  };
  document.head.append(script);
})();
