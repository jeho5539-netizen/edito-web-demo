# 세션 기반 교열 시스템 설계

## 📌 핵심 개념

### 세션(Session)이란?
- 하나의 완전한 원고를 여러 청크로 나눠 교열하는 "작업 단위"
- 각 세션은 독립적인 진행률과 누적 데이터를 가짐

### 데이터 구조

```javascript
{
  id: "session-123456",
  projectId: "proj-abc",
  status: "in_progress", // 'new', 'in_progress', 'completed'
  genre: "문학·소설",
  createdAt: "2025-06-01T...",
  
  chunks: [
    {
      index: 1,
      original: "원본 텍스트...",
      proofread: "교열된 텍스트...",
      suggestions: [...],
      status: "completed"
    },
    {
      index: 2,
      original: "두 번째 청크...",
      status: "pending"
    }
  ],
  
  // 누적된 설정집
  worldBible: {
    characters: [
      {name: "주인공", desc: "...", firstSeenAt: 1}
    ],
    places: [...],
    terms: [...],
    conflicts: [  // 발견된 모순
      {
        type: "character",
        chunkIndex: 3,
        issue: "1장에서 검은 눈동자였으나 3장에서 푸른 눈동자로 변경"
      }
    ]
  }
}
```

## 🎨 UI 설계

### 교열 패널 구조

```
┌───────────────────────────────────────────┐
│ 교열                                       │
│ EXAONE 3.0 · 세션 기반 누적 교열          │
├───────────────────────────────────────────┤
│                                           │
│ ┌─ 세션 상태 ─────────────────────────┐  │
│ │ 📊 진행률: 3/10 청크 (30%)           │  │
│ │ ▓▓▓░░░░░░░ 30%                      │  │
│ │                                     │  │
│ │ 누적 추출 정보:                      │  │
│ │ • 인물: 5명                          │  │
│ │ • 장소: 3곳                          │  │
│ │ • 용어: 8개                          │  │
│ │ ⚠️ 모순 발견: 2건                   │  │
│ │                                     │  │
│ │ [세션 초기화] [모순 보기]            │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ ┌─ 현재 청크 입력 ────────────────────┐  │
│ │ 청크 #4                             │  │
│ │ ┌─────────────────────────────────┐ │  │
│ │ │ 원고 입력...                    │ │  │
│ │ │                                 │ │  │
│ │ └─────────────────────────────────┘ │  │
│ │ 1,234자 · 230단어                   │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ [1차 교열 시작] or [다음 청크 교열]      │
│ [교열 완료 & 세션 종료]                  │
│                                           │
│ ┌─ 교열 결과 ─────────────────────────┐  │
│ │ [교열된 텍스트] [수정 제안] [새 발견] │  │
│ │                                     │  │
│ │ ... 결과 내용 ...                   │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ ┌─ 누적 설정집 ───────────────────────┐  │
│ │ [인물] [장소] [용어] [모순]          │  │
│ │                                     │  │
│ │ ... 전체 세션의 누적 정보 ...        │  │
│ └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

## 🔄 작동 흐름

### 첫 번째 청크
1. 사용자가 텍스트 입력
2. **[1차 교열 시작]** 버튼 클릭
3. 새 세션 생성
4. 교열 + 설정집 추출
5. 결과 표시
6. **[다음 청크 교열]** 버튼 활성화

### 두 번째 청크 이후
1. 사용자가 다음 텍스트 입력
2. **[다음 청크 교열]** 클릭
3. **이전 설정집을 컨텍스트로 전달**
4. 교열 + 새로운 정보 추출 + 모순 체크
5. 설정집 업데이트 (중복 제거, 모순 추가)
6. 결과 표시

### 마지막 청크
1. 사용자가 마지막 텍스트 입력
2. **[교열 완료 & 세션 종료]** 클릭
3. 교열 + 최종 체크
4. 세션 status = 'completed'
5. 전체 교열 결과 + 통합 설정집 표시

## 💡 주요 기능

### 1. 실시간 진행률 표시
```
진행률: 3/10 청크 (30%)
▓▓▓░░░░░░░ 30%
```

### 2. 누적 정보 표시
```
현재까지 추출된 정보:
• 인물: 5명 (주인공, 민수, 영희, 철수, 박사)
• 장소: 3곳 (공원, 카페, 연구소)
• 용어: 8개
```

### 3. 모순 자동 감지
```
⚠️ 모순 발견: 2건

[모순 1] 청크 #3
• 1장: "주인공의 눈은 검은색"
• 3장: "그의 푸른 눈동자가 빛났다"
→ 제안: 일관된 표현으로 수정 필요

[모순 2] 청크 #5
• 2장: "민수는 회사원"
• 5장: "민수 교수님이 말했다"
→ 제안: 직업 확인 필요
```

### 4. 세션 관리
- **세션 초기화**: 처음부터 다시 시작
- **세션 복구**: 중단했던 세션 이어하기
- **세션 히스토리**: 이전 세션 목록 보기

## 🎯 사용자 경험

### 시나리오 1: 300페이지 소설 교열
```
1. 프로젝트 생성: "나의 첫 소설"
2. 교열 탭 클릭
3. 1-30페이지 붙여넣기 → [1차 교열 시작]
   → 인물 5명, 장소 3곳 추출
4. 31-60페이지 붙여넣기 → [다음 청크 교열]
   → 새 인물 2명 추가, 모순 1건 발견
5. 61-90페이지...
   ... 반복 ...
10. 271-300페이지 → [교열 완료 & 세션 종료]
   → 전체 통계: 인물 15명, 장소 10곳, 모순 5건
```

### 시나리오 2: 모순 발견 시
```
[청크 #3 교열 중]
⚠️ 모순 발견!

청크 #1에서: "주인공의 검은 눈동자"
현재 청크: "그의 푸른 눈이 빛났다"

→ 사용자 선택:
  1. [청크 #1로 돌아가기] - 1장 수정
  2. [현재 청크 수정] - 3장 수정
  3. [무시하고 계속] - 나중에 수정
```

## 🔧 구현 핵심

### Python (proofread.py)
```python
def proofread_chunk(text, session_context):
    """
    Args:
        text: 현재 청크 텍스트
        session_context: {
            'worldBible': 이전까지 추출된 설정집,
            'chunkIndex': 현재 청크 번호
        }
    
    Returns: {
        'corrected': 교열된 텍스트,
        'newEntities': 새로 발견된 인물/장소/용어,
        'conflicts': 발견된 모순,
        'suggestions': 수정 제안
    }
    """
    
    prompt = f"""
    당신은 전문 편집자입니다.
    
    [현재까지 알려진 설정집]
    인물: {session_context['worldBible']['characters']}
    장소: {session_context['worldBible']['places']}
    
    [현재 청크 #{session_context['chunkIndex']}]
    {text}
    
    작업:
    1. 교열 (문체, 문법, 표현 개선)
    2. 새로운 인물/장소/용어 추출
    3. 이전 설정집과 모순 체크
    
    JSON 형식으로 반환:
    {{
        "corrected": "교열된 텍스트",
        "newEntities": {{
            "characters": [...],
            "places": [...]
        }},
        "conflicts": [...],
        "suggestions": [...]
    }}
    """
```

### JavaScript (app.js)
```javascript
let currentSession = null;

async function startFirstChunk() {
  const text = document.getElementById('inp-proofreading').value;
  
  // 새 세션 생성
  currentSession = {
    id: Date.now().toString(),
    projectId: state.currentProjectId,
    status: 'in_progress',
    chunks: [],
    worldBible: {
      characters: [],
      places: [],
      terms: [],
      conflicts: []
    }
  };
  
  await proofreadChunk(text, 1);
}

async function proofreadNextChunk() {
  const text = document.getElementById('inp-proofreading').value;
  const chunkIndex = currentSession.chunks.length + 1;
  
  await proofreadChunk(text, chunkIndex);
}

async function proofreadChunk(text, chunkIndex) {
  // 진행률 표시
  showProgress(chunkIndex);
  
  // Python 호출 (이전 설정집 전달)
  const result = await window.electronAPI.proofreadChunk({
    text,
    chunkIndex,
    worldBible: currentSession.worldBible
  });
  
  // 청크 저장
  currentSession.chunks.push({
    index: chunkIndex,
    original: text,
    proofread: result.corrected,
    status: 'completed'
  });
  
  // 설정집 업데이트
  mergeEntities(result.newEntities);
  
  // 모순 저장
  if (result.conflicts.length > 0) {
    currentSession.worldBible.conflicts.push(...result.conflicts);
    showConflictsAlert(result.conflicts);
  }
  
  // UI 업데이트
  renderSessionStatus();
  renderChunkResult(result);
  renderAccumulatedWorldBible();
}
```

## 📊 장점

1. **투명성**: 사용자가 각 단계를 명확히 볼 수 있음
2. **제어**: 언제든 멈추고, 수정하고, 다시 시작 가능
3. **즉각 피드백**: 각 청크마다 모순 즉시 확인
4. **누적 학습**: 뒤로 갈수록 설정집이 풍부해짐
5. **구현 단순**: 복잡한 자동화 없이 명확한 흐름

이 설계로 진행할까요?
