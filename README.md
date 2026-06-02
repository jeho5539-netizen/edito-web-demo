# Edito - AI 출판 도우미

> 출판 업계를 위한 AI 기반 원고 편집 및 마케팅 통합 플랫폼

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen)](https://jeho5539-netizen.github.io/edito-web-demo/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/jeho5539-netizen/edito-web-demo)

**🔗 데모 링크:** https://jeho5539-netizen.github.io/edito-web-demo/

---

## 📖 프로젝트 개요

**Edito**는 출판사와 작가를 위한 AI 기반 통합 출판 도우미 애플리케이션입니다. 
원고 교정/교열부터 표지 디자인, 마케팅 문구 생성까지 출판 프로세스 전반을 AI로 자동화합니다.

### 🎯 개발 목적
- **문제 인식**: 출판사의 교정·교열 작업에 막대한 시간과 비용 소요
- **해결 방안**: 로컬 AI(Ollama) 기반 자동 편집으로 시간 90% 단축
- **차별점**: 설정집 자동 생성, 서사 일관성 추적 등 소설 특화 기능

---

## ✨ 주요 기능

### 1. 📝 교정/교열
- **맞춤법 검사**: 한국어 맞춤법, 띄어쓰기 자동 교정
- **문장 개선**: 가독성 향상을 위한 문장 구조 제안
- **일관성 검사**: 인물명, 지명, 용어 통일성 검증

### 2. 📚 설정집 자동 생성 (World Bible)
- **인물 관리**: 등장인물 자동 추출 및 특성 정리
- **장소/용어**: 작품 내 고유명사 일관성 관리
- **서사 추적**: 시간대별 캐릭터 상태 변화 추적

### 3. 📊 원고 분석
- **장르 판별**: AI 기반 작품 장르 자동 분류
- **출판 가능성 평가**: 시장성 분석 및 개선 제안
- **유사 도서 추천**: 참고할 수 있는 유사 작품 제시

### 4. 🎨 크리에이티브 지원
- **표지 컨셉**: Stable Diffusion 프롬프트 자동 생성
- **홍보 영상**: 스토리보드 및 편집 가이드 제공

### 5. 📢 마케팅 자동화
- **보도자료 생성**: 출판 보도자료 자동 작성
- **서점 소개문**: 교보문고, YES24용 소개 문구
- **SNS 카피**: SNS 마케팅용 짧은 카피 생성

---

## 🛠 기술 스택

### Frontend
- **HTML5 / CSS3 / Vanilla JavaScript**
- **반응형 디자인**: 데스크톱/태블릿 지원
- **아이콘**: Tabler Icons
- **폰트**: 시스템 네이티브 폰트

### Backend (실제 앱)
- **Electron**: 크로스 플랫폼 데스크톱 앱
- **Ollama**: 로컬 AI 엔진 (Exaone 3.0 모델)
- **Stable Diffusion**: 이미지 생성 AI
- **Python**: 텍스트 처리 및 분석

### 데이터 저장
- **로컬 스토리지**: 프로젝트 및 결과 저장
- **파일 시스템**: 원고 파일 직접 읽기/쓰기 (Electron 앱)

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

## 💻 웹 데모 vs 실제 앱

| 기능 | 웹 데모 | 실제 데스크톱 앱 |
|------|---------|------------------|
| UI/UX | ✅ 100% 동일 | ✅ |
| 프로젝트 관리 | ✅ 샘플 데이터 | ✅ 실제 파일 저장 |
| AI 교정/교열 | ⚠️ 데모 결과 표시 | ✅ Ollama 실제 처리 |
| 설정집 생성 | ⚠️ UI만 표시 | ✅ AI 자동 생성 |
| 표지 디자인 | ⚠️ UI만 표시 | ✅ Stable Diffusion |
| 파일 가져오기 | ❌ | ✅ |

> **웹 데모는 UI/UX 시연용**입니다. 실제 AI 기능은 로컬 환경이 필요합니다.

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

## 🎯 향후 계획

### Phase 1 (완료)
- ✅ 기본 교정/교열 기능
- ✅ 설정집 자동 생성
- ✅ 프로젝트 관리 시스템

### Phase 2 (진행 중)
- 🔄 Claude API 연동 (Ollama 대안)
- 🔄 웹 버전 실시간 협업 기능
- 🔄 모바일 반응형 개선

### Phase 3 (계획)
- 📋 출판사 워크플로우 통합
- 📋 버전 관리 시스템
- 📋 다국어 지원 (영어, 일본어)

---

## 🏆 프로젝트 의의

### 기술적 성과
- **로컬 AI 활용**: 비용 없이 무제한 AI 사용
- **Electron 앱 개발**: 크로스 플랫폼 데스크톱 앱 구축 경험
- **복잡한 상태 관리**: Vanilla JS로 대규모 앱 구현

### 비즈니스 임팩트
- **시간 절감**: 교정 시간 90% 단축 (실제 테스트 기준)
- **비용 절감**: API 비용 대비 로컬 AI로 무료 사용
- **품질 향상**: 설정집 기능으로 소설 일관성 대폭 개선

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
