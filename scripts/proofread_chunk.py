#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""세션 기반 청크 교열 - 단일 청크를 이전 설정집 컨텍스트와 함께 처리"""
import sys
import json
import re
import urllib.request
import urllib.error

GENRE_PROMPTS = {
    "문학·소설": "문장 리듬감과 호흡, 묘사의 생동감, 서사 흐름과 일관성, 번역투 표현 제거, 중복 표현 개선",
    "에세이":    "필자의 목소리와 진정성 유지, 문체 일관성, 논리적 흐름, 독자 공감도, 구어체/문어체 혼용 교정",
    "자기계발":  "핵심 메시지 명확성, 실용적 표현 강화, 반복 제거, 논리 구조, 전문용어 일관성",
    "시·시집":   "운율과 리듬감, 이미지와 비유의 신선함, 언어의 압축성, 시어 선택과 조화",
    "인문·교양": "논리 구조 명확성, 개념과 용어 정확성, 용어 일관성, 단락 간 연결성",
    "경제·경영": "간결하고 명확한 문장, 수치와 데이터 정확성, 전문용어 일관성, 논거의 타당성"
}

def extract_json_robust(raw_text):
    """JSON 추출"""
    # 패턴 1: ```json ... ```
    m = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except:
            pass

    # 패턴 2: 첫 { ~ 마지막 }
    s = raw_text.find('{')
    e = raw_text.rfind('}')
    if s != -1 and e != -1 and e > s:
        try:
            return json.loads(raw_text[s:e+1])
        except:
            pass

    # 패턴 3: 중첩 없는 JSON
    for match in re.findall(r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}', raw_text, re.DOTALL):
        try:
            return json.loads(match)
        except:
            continue

    raise ValueError(f'JSON 추출 실패. 원문: {raw_text[:200]}')

def llm_call(model_name, prompt, timeout=180):
    """Ollama API 호출"""
    data = json.dumps({
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.6, "num_predict": 4096}
    }).encode('utf-8')

    req = urllib.request.Request(
        'http://localhost:11434/api/generate',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode('utf-8')).get('response', '')

def format_world_bible_context(world_bible):
    """설정집을 프롬프트용 텍스트로 변환"""
    if not world_bible:
        return ""

    parts = []

    if world_bible.get('characters'):
        chars = [f"- {c['name']}: {c['desc']}" for c in world_bible['characters']]
        parts.append(f"[인물]\n" + "\n".join(chars))

    if world_bible.get('places'):
        places = [f"- {p['name']}: {p['desc']}" for p in world_bible['places']]
        parts.append(f"[장소]\n" + "\n".join(places))

    if world_bible.get('terms'):
        terms = [f"- {t['term']}: {t['definition']}" for t in world_bible['terms']]
        parts.append(f"[용어]\n" + "\n".join(terms))

    return "\n\n".join(parts) if parts else ""

def proofread_single_chunk(text, chunk_index, genre, world_bible=None):
    """
    단일 청크 교열

    Args:
        text: 교열할 텍스트
        chunk_index: 청크 번호 (1부터 시작)
        genre: 장르
        world_bible: 이전까지 누적된 설정집 {characters:[], places:[], terms:[]}

    Returns:
        {
            'corrected': 교열된 텍스트,
            'suggestions': 수정 제안 목록,
            'newEntities': {
                'characters': [...],
                'places': [...],
                'terms': [...]
            },
            'conflicts': [...]  // 발견된 모순
        }
    """

    model_name = 'exaone3.0:7.8b'
    guide = GENRE_PROMPTS.get(genre, GENRE_PROMPTS["문학·소설"])

    # 이전 설정집 컨텍스트
    context_text = ""
    if world_bible and chunk_index > 1:
        wb_text = format_world_bible_context(world_bible)
        if wb_text:
            context_text = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 이전 청크에서 확립된 설정 (반드시 확인!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{wb_text}

🚨 경고: 현재 청크가 위 설정과 **모순**되면 반드시 conflicts에 기록하세요!

예시:
- 위에 "검은 머리"인데 지금 "금발"이면 → 모순!
- 위에 "서울에 살고 있다"인데 지금 "서울에 처음 왔다"면 → 모순!
- 위에 "20살"인데 지금 "30살"이면 → 모순! (시간 경과 없이)

모순을 찾지 못하면 감점입니다. 꼼꼼히 확인하세요!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    # 모순 감지를 위한 Few-shot 예시
    conflict_instruction = ""
    if world_bible and chunk_index > 1:
        conflict_instruction = """
━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 모순 체크 필수
━━━━━━━━━━━━━━━━━━━━━━━

[학습 예시 - 이렇게 하세요]

예시 1: 인물 외모 변경
- 이전: "민수는 검은 머리"
- 현재: "민수의 금발이 날렸다"
→ conflicts: [{{"type": "character", "issue": "민수 머리색 검은색→금발 변경", "suggestion": "검은 머리로 통일"}}]

예시 2: 장소 관계 모순
- 이전: "서울에 살고 있다"
- 현재: "서울에 처음 왔다"
→ conflicts: [{{"type": "place", "issue": "서울 거주 여부 모순 (거주함 vs 처음 방문)", "suggestion": "거주 중으로 통일"}}]

예시 3: 나이/시간 오류
- 이전: "20살의 민수"
- 현재: "30살이 된 민수" (하루 후 시점)
→ conflicts: [{{"type": "other", "issue": "하루만에 10살 증가", "suggestion": "나이 또는 시간 경과 확인"}}]

예시 4: 직업 변경
- 이전: "민수는 작가다"
- 현재: "의사인 민수"
→ conflicts: [{{"type": "character", "issue": "민수 직업 작가→의사 변경", "suggestion": "직업 통일 또는 전직 설명 추가"}}]

예시 5: 사건 순서
- 이전: "민수가 죽었다"
- 현재: "민수가 말했다"
→ conflicts: [{{"type": "other", "issue": "사망 후 말하는 모순", "suggestion": "시간선 또는 사망 설정 재확인"}}]

[당신의 작업]
위 예시처럼 현재 텍스트와 [이전 설정집]을 **꼼꼼히** 비교하세요.
모순이 하나라도 있으면 conflicts 배열에 **반드시** 추가하세요.
모순이 정말 없으면: conflicts: []
"""

    prompt = f"""당신은 {genre} 전문 교열자입니다.

교열 기준: {guide}

{context_text}

[현재 청크 #{chunk_index}]
{text}

---
다음 작업을 **모두** 수행하세요:

1. 교열 (포괄적 검토)
   ✓ 문장 구조: 문법, 어순, 호응 관계
   ✓ 표현: 번역투 제거, 중복 표현 개선, 어휘 선택
   ✓ 논리: 문장 간 연결, 인과관계, 전개 순서
   ✓ 일관성: 시점, 어조, 문체 통일
   ✓ 사실관계: 앞뒤 내용과의 정합성

2. 추출
   - 등장하는 인물(사람 이름), 장소(지명), 용어(고유명사) 모두 추출

3. 모순 체크
{conflict_instruction}

JSON 형식:
{{
  "corrected": "교열된 텍스트 (위 5가지 기준 모두 적용)",
  "suggestions": [
    {{
      "original": "원문 구절",
      "suggestion": "수정안",
      "reason": "수정 이유 (문장구조/표현/논리/일관성/사실관계 중 명시)"
    }}
  ],
  "newEntities": {{
    "characters": [{{"name": "이름", "desc": "역할/특징"}}],
    "places": [{{"name": "장소", "desc": "설명"}}],
    "terms": [{{"term": "용어", "definition": "정의"}}]
  }},
  "conflicts": [{{"type": "character|place|other", "issue": "모순 내용", "suggestion": "해결방안"}}]
}}

필수:
- 교열은 5가지 기준(문장구조/표현/논리/일관성/사실관계) 모두 적용
- 수정 사항이 있으면 suggestions에 이유와 함께 기록
- 인물/장소 언급되면 newEntities에 추가
- 이전 설정과 모순되면 conflicts에 추가
- 없으면 빈 배열 []"""

    try:
        print(f"청크 #{chunk_index} 교열 시작...", file=sys.stderr, flush=True)

        raw_response = llm_call(model_name, prompt)
        parsed = extract_json_robust(raw_response)

        # 필드 검증 및 기본값 설정
        result = {
            'corrected': parsed.get('corrected', text),
            'suggestions': parsed.get('suggestions', []),
            'newEntities': {
                'characters': parsed.get('newEntities', {}).get('characters', []),
                'places': parsed.get('newEntities', {}).get('places', []),
                'terms': parsed.get('newEntities', {}).get('terms', [])
            },
            'conflicts': parsed.get('conflicts', [])
        }

        print(f"청크 #{chunk_index} 완료: 수정 제안 {len(result['suggestions'])}건, 새 발견 {len(result['newEntities']['characters'])+len(result['newEntities']['places'])+len(result['newEntities']['terms'])}건, 모순 {len(result['conflicts'])}건", file=sys.stderr, flush=True)

        return {'success': True, **result}

    except urllib.error.URLError:
        return {
            'success': False,
            'error': 'Ollama 연결 실패. Ollama 앱이 실행 중인지 확인해주세요.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'교열 중 오류: {str(e)}'
        }

if __name__ == '__main__':
    # stdin으로 JSON 입력 받기
    # {
    #   "text": "...",
    #   "chunkIndex": 1,
    #   "genre": "문학·소설",
    #   "worldBible": {...}
    # }

    try:
        data = json.loads(sys.stdin.read())

        text = data.get('text', '')
        chunk_index = data.get('chunkIndex', 1)
        genre = data.get('genre', '문학·소설')
        world_bible = data.get('worldBible')

        if not text:
            print(json.dumps({
                'success': False,
                'error': '원고 텍스트가 필요합니다'
            }, ensure_ascii=False))
            sys.exit(1)

        result = proofread_single_chunk(text, chunk_index, genre, world_bible)
        print(json.dumps(result, ensure_ascii=False))

    except json.JSONDecodeError:
        print(json.dumps({
            'success': False,
            'error': 'JSON 파싱 오류'
        }, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }, ensure_ascii=False))
        sys.exit(1)
