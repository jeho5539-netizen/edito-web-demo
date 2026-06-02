# Edito - AI 출판 도우미 (프로토타입)

> 출판 업계를 위한 AI 기반 원고 편집 플랫폼의 **UI/UX 프로토타입**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen)](https://jeho5539-netizen.github.io/edito-web-demo/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/jeho5539-netizen/edito-web-demo)
[![Prototype](https://img.shields.io/badge/Status-Prototype-yellow)](https://github.com/jeho5539-netizen/edito-web-demo)

**🔗 데모 링크:** https://jeho5539-netizen.github.io/edito-web-demo/

> ⚠️ **현재 상태**: 프론트엔드 UI/UX 프로토타입입니다. AI 기능은 백엔드 개발 예정입니다.

---

## 📖 프로젝트 개요

**Edito**는 출판사와 작가를 위한 AI 기반 통합 출판 도우미의 **프론트엔드 프로토타입**입니다. 

### 🎯 개발 배경
- **문제 인식**: 출판사의 교정·교열 작업에 막대한 시간과 비용 소요
- **솔루션 아이디어**: AI 기반 자동 편집 시스템으로 효율성 향상
- **현재 단계**: UI/UX 설계 및 프론트엔드 구현 완료

### 💡 프로젝트 목표
1. **사용자 경험 설계**: 출판 워크플로우에 최적화된 직관적 인터페이스
2. **기술 검증**: Vanilla JavaScript로 복잡한 상태 관리 구현
3. **확장 가능성**: 향후 AI 백엔드 연동을 위한 구조 설계

---

## ✨ 기획된 주요 기능 (UI 구현 완료)

### 1. 📝 교정/교열 인터페이스
- 맞춤법 검사 UI
- 문장 개선 제안 화면
- 인물명/지명 일관성 검사 패널

### 2. 📚 설정집 관리 (World Bible)
- 인물 정보 입력/조회 UI
- 장소/용어 관리 시스템
- 서사 타임라인 뷰어

### 3. 📊 원고 분석 대시보드
- 장르 분석 결과 표시
- 시장성 평가 차트
- 개선 제안 리포트 UI

### 4. 🎨 크리에이티브 도구
- 표지 컨셉 입력 폼
- 프롬프트 생성 인터페이스
- 홍보 영상 기획 패널

### 5. 📢 마케팅 콘텐츠 생성
- 보도자료 템플릿
- 서점 소개문 편집기
- SNS 카피 생성 UI

> 💡 **참고**: 위 기능들의 **UI/UX는 완성**되었으며, AI 처리 백엔드는 개발 예정입니다.

---

## 🛠 기술 스택

### 현재 구현 (프로토타입)
- **HTML5 / CSS3 / Vanilla JavaScript**
- **반응형 디자인**: 데스크톱/태블릿 지원
- **아이콘**: Tabler Icons (CDN)
- **폰트**: 시스템 네이티브 폰트
- **데이터 저장**: localStorage API

### 계획된 기술 스택 (향후 개발)
- **Backend**: Node.js + Express 또는 Electron
- **AI Engine**: Ollama (로컬) 또는 Claude API (클라우드)
- **이미지 생성**: Stable Diffusion API
- **데이터베이스**: SQLite 또는 PostgreSQL
- **배포**: Vercel (웹) 또는 Electron 패키징 (앱)

---

## 🎨 UI/UX 특징

### 디자인 컨셉
- **다크 테마**: 장시간 작업에 적합한 눈의 피로 최소화
- **미니멀 인터페이스**: 핵심 기능에 집중할 수 있는 깔끔한 레이아웃
- **직관적 네비게이션**: 왼쪽 사이드바로 모든 기능 접근

### 주요 화면
1. **프로젝트 관리**: 여러 원고 프로젝트 동시 관리
2. **편집 화면**: 원본과 수정본 비교 뷰어
3. **결과 히스토리**: 과거 작업 결과 보관 및 재사용

---

## 🖼 스크린샷

### 메인 화면
![메인 화면](https://via.placeholder.com/800x450/1a1918/c9a96e?text=Edito+Main+Screen)

### 교열 작업 화면
![교열 화면](https://via.placeholder.com/800x450/1a1918/c9a96e?text=Proofreading+View)

### 설정집 자동 생성
![설정집](https://via.placeholder.com/800x450/1a1918/c9a96e?text=World+Bible)

---

## 💻 현재 구현 상태

| 구분 | 상태 | 설명 |
|------|------|------|
| **UI/UX 디자인** | ✅ 완료 | 전체 화면 및 컴포넌트 구현 |
| **프론트엔드** | ✅ 완료 | Vanilla JavaScript 상태 관리 |
| **프로젝트 관리** | ✅ 완료 | localStorage 기반 데이터 저장 |
| **샘플 데이터** | ✅ 완료 | 데모용 프로젝트 및 결과 표시 |
| **AI 백엔드** | 🔄 계획 | Ollama/Claude API 연동 예정 |
| **파일 I/O** | 🔄 계획 | Electron 앱 또는 서버 연동 예정 |

> 💡 **현재**: 프론트엔드 프로토타입 단계  
> 🎯 **다음 단계**: AI API 연동 및 백엔드 개발

---

## 🚀 설치 및 실행

### 웹 데모 (UI 확인용)
```
https://jeho5539-netizen.github.io/edito-web-demo/
```

### 로컬 실행 (실제 기능 체험)
```bash
# 1. 저장소 클론
git clone https://github.com/jeho5539-netizen/edito-web-demo.git
cd edito-web-demo

# 2. 웹 서버 실행
python3 -m http.server 8000

# 3. 브라우저에서 열기
open http://localhost:8000
```

### 실제 앱 설치 (AI 기능 포함)
```bash
# Ollama 설치
brew install ollama
ollama pull exaone3.0:7.8b

# Stable Diffusion 설치 (선택)
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui && ./webui.sh

# Edito 앱 실행
npm install
npm start
```

---

## 📁 프로젝트 구조

```
edito-web-demo/
├── index.html                  # 메인 HTML
├── css/
│   ├── style.css              # 메인 스타일
│   ├── full-edit.css          # 편집 화면
│   ├── progress-sidebar.css   # 진행 상태
│   └── diff-viewer.css        # 비교 뷰어
├── js/
│   ├── app.js                 # 메인 로직
│   ├── worldbible-view.js     # 설정집 기능
│   ├── diff-viewer.js         # Diff 뷰어
│   └── session-proofreading.js # 교열 세션
├── assets/
│   ├── icon.svg
│   └── logo.svg
└── README.md
```

---

## 🎯 향후 개발 계획

### Phase 1 (완료) ✅
- ✅ UI/UX 디자인 및 프로토타입 구현
- ✅ 프론트엔드 아키텍처 설계
- ✅ 샘플 데이터 기반 데모 완성

### Phase 2 (예정)
- 🔄 AI API 연동 (Claude API 또는 Ollama)
- 🔄 백엔드 서버 구축
- 🔄 실제 파일 업로드/저장 기능

### Phase 3 (계획)
- 📋 Electron 데스크톱 앱 패키징
- 📋 사용자 인증 및 데이터베이스 연동
- 📋 출판사 워크플로우 통합

---

## 🏆 프로젝트를 통한 학습

### 기술적 성과
- **Vanilla JavaScript**: 프레임워크 없이 복잡한 상태 관리 구현
- **UI/UX 설계**: 출판 도메인 특화 인터페이스 디자인
- **프론트엔드 아키텍처**: 확장 가능한 컴포넌트 구조 설계
- **Git/GitHub Pages**: 버전 관리 및 정적 사이트 배포

### 도메인 이해
- **출판 워크플로우**: 원고 편집 프로세스 분석
- **사용자 니즈**: 작가/편집자의 실제 작업 흐름 이해
- **문제 해결**: 반복 작업 자동화 솔루션 기획

---

## 👤 개발자

**이제호 (Lee Jeho)**
- 📧 Email: jeho5539@gmail.com
- 💼 GitHub: [@jeho5539-netizen](https://github.com/jeho5539-netizen)
- 🔗 Portfolio: https://jeho5539-netizen.github.io/edito-web-demo/

---

## 📄 라이선스

MIT License

---

## 🙏 감사의 말

이 프로젝트는 한국 출판 업계의 디지털 전환을 위해 개발되었습니다.

**사용된 오픈소스:**
- [Ollama](https://ollama.ai/) - 로컬 AI 엔진
- [Tabler Icons](https://tabler-icons.io/) - 아이콘 세트
- [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui) - 이미지 생성

---

Made with ❤️ for Korean Publishing Industry
