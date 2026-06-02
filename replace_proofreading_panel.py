#!/usr/bin/env python3
"""교열 패널을 새로운 세션 기반 UI로 교체"""

# 원본 파일 읽기
with open('/Users/leejeho/Downloads/edito/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 새 패널 읽기
with open('/Users/leejeho/Downloads/NEW_PROOFREADING_SECTION.html', 'r', encoding='utf-8') as f:
    new_panel = f.read()

# 교열 패널 시작과 끝 찾기
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '<!-- ── 교열' in line:
        start_idx = i
    elif start_idx is not None and '<!-- ── 표지 디자인' in line:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f"교열 패널을 찾을 수 없습니다. start={start_idx}, end={end_idx}")
    exit(1)

print(f"교열 패널 발견: {start_idx+1}행 ~ {end_idx}행")

# 교체
new_lines = lines[:start_idx] + [new_panel + '\n\n'] + lines[end_idx:]

# 저장
with open('/Users/leejeho/Downloads/edito/index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"교열 패널 교체 완료!")
print(f"이전: {end_idx - start_idx}줄 → 새로운: {len(new_panel.split(chr(10)))}줄")
