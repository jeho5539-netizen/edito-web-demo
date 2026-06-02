// ═══════════════════════════════════════════════════════════
// 설정집 보기 패널
// ═══════════════════════════════════════════════════════════

function renderWorldBibleView() {
  console.log('🔵 renderWorldBibleView() called');
  const container = document.getElementById('worldbible-view-content');

  if (!container) {
    console.error('❌ worldbible-view-content element NOT found!');
    return;
  }

  if (!state.currentProjectId) {
    console.log('⚠️ No project selected');
    container.innerHTML = '<div class="output-empty">프로젝트를 선택하세요</div>';
    return;
  }

  const proj = state.projects.find(p => p.id === state.currentProjectId);
  console.log('🔵 Project found:', proj ? 'YES' : 'NO', 'worldBible:', proj?.worldBible);

  if (!proj || !proj.worldBible) {
    console.log('⚠️ No worldBible data');
    container.innerHTML = '<div class="output-empty">아직 교열 세션이 없습니다.<br>교열 탭에서 교열을 시작하세요.</div>';
    return;
  }

  // 프로젝트에 저장된 설정집 표시
  const wb = proj.worldBible;
  console.log('✅ WorldBible:', {
    characters: wb.characters?.length || 0,
    places: wb.places?.length || 0,
    terms: wb.terms?.length || 0
  });

  container.innerHTML = `
    ${renderWorldBibleSection('인물', wb.characters, '#7eb8f7', 'ti-user')}
    ${renderWorldBibleSection('장소', wb.places, '#63e6be', 'ti-map-pin')}
    ${renderWorldBibleSection('용어', wb.terms, '#a9e34b', 'ti-book')}
  `;
  console.log('✅ worldBible rendered');
}

function renderWorldBibleSection(title, items, color, icon) {
  if (items.length === 0) {
    return '';
  }

  const content = items.map(item => {
    const name = item.name || item.term;
    const desc = item.desc || item.definition;
    return `
      <div style="background:var(--bg2);padding:12px;margin-bottom:8px;border-radius:6px;border-left:3px solid ${color}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:14px">${name}</strong>
          <span style="font-size:11px;color:var(--text2);background:var(--bg3);padding:2px 8px;border-radius:4px">청크 #${item.firstSeenAt}</span>
        </div>
        <div style="font-size:12px;color:var(--text2)">${desc}</div>
      </div>
    `;
  }).join('');

  return `
    <div style="margin-bottom:24px">
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:${color}">
        <i class="ti ${icon}"></i> ${title} (${items.length})
      </div>
      ${content}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// 동적 흐름 추적 패널
// ═══════════════════════════════════════════════════════════

function renderNarrativeFlow() {
  console.log('🔵 renderNarrativeFlow() called');
  const container = document.getElementById('narrative-flow-content');

  if (!container) {
    console.error('❌ narrative-flow-content element NOT found!');
    return;
  }

  if (!state.currentProjectId) {
    console.log('⚠️ No project selected');
    container.innerHTML = '<div class="output-empty">프로젝트를 선택하세요</div>';
    return;
  }

  const proj = state.projects.find(p => p.id === state.currentProjectId);
  console.log('🔵 Project found:', proj ? 'YES' : 'NO', 'narrativeFlow:', proj?.narrativeFlow);

  if (!proj || !proj.narrativeFlow || proj.narrativeFlow.length === 0) {
    console.log('⚠️ No narrativeFlow data');
    container.innerHTML = '<div class="output-empty">아직 교열 세션이 없습니다.<br>교열 탭에서 교열을 시작하세요.</div>';
    return;
  }

  console.log('✅ NarrativeFlow chunks:', proj.narrativeFlow.length);

  // 청크별 서사 변화 표시
  const flowHTML = proj.narrativeFlow.map((chunk, idx) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:14px;font-weight:600;color:var(--text)">
          <i class="ti ti-file-text"></i> 청크 #${chunk.chunkIndex}
        </div>
        <div style="font-size:11px;color:var(--text2);background:var(--bg3);padding:4px 10px;border-radius:4px">
          ${new Date(chunk.timestamp).toLocaleString('ko-KR', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
        </div>
      </div>

      ${chunk.newCharacters && chunk.newCharacters.length > 0 ? `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:#7eb8f7;margin-bottom:6px">
            <i class="ti ti-user-plus"></i> 새 인물 등장
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${chunk.newCharacters.map(c => `
              <span style="background:#7eb8f722;color:#7eb8f7;padding:4px 10px;border-radius:4px;font-size:11px">${c.name}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${chunk.newPlaces && chunk.newPlaces.length > 0 ? `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:#63e6be;margin-bottom:6px">
            <i class="ti ti-map-pin-plus"></i> 새 장소 등장
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${chunk.newPlaces.map(p => `
              <span style="background:#63e6be22;color:#63e6be;padding:4px 10px;border-radius:4px;font-size:11px">${p.name}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${chunk.conflicts && chunk.conflicts.length > 0 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
          <div style="font-size:12px;color:#ff6b6b;margin-bottom:6px">
            <i class="ti ti-alert-triangle"></i> 모순 발견
          </div>
          ${chunk.conflicts.map(c => `
            <div style="background:#ff6b6b22;padding:8px;border-radius:4px;margin-bottom:6px">
              <div style="font-size:11px;color:#ff6b6b">${c.issue}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = flowHTML || '<div class="output-empty">흐름 데이터가 없습니다</div>';
  console.log('✅ narrativeFlow rendered');
}
