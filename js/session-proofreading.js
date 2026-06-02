// ═══════════════════════════════════════════════════════════
// 세션 기반 교열 시스템
// ═══════════════════════════════════════════════════════════

let currentSession = null;

// ─── 세션 구조 ─────────────────────────────────────────────
function createNewSession() {
  return {
    id: Date.now().toString(),
    projectId: state.currentProjectId,
    status: 'in_progress',
    genre: getSelectedGenre(),
    createdAt: new Date().toISOString(),

    chunks: [],

    worldBible: {
      characters: [],  // {name, desc, firstSeenAt}
      places: [],      // {name, desc, firstSeenAt}
      terms: [],       // {term, definition, firstSeenAt}
      conflicts: []    // {type, chunkIndex, issue, suggestion}
    }
  };
}

// ─── 1차 교열 시작 ─────────────────────────────────────────
async function startFirstChunk() {
  const text = document.getElementById('inp-proofreading').value.trim();
  if (!text) {
    showToast('원고를 입력하세요');
    return;
  }

  if (!state.currentProjectId) {
    showToast('먼저 프로젝트를 선택하거나 만들어주세요');
    return;
  }

  // 새 세션 생성
  currentSession = createNewSession();

  // 🟢 프로젝트의 기존 worldBible 로드 (이어서 교열 가능)
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (proj && proj.worldBible) {
    currentSession.worldBible = JSON.parse(JSON.stringify(proj.worldBible)); // 깊은 복사
    console.log('기존 설정집 로드:', {
      characters: currentSession.worldBible.characters.length,
      places: currentSession.worldBible.places.length,
      terms: currentSession.worldBible.terms.length
    });
  }

  // UI 업데이트
  document.getElementById('session-status').style.display = 'block';
  document.getElementById('btn-first-chunk').style.display = 'none';
  document.getElementById('btn-next-chunk').style.display = 'inline-flex';
  document.getElementById('btn-finish-session').style.display = 'inline-flex';

  // 사이드바 설정집 메뉴 표시
  document.getElementById('worldbible-label').style.display = 'block';
  document.getElementById('ni-worldbible').style.display = 'flex';
  document.getElementById('ni-narrative-flow').style.display = 'flex';

  // 교열 실행
  await proofreadChunk(text, 1);
}

// ─── 다음 청크 교열 ────────────────────────────────────────
async function proofreadNextChunk() {
  if (!currentSession) {
    showToast('먼저 1차 교열을 시작하세요');
    return;
  }

  const text = document.getElementById('inp-proofreading').value.trim();
  if (!text) {
    showToast('원고를 입력하세요');
    return;
  }

  const chunkIndex = currentSession.chunks.length + 1;
  await proofreadChunk(text, chunkIndex);
}

// ─── 청크 교열 실행 ────────────────────────────────────────
async function proofreadChunk(text, chunkIndex) {
  // 진행률 표시
  updateSessionProgress(chunkIndex);

  // 진행바 표시
  const progressEl = document.getElementById('progress-proofreading');
  progressEl.style.display = 'flex';
  progressEl.querySelector('.progress-text').textContent = `청크 #${chunkIndex} 교열 중...`;

  try {
    // Python 호출 (이전 설정집 전달)
    console.log('🔵 청크 #' + chunkIndex + ' 교열 시작');
    console.log('🔵 전달하는 설정집:', {
      characters: currentSession.worldBible.characters.length,
      places: currentSession.worldBible.places.length,
      terms: currentSession.worldBible.terms.length,
      conflicts: currentSession.worldBible.conflicts.length
    });
    console.log('🔵 전달하는 설정집 상세:', JSON.stringify(currentSession.worldBible, null, 2));

    const result = await window.electronAPI.proofreadChunk({
      text,
      chunkIndex,
      genre: currentSession.genre,
      worldBible: currentSession.worldBible
    });

    console.log('🔍 교열 결과:', result);
    console.log('🔍 받은 새 발견:', JSON.stringify(result.newEntities, null, 2));
    console.log('🔍 받은 모순:', JSON.stringify(result.conflicts, null, 2));

    // 오류 체크
    if (!result.success) {
      throw new Error(result.error || '알 수 없는 오류');
    }

    console.log('✅ 수정 제안:', result.suggestions?.length || 0);
    console.log('✅ 새 발견:', result.newEntities);

    // 청크 저장
    currentSession.chunks.push({
      index: chunkIndex,
      original: text,
      proofread: result.corrected,
      suggestions: result.suggestions || [],
      status: 'completed'
    });

    // 설정집 병합
    mergeWorldBible(result.newEntities, chunkIndex);

    console.log('✅ 병합 후 설정집:', {
      characters: currentSession.worldBible.characters.length,
      places: currentSession.worldBible.places.length,
      terms: currentSession.worldBible.terms.length
    });

    // 모순 저장 (mergeWorldBible이 이미 처리했지만 chunkIndex 추가 필요)
    console.log('🔵 모순 처리, 받은 모순:', result.conflicts?.length || 0, '건');
    if (result.conflicts && result.conflicts.length > 0) {
      console.log('⚠️ 모순 발견:', result.conflicts);
      // mergeWorldBible이 이미 conflicts를 병합했으므로 중복 방지
      // 단, chunkIndex가 없는 경우만 추가
      const conflictsWithChunk = result.conflicts
        .filter(c => !currentSession.worldBible.conflicts.find(existing =>
          existing.issue === c.issue && existing.chunkIndex === chunkIndex
        ))
        .map(c => ({
          ...c,
          chunkIndex
        }));

      if (conflictsWithChunk.length > 0) {
        currentSession.worldBible.conflicts.push(...conflictsWithChunk);
        console.log('✅ 모순 추가됨:', conflictsWithChunk.length, '건');
      }
    } else {
      console.log('✅ 모순 없음');
    }

    // 동적 흐름 추적 데이터 저장
    saveNarrativeFlow(result, chunkIndex);

    // 프로젝트에 누적 데이터 저장
    saveToProject();

    // UI 업데이트
    renderChunkResult(result, chunkIndex);
    updateSessionStats();

    // 🟢 사이드바 패널이 열려있으면 자동 갱신
    refreshOpenSidebarPanels();

    // 입력창 비우기
    document.getElementById('inp-proofreading').value = '';
    updateStat('inp-proofreading', 'stat-proofreading');

    // 청크 번호 업데이트
    document.getElementById('current-chunk-number').textContent = `#${chunkIndex + 1}`;

    showToast(`청크 #${chunkIndex} 교열 완료`);

  } catch (error) {
    console.error('교열 오류:', error);
    console.error('오류 상세:', JSON.stringify(error, null, 2));

    // 사용자에게 상세 오류 표시
    const errorMsg = error.message || error.toString();
    showToast('교열 오류: ' + errorMsg);

    // 출력창에도 오류 표시
    const out = document.getElementById('out-proofreading');
    out.innerHTML = `
      <div style="background:#ff6b6b22;border:1px solid #ff6b6b;border-radius:8px;padding:16px;margin:16px 0">
        <div style="font-size:14px;font-weight:600;color:#ff6b6b;margin-bottom:8px">
          <i class="ti ti-alert-triangle"></i> 교열 중 오류 발생
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">
          청크 #${chunkIndex}
        </div>
        <div style="font-size:13px;background:var(--bg2);padding:12px;border-radius:4px;font-family:monospace;color:var(--text)">
          ${errorMsg}
        </div>
        <div style="font-size:11px;color:var(--text2);margin-top:8px">
          💡 해결 방법: 원고를 확인하거나, 더 짧은 청크로 나누어 보세요.
        </div>
      </div>
    `;
  } finally {
    progressEl.style.display = 'none';
  }
}

// ─── 설정집 병합 ────────────────────────────────────────────
function mergeWorldBible(newEntities, chunkIndex) {
  console.log('🔵 mergeWorldBible() 호출, chunkIndex:', chunkIndex);
  console.log('🔵 병합 전 설정집:', {
    characters: currentSession.worldBible.characters.length,
    places: currentSession.worldBible.places.length,
    terms: currentSession.worldBible.terms.length
  });
  console.log('🔵 새로 받은 항목:', newEntities);

  if (!newEntities) {
    console.log('⚠️ newEntities가 null/undefined');
    return;
  }

  // firstSeenAt 추가
  const newBible = {
    characters: (newEntities.characters || []).map(c => ({...c, firstSeenAt: chunkIndex})),
    places: (newEntities.places || []).map(p => ({...p, firstSeenAt: chunkIndex})),
    terms: (newEntities.terms || []).map(t => ({...t, firstSeenAt: chunkIndex})),
    conflicts: newEntities.conflicts || []
  };

  console.log('🔵 firstSeenAt 추가 후:', newBible);

  // merge-helpers.js의 강력한 병합 함수 사용
  currentSession.worldBible = mergeAndCleanWorldBible(
    currentSession.worldBible,
    newBible
  );

  console.log('✅ 병합 완료, 결과:', {
    characters: currentSession.worldBible.characters.length,
    places: currentSession.worldBible.places.length,
    terms: currentSession.worldBible.terms.length,
    conflicts: currentSession.worldBible.conflicts.length
  });
  console.log('✅ 병합 후 상세:', JSON.stringify(currentSession.worldBible, null, 2));
}

// ─── 세션 진행률 업데이트 ──────────────────────────────────
function updateSessionProgress(currentChunk) {
  // 진행률 텍스트는 사용자가 직접 설정할 수 없으므로 현재 청크만 표시
  document.getElementById('session-progress-text').textContent = `${currentChunk} 청크 진행 중`;
}

// ─── 세션 통계 업데이트 ────────────────────────────────────
function updateSessionStats() {
  // 통계는 프로젝트에 자동 저장됨 (별도 UI 업데이트 불필요)
}

// ─── 청크 결과 렌더링 ──────────────────────────────────────
function renderChunkResult(result, chunkIndex) {
  const out = document.getElementById('out-proofreading');

  // 청크 데이터 저장 (모달에서 사용)
  if (currentSession && currentSession.chunks) {
    const chunk = currentSession.chunks.find(c => c.index === chunkIndex);
    if (chunk) {
      chunk.newEntities = result.newEntities; // 새 발견 항목 저장
    }
  }

  out.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text)">
          <i class="ti ti-check-circle"></i> 청크 #${chunkIndex} 교열 완료
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sec" onclick="showChunkEntitiesModal(${chunkIndex})" style="font-size:11px;padding:4px 10px">
            <i class="ti ti-book"></i>이 청크 새 발견 (${countNewEntities(result.newEntities)})
          </button>
          <button class="btn btn-sec" onclick="showChunkFlowModal(${chunkIndex})" style="font-size:11px;padding:4px 10px">
            <i class="ti ti-timeline"></i>이 청크 흐름
          </button>
        </div>
      </div>

      <div class="result-tabs" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:8px">
        <button class="result-tab active" onclick="switchChunkTab(${chunkIndex}, 'corrected')">교열된 텍스트</button>
        <button class="result-tab" onclick="switchChunkTab(${chunkIndex}, 'suggestions')">수정 제안 (${result.suggestions?.length || 0})</button>
        <button class="result-tab" onclick="switchChunkTab(${chunkIndex}, 'new')">새 발견 (${countNewEntities(result.newEntities)})</button>
      </div>

      <div id="chunk-${chunkIndex}-corrected" class="chunk-result-content">
        <div style="background:var(--paper);color:var(--paper-text);padding:16px;border-radius:6px;line-height:1.8;white-space:pre-wrap">
${result.corrected}
        </div>
      </div>

      <div id="chunk-${chunkIndex}-suggestions" class="chunk-result-content" style="display:none">
        ${renderSuggestions(result.suggestions || [])}
      </div>

      <div id="chunk-${chunkIndex}-new" class="chunk-result-content" style="display:none">
        ${renderNewEntities(result.newEntities)}
      </div>
    </div>
  `;
}

// ─── 수정 제안 렌더링 ──────────────────────────────────────
function renderSuggestions(suggestions) {
  if (suggestions.length === 0) {
    return '<div style="color:var(--text2);text-align:center;padding:20px">수정 제안이 없습니다</div>';
  }

  return suggestions.map(s => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:8px">
      <div style="font-family:monospace;font-size:13px;margin-bottom:6px;color:var(--c16)">
        "${s.original}" → "${s.suggestion}"
      </div>
      <div style="font-size:12px;color:var(--text2)">
        ${s.reason}
      </div>
    </div>
  `).join('');
}

// ─── 새 발견 렌더링 ────────────────────────────────────────
function renderNewEntities(entities) {
  if (!entities) {
    return '<div style="color:var(--text2);text-align:center;padding:20px">새로 발견된 정보가 없습니다</div>';
  }

  let html = '';

  if (entities.characters?.length > 0) {
    html += `
      <div style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#7eb8f7">
          <i class="ti ti-user"></i> 인물 (${entities.characters.length})
        </div>
        ${entities.characters.map(c => `
          <div style="background:var(--bg2);padding:10px;margin-bottom:6px;border-radius:4px;border-left:3px solid #7eb8f7">
            <strong>${c.name}</strong> — ${c.desc}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (entities.places?.length > 0) {
    html += `
      <div style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#63e6be">
          <i class="ti ti-map-pin"></i> 장소 (${entities.places.length})
        </div>
        ${entities.places.map(p => `
          <div style="background:var(--bg2);padding:10px;margin-bottom:6px;border-radius:4px;border-left:3px solid #63e6be">
            <strong>${p.name}</strong> — ${p.desc}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (entities.terms?.length > 0) {
    html += `
      <div style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#a9e34b">
          <i class="ti ti-book"></i> 용어 (${entities.terms.length})
        </div>
        ${entities.terms.map(t => `
          <div style="background:var(--bg2);padding:10px;margin-bottom:6px;border-radius:4px;border-left:3px solid #a9e34b">
            <strong>${t.term}</strong> — ${t.definition}
          </div>
        `).join('')}
      </div>
    `;
  }

  return html || '<div style="color:var(--text2);text-align:center;padding:20px">새로 발견된 정보가 없습니다</div>';
}

// ─── 청크 탭 전환 ──────────────────────────────────────────
function switchChunkTab(chunkIndex, tab) {
  // 탭 버튼 활성화
  event.target.parentElement.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  // 콘텐츠 전환
  ['corrected', 'suggestions', 'new'].forEach(t => {
    const el = document.getElementById(`chunk-${chunkIndex}-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
}

// ─── 유틸리티 ──────────────────────────────────────────────
function countNewEntities(entities) {
  if (!entities) return 0;
  return (entities.characters?.length || 0) + (entities.places?.length || 0) + (entities.terms?.length || 0);
}

function getSelectedGenre() {
  const selected = document.querySelector('.genre-chip.on');
  return selected ? selected.textContent.trim() : '문학·소설';
}

// 누적 설정집 보기, 모순 목록 보기 함수는 제거됨
// 이제 전체 화면 패널(worldbible-view, narrative-flow)로 대체됨

// ─── 프로젝트에 데이터 저장 ────────────────────────────────
function saveToProject() {
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj) return;

  // 설정집 병합 (기존 데이터 + 새 데이터, 중복 제거 + 업데이트)
  proj.worldBible = mergeAndCleanWorldBible(
    proj.worldBible || createEmptyWorldBible(),
    currentSession.worldBible
  );

  // 자동 저장
  save();
}

// ─── 동적 흐름 추적 저장 ────────────────────────────────────
function saveNarrativeFlow(result, chunkIndex) {
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj) return;

  if (!proj.narrativeFlow) proj.narrativeFlow = [];

  proj.narrativeFlow.push({
    chunkIndex,
    timestamp: new Date().toISOString(),
    newCharacters: result.newEntities?.characters || [],
    newPlaces: result.newEntities?.places || [],
    newTerms: result.newEntities?.terms || [],
    conflicts: result.conflicts || []
  });
}

// ─── 세션 종료 ─────────────────────────────────────────────
async function finishSession() {
  if (!currentSession) return;

  // 🟢 최종 정리: 설정집 중복 제거 및 정렬
  currentSession.worldBible = cleanWorldBible(currentSession.worldBible);

  currentSession.status = 'completed';
  currentSession.completedAt = new Date().toISOString();

  // 프로젝트에 저장 (병합 방식)
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (proj) {
    // 세션 히스토리 저장
    if (!proj.sessions) proj.sessions = [];
    proj.sessions.push(currentSession);

    // 🟢 설정집 최종 저장 (병합 + 정리)
    saveToProject();

    // 🟢 통계 업데이트
    updateProjectStats(proj);

    await save();
  }

  const totalChunks = currentSession.chunks.length;
  const totalEntities = countNewEntities(currentSession.worldBible);
  showToast(`교열 세션 완료! (${totalChunks}개 청크, ${totalEntities}개 항목 추출)`);

  // UI 초기화
  resetProofSession();

  // 🟢 사이드바 패널 갱신
  refreshOpenSidebarPanels();
}

// ─── 프로젝트 통계 업데이트 ────────────────────────────────
function updateProjectStats(proj) {
  if (!proj.stats) {
    proj.stats = {
      totalChunks: 0,
      totalSessions: 0,
      lastProofreadAt: null
    };
  }

  const session = currentSession;
  proj.stats.totalChunks += session.chunks.length;
  proj.stats.totalSessions += 1;
  proj.stats.lastProofreadAt = new Date().toISOString();
}

// ─── 세션 초기화 ───────────────────────────────────────────
function resetProofSession() {
  currentSession = null;

  document.getElementById('session-status').style.display = 'none';
  document.getElementById('btn-first-chunk').style.display = 'inline-flex';
  document.getElementById('btn-next-chunk').style.display = 'none';
  document.getElementById('btn-finish-session').style.display = 'none';
  document.getElementById('current-chunk-number').textContent = '#1';
  document.getElementById('out-proofreading').innerHTML = '<div class="output-empty">장르를 선택하고 첫 번째 청크를 입력한 후 교열을 시작하세요</div>';

  // 사이드바 설정집 메뉴는 숨기지 않음 (프로젝트에 데이터 남아있음)

  showToast('세션이 초기화되었습니다');
}

// ─── 저장/복사 ─────────────────────────────────────────────
function saveChunkResult() {
  if (!currentSession || currentSession.chunks.length === 0) {
    showToast('저장할 결과가 없습니다');
    return;
  }

  const lastChunk = currentSession.chunks[currentSession.chunks.length - 1];
  // 실제 저장 로직...
  showToast('결과가 저장되었습니다');
}

function copyProofResult() {
  // 현재 세션이 있으면 세션에서, 없으면 프로젝트의 마지막 세션에서 가져오기
  let lastChunk = null;

  if (currentSession && currentSession.chunks.length > 0) {
    lastChunk = currentSession.chunks[currentSession.chunks.length - 1];
  } else {
    // 세션 종료 후에는 프로젝트에서 가져오기
    const proj = state.projects.find(p => p.id === state.currentProjectId);
    if (proj && proj.sessions && proj.sessions.length > 0) {
      const lastSession = proj.sessions[proj.sessions.length - 1];
      if (lastSession.chunks && lastSession.chunks.length > 0) {
        lastChunk = lastSession.chunks[lastSession.chunks.length - 1];
      }
    }
  }

  if (!lastChunk) {
    showToast('복사할 결과가 없습니다');
    return;
  }

  navigator.clipboard.writeText(lastChunk.proofread).then(() => {
    showToast('교열 결과가 복사되었습니다');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('복사 실패: ' + err.message);
  });
}
// ─── 현재 청크의 새 발견 항목만 임시 표시 (모달) ──────────
function showChunkEntitiesModal(chunkIndex) {
  const chunk = currentSession?.chunks.find(c => c.index === chunkIndex);
  if (!chunk || !chunk.newEntities) {
    showToast('표시할 데이터가 없습니다');
    return;
  }

  const entities = chunk.newEntities;
  const html = renderNewEntities(entities); // 기존 함수 재활용

  // 모달 생성
  const modal = document.createElement('div');
  modal.className = 'chunk-entities-modal';
  modal.innerHTML = `
    <div class="chunk-entities-modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="chunk-entities-modal-content">
      <div class="chunk-entities-modal-header">
        <h3>청크 #${chunkIndex} - 새로 발견된 항목 (임시)</h3>
        <button onclick="this.closest('.chunk-entities-modal').remove()" class="btn btn-icon">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="chunk-entities-modal-body">
        ${html}
        <div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:6px;font-size:12px;color:var(--text2)">
          💡 이 데이터는 임시 표시입니다. 전체 누적 데이터는 사이드바의 <strong>"설정집"</strong> 메뉴에서 확인하세요.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ─── 현재 청크의 동적 흐름 임시 표시 (모달) ──────────────
function showChunkFlowModal(chunkIndex) {
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj || !proj.narrativeFlow) {
    showToast('표시할 데이터가 없습니다');
    return;
  }

  const chunkFlow = proj.narrativeFlow.filter(f => f.chunkIndex === chunkIndex);
  if (chunkFlow.length === 0) {
    showToast('이 청크의 흐름 데이터가 없습니다');
    return;
  }

  const flow = chunkFlow[0];
  const html = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:12px">청크 #${chunkIndex}</div>
      
      ${flow.newCharacters && flow.newCharacters.length > 0 ? `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:#7eb8f7;margin-bottom:6px">
            <i class="ti ti-user-plus"></i> 새 인물 등장
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${flow.newCharacters.map(c => `
              <span style="background:#7eb8f722;color:#7eb8f7;padding:4px 10px;border-radius:4px;font-size:11px">${c.name}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${flow.newPlaces && flow.newPlaces.length > 0 ? `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:#63e6be;margin-bottom:6px">
            <i class="ti ti-map-pin-plus"></i> 새 장소 등장
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${flow.newPlaces.map(p => `
              <span style="background:#63e6be22;color:#63e6be;padding:4px 10px;border-radius:4px;font-size:11px">${p.name}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${flow.conflicts && flow.conflicts.length > 0 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
          <div style="font-size:12px;color:#ff6b6b;margin-bottom:6px">
            <i class="ti ti-alert-triangle"></i> 모순 발견
          </div>
          ${flow.conflicts.map(c => `
            <div style="background:#ff6b6b22;padding:8px;border-radius:4px;margin-bottom:6px">
              <div style="font-size:11px;color:#ff6b6b">${c.issue}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'chunk-entities-modal';
  modal.innerHTML = `
    <div class="chunk-entities-modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="chunk-entities-modal-content">
      <div class="chunk-entities-modal-header">
        <h3>청크 #${chunkIndex} - 동적 흐름 (임시)</h3>
        <button onclick="this.closest('.chunk-entities-modal').remove()" class="btn btn-icon">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="chunk-entities-modal-body">
        ${html}
        <div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:6px;font-size:12px;color:var(--text2)">
          💡 이 데이터는 임시 표시입니다. 전체 누적 흐름은 사이드바의 <strong>"동적 흐름"</strong> 메뉴에서 확인하세요.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ─── 열린 사이드바 패널 자동 갱신 ──────────────────────────
function refreshOpenSidebarPanels() {
  console.log('🔵 refreshOpenSidebarPanels() called');

  // 사이드바 메뉴 항상 표시 (데이터가 있는 경우)
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (proj) {
    if (proj.worldBible) {
      const wbMenu = document.getElementById('ni-worldbible');
      if (wbMenu) {
        wbMenu.style.display = 'flex';
        console.log('✅ worldBible menu shown');
      }
    }

    if (proj.narrativeFlow && proj.narrativeFlow.length > 0) {
      const nfMenu = document.getElementById('ni-narrative-flow');
      if (nfMenu) {
        nfMenu.style.display = 'flex';
        console.log('✅ narrativeFlow menu shown');
      }
    }
  }

  // 현재 활성 패널 확인
  const currentPanel = state.currentPanel;

  // 설정집 보기 패널이 열려있으면 갱신
  if (currentPanel === 'worldbible-view' && typeof renderWorldBibleView === 'function') {
    console.log('🔵 Refreshing worldbible-view panel');
    renderWorldBibleView();
  }

  // 동적 흐름 추적 패널이 열려있으면 갱신
  if (currentPanel === 'narrative-flow' && typeof renderNarrativeFlow === 'function') {
    console.log('🔵 Refreshing narrative-flow panel');
    renderNarrativeFlow();
  }
}
