# Edito 웹 데모

> Edito 데스크톱 앱의 UI/UX를 그대로 재현한 웹 데모입니다.

## 🌐 빠른 시작

### 로컬에서 실행

```bash
# 웹 서버 실행 (Python)
python3 -m http.server 8000

# 또는 (Node.js)
npx serve .

# 브라우저에서 http://localhost:8000 열기
```

### GitHub Pages 배포

1. 이 폴더를 GitHub 저장소에 업로드
2. Settings → Pages → Source: `main` 브랜치 선택
3. 배포 완료 후 URL 확인

---

## ✨ 실제 앱과의 차이점

### ✅ 동일한 부분
- **UI/UX 100% 재현** - 실제 앱과 동일한 디자인
- **모든 화면** - 교정, 교열, 분석, 마케팅, 표지, 영상, 설정집, 커스텀 사전
- **인터랙션** - 프로젝트 생성, 탭 전환, 결과 확인
- **반응형 디자인** - 모바일/태블릿 지원

### ⚠️ 다른 부분
- **AI 처리** - 실제 AI 대신 미리 준비된 데이터 사용
- **파일 I/O** - 파일 불러오기/저장 불가 (localStorage 사용)
- **Electron API** - 데스크톱 앱 전용 기능 비활성화

---

## 🎯 체험 가능한 기능

### 1. 프로젝트 관리
- 새 프로젝트 만들기
- 프로젝트 선택 및 전환
- 프로젝트 정보 확인

### 2. 교열 (핵심 기능)
- 원고 입력
- 교열 실행 (모킹 결과)
- 교열된 원고 확인
- 수정 제안 목록 보기
- **설정집 확인** (인물, 장소, 용어 자동 추출)
- **커스텀 사전** (서사 상태 변화 추적)

### 3. 교정
- 맞춤법/띄어쓰기 교정 시뮬레이션

### 4. 원고 분석
- 장르 판별
- 출판 가능성 평가
- 개선 제안
- 유사 도서 추천

### 5. 마케팅 문구
- 보도자료 생성
- 서점 소개문 생성
- SNS 카피 생성

### 6. 표지 컨셉 스케치
- Stable Diffusion 프롬프트 정교화

### 7. 홍보 영상
- 스톡 영상 검색 워크플로우
- 자동 편집 프로세스

### 8. 설정집 & 커스텀 사전
- **설정집 (World Bible)**: 인물, 장소, 용어, 세계관 규칙
- **커스텀 사전 (Narrative State)**: 서사 상태 변화 추적
- 탭 전환 기능

---

## 🔧 기술 스택

- **HTML/CSS/JavaScript** - Vanilla JS (프레임워크 없음)
- **로컬 저장소** - localStorage API
- **아이콘** - Tabler Icons
- **폰트** - System Fonts (-apple-system)

---

## 📂 파일 구조

```
edito-web-demo/
├── index.html              # 메인 HTML
├── css/
│   ├── style.css          # 메인 스타일 (실제 앱과 동일)
│   ├── full-edit.css      # 통합 편집 스타일
│   ├── progress-sidebar.css
│   ├── diff-viewer.css
│   └── demo.css           # 웹 데모 전용 스타일
├── js/
│   ├── app.js             # 메인 로직 (모킹)
│   ├── custom-dict.js     # 설정집/커스텀 사전
│   ├── diff-viewer.js     # Diff 뷰어
│   ├── diff-integration.js
│   └── progress-sidebar.js
├── assets/
│   └── icon.png
└── README.md
```

---

## 🚀 전체 기능 사용하려면

실제 AI가 작동하는 완전한 버전은 **데스크톱 앱**을 설치하세요:

👉 **[GitHub 저장소](https://github.com/yourusername/edito)**

### 데스크톱 앱 설치 방법

```bash
git clone https://github.com/yourusername/edito.git
cd edito

# 의존성 설치
npm install
pip3 install bareunpy

# Ollama 설치 및 모델 다운로드
brew install ollama
ollama pull exaone3.0:7.8b

# 앱 실행
npm start
```

---

## 💡 개발자 노트

### 실제 앱에서 웹 데모로 포팅한 방법

1. **HTML/CSS 복사** - 실제 앱의 구조를 그대로 유지
2. **Electron API 제거** - `window.electronAPI` 호출을 localStorage로 대체
3. **AI 처리 모킹** - Python 스크립트 호출 대신 setTimeout으로 결과 반환
4. **데모 배너 추가** - 웹 데모임을 명확히 표시

### 주요 모킹 함수

```javascript
// 교열 실행 - 실제 앱에서는 Python 스크립트 호출
function startProofread() {
  // 실제: await window.electronAPI.runProofread(text);
  // 데모: setTimeout(() => { 미리 준비된 결과 표시 }, 1500);
}
```

---

## 📝 라이선스

MIT License — 자세한 내용은 상위 폴더의 `LICENSE` 참조

---

## 👤 개발자

**이제호**
- Email: jeho5539@gmail.com
- GitHub: [@yourusername](https://github.com/yourusername)

---

Made with ❤️ for Korean Publishing Industry
