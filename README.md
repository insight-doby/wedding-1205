# 도훈 · 영현의 모바일 청첩장

첫 만남 **2024.12.28** · 예식 **2026.12.05 토요일 오후 3시 40분**  
웨딩시티 아모르홀 · 서울특별시 구로구 새말로 97, 신도림테크노마트 8층

공개 청첩장: https://insight-doby.github.io/wedding-1205/  
관리자 화면: 공개 주소 뒤에 `admin/`을 붙입니다. 관리자 기능은 아래 연결 설정 후 사용할 수 있습니다.

## 지금 준비된 것

- 사진 3열 앨범, 페이지당 최대 18장, 원본 비율 확대, 이전·다음·닫기.
- `? 무작위` 고정 카드와 서로 다른 친구 5명, 오른쪽 위 주사위.
- 봄 소풍러·밤하늘 여행자·장난꾸러기 고양이·햇살 강아지·가을 화가·눈꽃 친구, 총 6종.
- 이름과 축하 메시지, 선택한 캐릭터를 함께 저장. 정원에는 최대 50명이 동시에 나타나며, 50명을 넘으면 9초마다 5명씩 교체해 모든 하객이 차례로 보입니다.
- 관리자 로그인, 여러 장 업로드, 이름·계절·성격·특색·종류·공개 여부 수정, 앨범 순서 변경, 메시지 숨김·삭제.
- 카카오 지도 연결 코드. **지도 JavaScript 키와 Supabase 연결 값은 아직 자리표시자입니다.**

원본의 사진·신랑 신부·정원 배경·음악은 바꾸지 않았습니다. HTML 안에 들어 있던 이미지와 음악을 같은 바이트의 별도 파일로 분리했습니다. 원본 갤러리에 등록되어 있던 사진은 1장이며, 사진 수를 임의로 늘리지 않았습니다.

## 1. 처음 한 번 준비할 것

직접 준비할 항목은 다음과 같습니다. 관리자 비밀번호·데이터베이스 비밀번호·secret/service_role 키를 GitHub나 코드에 적지 않습니다.

| 항목 | 어디에서 준비하나요? | 입력할 곳 |
| --- | --- | --- |
| Supabase 프로젝트 | Supabase 대시보드 | 아래 2단계 |
| 프로젝트 URL | 프로젝트의 **Connect** 창 | `assets/js/config.js`의 `supabaseUrl` |
| Publishable key (`sb_publishable_…`) | **Connect** 또는 **Settings → API Keys** | 같은 파일의 `supabasePublishableKey` |
| 관리자 이메일·비밀번호 | 프로젝트 **Authentication → Users**에서 사용자 생성 | 관리자 로그인 화면에만 입력 |
| 관리자 User UID | 위 Users 화면의 사용자 상세 | 아래 관리자 권한 등록문에 입력 |
| 카카오 JavaScript 키 | 카카오디벨로퍼스의 JavaScript 플랫폼 키 | `kakaoMapJavaScriptKey` |

설정 전에는 청첩장이 기본 사진과 캐릭터를 보여주고, 메시지는 이 기기에만 저장된다고 표시합니다. 이 상태에서 저장한 메시지는 다른 기기와 공유되지 않습니다. 연결에 실패했다고 기존 데이터나 파일을 지우지는 않습니다.

## 2. Supabase 프로젝트와 데이터 준비

1. [Supabase 대시보드](https://supabase.com/dashboard)에 본인 계정으로 로그인합니다.
2. **New project**를 선택하고 본인의 조직, 프로젝트 이름, 데이터베이스 비밀번호, 지역을 지정해 프로젝트를 만듭니다. 비밀번호는 본인이 따로 보관합니다.
3. 프로젝트가 준비되면 왼쪽 **SQL Editor → New query**로 들어갑니다.
4. 이 저장소의 [`supabase/01_schema.sql`](supabase/01_schema.sql)을 열고 내용 전체를 붙여 넣은 뒤 **Run**을 누릅니다. 이 파일은 테이블·접근 정책·이미지 보관함을 만듭니다.
5. 새 쿼리에서 [`supabase/02_seed.sql`](supabase/02_seed.sql) 전체를 붙여 넣고 **Run**을 누릅니다. 기본 이미지 목록을 처음 한 번 등록하는 단계입니다.
6. **Table Editor**에서 `wedding_characters`, `wedding_gallery`, `wedding_messages`가 생겼는지 확인합니다.
7. **Storage**에서 `wedding-media`가 만들어졌는지 확인합니다. **Private 상태를 유지합니다.**

기존 Google Apps Script와 Google 시트는 수정하거나 삭제하지 않습니다. 초기 목록 등록문은 같은 ID가 있으면 건너뛰지만, 기본 항목을 나중에 삭제한 뒤 다시 실행하면 그 항목을 복원합니다. 평소 운영할 때는 다시 실행할 필요가 없습니다.

## 3. 관리자 계정 등록

1. **Authentication → Users → Add user**에서 이메일·비밀번호를 지정해 사용자를 생성하는 기능을 선택합니다. 본인이 사용할 이메일과 새 관리자 비밀번호를 직접 입력합니다.
2. 본인 소유 이메일인지 확인하고 해당 사용자의 이메일 확인을 완료합니다. 사용자 생성 화면에 자동 이메일 확인 옵션이 있다면 본인 계정에 한해 사용할 수 있습니다. 초대 메일만 보내는 방식은 이 수정본의 비밀번호 로그인 셋업과 다르므로, 이메일·비밀번호로 생성하는 방식을 사용합니다.
3. 생성된 사용자의 **User UID**를 복사합니다. Supabase 대시보드에 로그인한 계정과 청첩장 관리자 계정은 별개입니다.
4. **SQL Editor → New query**에서 아래의 `여기에-User-UID` 한 곳만 바꾸어 실행합니다. 이메일이나 비밀번호를 넣는 칸이 아닙니다.

```sql
insert into wedding_private.admins (user_id)
values ('여기에-User-UID'::uuid)
on conflict (user_id) do nothing;
```

5. 이 청첩장은 일반 회원가입 기능을 사용하지 않습니다. **Authentication의 General configuration / Sign In 설정에서 `Allow new users to sign up`을 끄고**, 위에서 만든 관리자 계정만 사용합니다. 메뉴 위치는 대시보드 버전에 따라 다를 수 있습니다.
6. 관리자 계정이 여러 명 필요하면 각자의 User UID에 대해 같은 등록을 반복합니다.

주소만 안다고 관리자 기능을 쓸 수 없으며, 일반 로그인 계정도 위 관리자 명단에 없으면 관리 기능을 실행할 수 없습니다.

## 4. 연결 값 입력

[`assets/js/config.js`](assets/js/config.js)를 열어 다음 세 자리표시자만 본인의 값으로 바꿉니다. 따옴표는 남겨 둡니다.

```js
window.WEDDING_CONNECTION = {
  supabaseUrl: "SUPABASE_PROJECT_URL",
  supabasePublishableKey: "SUPABASE_PUBLISHABLE_KEY",
  kakaoMapJavaScriptKey: "KAKAO_MAP_JAVASCRIPT_KEY",
  storageBucket: "wedding-media"
};
```

- 프로젝트 URL은 `https://프로젝트식별자.supabase.co` 형태입니다.
- Publishable key는 `sb_publishable_`로 시작하는 **공개용 키**입니다. 이 파일에서는 `anon` JWT, secret, service_role 키를 사용하지 않습니다.
- 파일 위쪽의 기존 `kakaoKey`는 원래 청첩장의 **카카오 공유 설정**입니다. 지도 키로 자동 재사용하지 않습니다.
- `preview`는 `false`를 유지합니다. 주소 뒤에 `?preview=1`을 붙이면 연결된 사이트에서도 이 기기만 사용하는 미리보기가 되므로, 하객에게 공유하는 주소에는 붙이지 않습니다.

이 최초 코드 반영 이후에는 관리자에서 업로드·수정한 이미지와 메시지 때문에 GitHub 파일을 다시 올릴 필요가 없습니다.

## 5. 카카오 지도 설정

1. [카카오디벨로퍼스](https://developers.kakao.com/)에 로그인하고 사용할 앱을 선택하거나 생성합니다.
2. **앱 → 앱 설정 → 앱 → 플랫폼 키**에서 사용할 **JavaScript 키**를 선택합니다.
3. 해당 키의 **JavaScript SDK 도메인**에 아래 주소를 등록합니다. `/wedding-1205/` 같은 경로는 붙이지 않습니다.

| 용도 | 등록할 도메인 |
| --- | --- |
| 실제 청첩장 | `https://insight-doby.github.io` |
| 로컬 테스트를 8000번 포트로 할 때 | `http://localhost:8000` |
| IP 주소로 로컬 테스트할 때 | `http://127.0.0.1:8000` |

4. 앱의 **카카오맵 → 사용 설정 → 상태**를 **ON**으로 설정합니다.
5. 복사한 JavaScript 키를 위 `kakaoMapJavaScriptKey`에 넣고 반영합니다. REST API 키나 Admin 키는 사용하지 않습니다.
6. 예식장 주소와 마커를 직접 비교합니다. 검색에는 **서울특별시 구로구 새말로 97**만 사용하고, **신도림테크노마트 8층 / 아모르홀**은 안내 문구에 유지합니다.

코드는 카카오 `services`의 주소 검색 결과에서 **구로구·새말로·건물번호 97**이 일치할 때만 마커를 표시합니다. 좌표를 추측해 넣지 않았습니다. 별도로 확인한 정확한 좌표가 생기면 `WEDDING_VENUE.latitude`와 `longitude`에 지정할 수 있습니다.

키가 없거나 도메인·검색·SDK 로드에 문제가 있어도 상세주소, 네이버지도, 카카오맵 버튼은 유지됩니다. 지도 크기는 높이 265px이며, 확대 버튼과 드래그를 지원합니다.

2026-09-24 확인한 카카오 공식 안내 기준, 카카오맵 API 사용 방식은 2026-07-21에 변경되었습니다. 개발자 계정에서 처음 활성화한 앱인지, 무료 쿼터 적용 여부, 추가 앱의 유료 API 설정 여부를 콘솔에서 확인합니다. 비용이 항상 없다고 가정하지 않습니다.

## 6. GitHub Pages에 반영

기존 저장소의 루트 `index.html`, `README.md`, `assets/` 위치를 유지합니다. 추가한 `admin/`, `supabase/`, `docs/`도 같은 루트에 놓습니다.

GitHub에서 적용할 변경을 확인한 후 기본 브랜치에 반영합니다. **Settings → Pages → Build and deployment**에서 현재 사용하던 배포 방식을 유지하고, 브랜치 방식이면 `main` / `/(root)`를 확인합니다. **Actions**에서 Pages 배포가 완료된 후 공개 페이지를 새로고침합니다.

로컬에서 확인하려면 저장소 폴더에서 다음을 실행한 뒤 `http://localhost:8000`을 엽니다.

```bash
python -m http.server 8000
```

별도의 npm 빌드 과정은 필요하지 않습니다. GitHub 개인 액세스 토큰을 청첩장이나 관리자 화면에 입력하는 기능도 없습니다.

## 7. 처음 연결한 뒤 확인하는 순서

1. 공개 청첩장에서 ‘이 기기에만 저장’ 안내가 없어졌는지 확인합니다.
2. 공개 주소에 `admin/`을 붙여 관리자 이메일·비밀번호로 로그인합니다.
3. **하객 친구들**에서 이미지 2장을 한 번에 업로드합니다. 기본은 비공개이므로 이름·태그를 적고 **선택 후보로 공개 → 변경 저장**을 누릅니다.
4. 다른 휴대폰에서 청첩장을 새로고침하고 입장창의 주사위를 눌러 새 캐릭터가 나오는지 확인합니다.
5. 휴대폰 A에서 이름·캐릭터·축하 메시지를 등록합니다. 휴대폰 B에서 새로고침하면 같은 이름·메시지·캐릭터가 보여야 합니다.
6. 관리자에서 그 메시지를 숨긴 후 휴대폰 B를 새로고침해 정원과 목록 모두에서 사라지는지 확인합니다. 테스트용 메시지는 확인 후 삭제합니다.
7. **사진 앨범**에서 사진을 업로드하고 순서와 공개 여부를 저장합니다. 19장 이상일 때 첫 페이지 18장, 다음 페이지 나머지가 나오는지 확인합니다.
8. 로그아웃 후 관리자 주소를 다시 열어 관리 목록이 노출되지 않는지 확인합니다.
9. iPhone Safari와 Android Chrome에서 사진 확대·배경 스크롤 잠금·닫기·주사위·이름 입력·지도 이동을 확인합니다. 실제 단말 검증은 아직 수행하지 못했습니다.

## 8. 평소 관리 방법

- **캐릭터 추가:** 여러 장 선택 → 업로드 → 친구 이름·계절·성격·특색·유형 수정 → 공개 체크 → 저장. 200~300개 목록도 검색과 24개 단위 관리 페이지로 다룹니다.
- **사진 순서:** 사진마다 숫자를 입력합니다. 작은 숫자가 먼저이며, 같은 숫자는 등록 ID 순서입니다.
- **기존 GitHub 이미지:** ‘기존 자료 → GitHub에 있는 이미지 연결’에 실제 `assets/images/...` 경로를 넣습니다. 이미지를 확인한 뒤 목록에 등록하며 원본 파일을 옮기지 않습니다.
- **캐릭터 비공개:** 새 후보 추첨에서는 제외하지만, 이미 선택한 하객이 있으면 그 하객의 캐릭터는 유지합니다. 해당 캐릭터는 삭제할 수 없고 비공개로 전환해야 합니다.
- **메시지 숨김:** 정원과 전체 메시지 목록에서 함께 숨깁니다. 삭제는 확인 창을 거칩니다.
- **새 이미지 보관:** Supabase의 Private Storage에 저장하고 DB에는 안정적인 파일 경로를 기록합니다. 읽을 수 있는 항목에만 5분 유효 이미지 URL을 발급합니다. 이미 열린 화면·발급된 URL·브라우저 캐시는 즉시 회수되지 않습니다.
- **기존 공개 GitHub 이미지:** 목록을 비공개로 바꿔도 GitHub의 원본 URL은 별도로 남습니다. 숨김은 공개 화면의 목록에서 제외하는 기능입니다.
- **갤러리 보호:** 갤러리 내부의 우클릭·드래그·복사·길게 누르기를 가능한 범위에서 억제합니다. 화면 캡처나 개발자 도구를 포함한 이미지 확보를 완전히 막는 기능은 아닙니다.

## 9. 이전 메시지 보존과 가져오기

원본 커밋의 설정은 `preview: true`였습니다. 따라서 공개 파일에 Google Apps Script 주소가 있어도 실제 등록은 `two-winters-preview-v1`이라는 브라우저 로컬 저장소를 사용했습니다.

관리자 **기존 자료**에서 다음 중 하나를 선택할 수 있습니다.

- **기존 공유 방명록 읽기:** 원래 Apps Script의 `action=list`만 호출합니다. 서버 소스는 저장소에 없고 이번 환경의 직접 읽기는 HTTP 403이어서, 이전 공유 데이터가 존재하는지 확인하지 못했습니다. 자동으로 삭제하거나 새 시스템에 복사하지 않습니다.
- **이 기기의 이전 메시지 읽기:** 같은 도메인·같은 브라우저에 저장된 예전 메시지를 확인합니다. 다른 사람 휴대폰의 로컬 저장 내용은 가져올 수 없습니다.
- **JSON 파일 읽기:** `[{"n":"이름","m":"내용","d":"2026.09.24","a":2}]` 또는 `{"items":[...]}` 형태를 지원합니다.

미리보기로 확인한 후 가져오기를 누르면 공유 저장소에 등록합니다. 이름·내용·날짜·캐릭터가 같은 이전 항목은 중복 등록하지 않습니다. 원본 메시지 끝의 `[tw-avatar:숫자]`도 해석해 선택했던 캐릭터를 유지합니다.

## 10. 캐릭터 이미지 제작 기준

다음은 이 청첩장에 맞춘 제작 권장값입니다.

| 항목 | 권장 기준 |
| --- | --- |
| 캔버스 | 정사각형 1024×1024px 원본, 운영용 512×512px 정도 |
| 형식 | 투명 알파가 있는 PNG 또는 WebP |
| 배경 | 진짜 투명 배경. 흰색·체커보드 무늬를 그림으로 넣지 않기 |
| 위치 | 중앙 정렬, 발바닥을 높이의 약 90~95% 위치에 맞추기 |
| 여백 | 귀·모자·머리카락·신발이 모두 들어오도록 상하 여백 확보 |
| 비율 | 원본 비율 유지, 전신, 같은 시점·비슷한 머리 대 몸 비율 |
| 다양성 | 얼굴·눈·헤어·표정·체형·소품·계절·성격을 함께 바꾸기 |
| 파일명 | `spring-picnic.png`, `playful-cat.png`처럼 구분 가능한 이름 |
| 제외 | 신랑·신부 이미지를 하객 목록에 등록하지 않기 |

이번 초기 6종은 1254×1254 RGBA PNG이며 투명 알파를 확인했습니다. 그림을 잘라내지 않고 `contain`으로 표시합니다. 생성 프롬프트는 [`docs/character-prompts.md`](docs/character-prompts.md)에 기록했습니다.

## 파일 안내

| 파일/폴더 | 역할 |
| --- | --- |
| `index.html` | 기존 디자인을 유지한 공개 청첩장 |
| `assets/js/config.js` | 공개 설정값 3곳, 원래 공유·연락처·음악 설정, 예식장 주소 |
| `assets/js/fallback-data.js` | 실제 포함된 초기 이미지 목록, 설정 전 표시 자료 |
| `assets/js/shared-data.js` | 공개·관리자 공통 데이터 연결, 이미지 업로드와 인증 연결 |
| `assets/js/invitation.js` | 앨범·캐릭터·정원·메시지·공유·음악 동작 |
| `assets/js/map.js` | 주소 확인 후 카카오 지도 표시 |
| `assets/css/` | 기존 스타일과 수정 스타일 |
| `assets/images/guests/` | 새 캐릭터 6종, 물음표 아이콘, 기존 하객 기록용 원본 그림 |
| `assets/images/gallery/` | 원래 웨딩 사진 1장 |
| `assets/images/couple.png`, `garden.png`, `share.jpg` | 원래 신랑 신부·정원·공유 이미지 |
| `assets/audio/bgm.mp3` | 원래 BGM |
| `assets/vendor/` | Supabase JS 2.57.4 브라우저 배포본과 MIT 라이선스 |
| `admin/` | 관리자 로그인·운영 화면 |
| `supabase/` | DB·Storage 접근 정책과 최초 이미지 목록 등록 |
| `tests/` | DOM 동작·PostgreSQL 권한 검사 코드. 사이트 실행에는 불필요 |

## 검증 범위

실행 결과와 미확인 항목은 [`docs/verification.md`](docs/verification.md)에 구분했습니다. 실제 Supabase 프로젝트·카카오 지도 키를 아직 연결하지 않았으므로 서비스 로그인·실제 업로드·여러 휴대폰 공유·실제 지도 마커까지 완료했다고 보지 않습니다.

테스트를 다시 실행하려면 별도 테스트 환경에 `jsdom@26.1.0`, `@electric-sql/pglite@0.3.14`를 설치하고 테스트 환경의 `node_modules`를 `NODE_PATH`로 지정합니다. 라이브 사이트에는 이 패키지가 필요 없습니다.

```bash
NODE_PATH=/테스트환경/node_modules node tests/interface.test.cjs
NODE_PATH=/테스트환경/node_modules node tests/rls.test.mjs
NODE_PATH=/테스트환경/node_modules node tests/connection.test.cjs
```

## 공식 참고 문서

- [카카오 지도 Web API 가이드](https://apis.map.kakao.com/web/guide/)
- [카카오 지도 주소 검색 예제](https://apis.map.kakao.com/web/sample/addr2coord/)
- [카카오맵 API 사용 설정과 변경 안내](https://developers.kakao.com/docs/ko/kakaomap/common)
- [Supabase API 키](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase 새 API 키 전환 안내](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase 사용자 관리](https://supabase.com/docs/guides/auth/users)
- [Supabase Auth 일반 설정](https://supabase.com/docs/guides/auth/general-configuration)
- [GitHub Pages 만들기](https://docs.github.com/ko/pages/getting-started-with-github-pages/creating-a-github-pages-site)

문서 확인일: 2026-09-24.
