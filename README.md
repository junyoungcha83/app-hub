# 차준영 (내 앱 모음)

내가 만든 앱을 한 화면에서 보는 PWA. 보기(분류별 카드, 길게 눌러 같은 분류 안에서 순서 바꾸기, 📋 주소 복사) · 설정(설명·분류·색깔·주소, 분류 관리, 내보내기/가져오기).

- 앱 목록: `node tools/collect.mjs` → `data/apps.json` (각 앱 주소의 manifest 에서 이름·지금 아이콘을 가져옴). 앱을 새로 만들면 tools/collect.mjs 의 APPS 에 한 줄 추가 후 다시 실행.
- 아이콘 그림은 각 앱 주소에서 바로 불러와 앱 아이콘이 바뀌면 여기도 바뀐다.
- 설정은 기기마다 localStorage(`app-hub`). 새 버전: sw.js CACHE 와 ?v= 함께 올리기.
