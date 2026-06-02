// ═══════════════════════════════════════════════════════════
// 설정집 병합 및 정리 헬퍼 함수들
// ═══════════════════════════════════════════════════════════

// ─── 빈 설정집 생성 ────────────────────────────────────────
function createEmptyWorldBible() {
  return {
    characters: [],
    places: [],
    terms: [],
    conflicts: []
  };
}

// ─── 문자열 정규화 (중복 감지용) ──────────────────────────
function normalizeString(str) {
  if (!str) return '';
  return str.trim()
    .normalize('NFC') // 유니코드 정규화 (한글 자모 결합)
    .toLowerCase()
    .replace(/\s+/g, ' '); // 공백 정규화
}

// ─── 설정집 병합 및 정리 (저장 시 호출) ──────────────────
function mergeAndCleanWorldBible(existingBible, newBible) {
  if (!newBible) return existingBible || createEmptyWorldBible();
  if (!existingBible) return cleanWorldBible(newBible);

  const merged = {
    characters: mergeEntityArray(existingBible.characters || [], newBible.characters || [], 'name'),
    places: mergeEntityArray(existingBible.places || [], newBible.places || [], 'name'),
    terms: mergeEntityArray(existingBible.terms || [], newBible.terms || [], 'term'),
    conflicts: [...(existingBible.conflicts || []), ...(newBible.conflicts || [])]
  };

  return cleanWorldBible(merged);
}

// ─── 엔티티 배열 병합 (정규화 + 중복 제거 + 업데이트) ────
function mergeEntityArray(existing, newItems, keyField) {
  if (!newItems || newItems.length === 0) return existing || [];
  if (!existing || existing.length === 0) return newItems;

  const normalized = new Map();

  // 기존 항목 먼저 추가
  existing.forEach(item => {
    const key = normalizeString(item[keyField]);
    if (key) {
      normalized.set(key, {
        ...item,
        [keyField]: item[keyField] // 원본 유지
      });
    }
  });

  // 새 항목 병합 (같은 키면 설명 업데이트)
  newItems.forEach(item => {
    const key = normalizeString(item[keyField]);
    if (!key) return;

    const existing = normalized.get(key);
    if (existing) {
      // 기존 항목 업데이트 (설명이 더 상세하면 교체)
      const descField = keyField === 'term' ? 'definition' : 'desc';
      const newDesc = item[descField] || '';
      const oldDesc = existing[descField] || '';

      if (newDesc.length > oldDesc.length) {
        normalized.set(key, {
          ...existing,
          [descField]: newDesc,
          lastUpdatedAt: item.firstSeenAt || existing.firstSeenAt
        });
      }
    } else {
      // 새 항목 추가
      normalized.set(key, item);
    }
  });

  // Map을 배열로 변환, firstSeenAt 순서로 정렬
  return Array.from(normalized.values())
    .sort((a, b) => (a.firstSeenAt || 0) - (b.firstSeenAt || 0));
}

// ─── 설정집 최종 정리 (저장 전) ──────────────────────────
function cleanWorldBible(bible) {
  if (!bible) return createEmptyWorldBible();

  return {
    characters: cleanEntityArray(bible.characters || [], 'name'),
    places: cleanEntityArray(bible.places || [], 'name'),
    terms: cleanEntityArray(bible.terms || [], 'term'),
    conflicts: (bible.conflicts || []).filter(c => c.issue && c.issue.trim())
  };
}

// ─── 엔티티 배열 정리 (검증 + 중복 제거) ────────────────
function cleanEntityArray(items, keyField) {
  if (!items || items.length === 0) return [];

  const seen = new Set();
  const cleaned = [];

  items.forEach(item => {
    // 필수 필드 검증
    if (!item[keyField] || !item[keyField].trim()) return;

    const key = normalizeString(item[keyField]);
    if (seen.has(key)) return; // 중복 제거

    seen.add(key);
    cleaned.push({
      ...item,
      [keyField]: item[keyField].trim() // 공백 제거
    });
  });

  return cleaned;
}
