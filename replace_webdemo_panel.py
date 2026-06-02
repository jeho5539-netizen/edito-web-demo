#!/usr/bin/env python3
"""웹 데모 교열 패널 교체"""

# 원본 파일 읽기
with open('/Users/leejeho/Downloads/edito-web-demo/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 새 패널 읽기
with open('/Users/leejeho/Downloads/NEW_PROOFREADING_SECTION.html', 'r', encoding='utf-8') as f:
    new_panel = f.read()

# 교열 패널 시작과 끝 찾기
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '<!-- ── 교열' in line or 'panel-proofreading' in line:
        if start_idx is None:
            start_idx = i
    elif start_idx is not None and ('<!-- ── 표지' in line or '<!-- ── 원고 분석' in line or 'panel-cover' in line):
        end_idx = i
        break

# 혹시 표지 패널이 없으면 다른 패널 찾기
if end_idx is None:
    for i, line in enumerate(lines[start_idx+1:], start=start_idx+1):
        if '<!-- ──' in line and 'panel' not in line:
            end_idx = i
            break

if start_idx is None:
    print("교열 패널을 찾을 수 없습니다.")
    exit(1)

if end_idx is None:
    print(f"교열 패널 끝을 찾을 수 없습니다. start={start_idx+1}")
    exit(1)

print(f"교열 패널 발견: {start_idx+1}행 ~ {end_idx}행")

# 교체
new_lines = lines[:start_idx] + [new_panel + '\n\n'] + lines[end_idx:]

# 저장
with open('/Users/leejeho/Downloads/edito-web-demo/index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"웹 데모 교열 패널 교체 완료!")
