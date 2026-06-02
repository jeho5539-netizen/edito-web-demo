// ─── 상태 ─────────────────────────────────────────────────
const isElectron = typeof window.electronAPI !== 'undefined';
let state    = { currentPanel:'home', currentProjectId:null, projects:[], results:[], trash:[] };
let settings = {};

const TYPE_LABELS = {
  correction:   {label:'교정',        icon:'ti-text-spellcheck'},
  proofreading: {label:'교열',        icon:'ti-edit'},
  cover:        {label:'표지 디자인', icon:'ti-photo'},
  video:        {label:'홍보 영상',   icon:'ti-movie'},
  marketing:    {label:'마케팅 문구', icon:'ti-speakerphone'},
  analysis:     {label:'원고 분석',   icon:'ti-chart-bar'}
};

// ─── 스플래시 & 엔진 상태 ─────────────────────────────────
let engineReady = { ollama: false, sd: false };

function updateSplashEngine(engine, status, msg) {
  const dot   = document.getElementById('se-dot-' + engine);
  const msgEl = document.getElementById('se-msg-' + engine);
  if (dot)   { dot.className = 'se-dot ' + status; }
  if (msgEl) { msgEl.textContent = msg; }

  // 사이드바 상태
  const edDot = document.getElementById('ed-' + engine);
  if (edDot) { edDot.className = 'eng-dot ' + status; }

  if (status === 'ready') engineReady[engine] = true;

  // 진행바 업데이트
  const ready = Object.values(engineReady).filter(Boolean).length;
  const total = Object.keys(engineReady).length;
  const pct   = Math.round((ready / total) * 100);
  const fill  = document.getElementById('splash-fill');
  const smsg  = document.getElementById('splash-msg');
  if (fill) fill.style.width = (30 + pct * 0.7) + '%';
  if (smsg) smsg.textContent = msg;

  // 두 엔진 모두 최종 상태에 도달하면 스플래시 종료
  const allDone = Object.entries(engineReady).every(([k, v]) => {
    const s = document.getElementById('se-dot-' + k)?.className || '';
    return s.includes('ready') || s.includes('error') || s.includes('not-installed');
  });
  if (allDone) setTimeout(hideSplash, 1200);
}

function hideSplash() {
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');
  if (!splash) return;
  splash.classList.add('fade-out');
  if (app) app.style.display = 'flex';
  setTimeout(() => { splash.style.display = 'none'; }, 500);
}

// ─── 저장/불러오기 ────────────────────────────────────────
async function save() {
  const data = {projects:state.projects, results:state.results, trash:state.trash};
  if (isElectron) await window.electronAPI.saveData(data);
  else localStorage.setItem('edito_data', JSON.stringify(data));
}

async function load() {
  let d = null;
  if (isElectron) {
    const res = await window.electronAPI.loadData();
    if (res.success && res.data) d = res.data;
  } else {
    const raw = localStorage.getItem('edito_data');
    if (raw) d = JSON.parse(raw);
  }
  if (d) { state.projects = d.projects||[]; state.results = d.results||[]; state.trash = d.trash||[]; }
}

// ─── 패널 전환 ────────────────────────────────────────────
function sw(name) {
  console.log('🔵 sw() called:', name, 'currentProjectId:', state.currentProjectId);

  const workPanels = ['analysis','correction','proofreading','cover','video','marketing','worldbible-view','narrative-flow'];
  if (workPanels.includes(name) && !state.currentProjectId) {
    showToast('먼저 프로젝트를 선택하거나 만들어주세요'); return;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item,.project-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  console.log('🔵 Panel found:', panel ? 'YES' : 'NO', 'ID:', 'panel-' + name);

  if (panel) {
    panel.classList.add('active');
    console.log('🔵 Panel activated:', name);
  } else {
    console.error('❌ Panel NOT found:', 'panel-' + name);
  }

  state.currentPanel = name;

  const navMap = {
    analysis:'ni-analysis', correction:'ni-correction', proofreading:'ni-proofreading',
    cover:'ni-cover', video:'ni-video', marketing:'ni-marketing',
    trash:'ni-trash', settings:'ni-settings',
    'worldbible-view':'ni-worldbible',
    'narrative-flow':'ni-narrative-flow'
  };
  if (navMap[name]) document.getElementById(navMap[name])?.classList.add('active');

  // 설정집 보기 패널이면 렌더링
  if (name === 'worldbible-view') {
    console.log('🔵 Calling renderWorldBibleView...');
    if (typeof renderWorldBibleView === 'function') {
      renderWorldBibleView();
      console.log('✅ renderWorldBibleView() called');
    } else {
      console.error('❌ renderWorldBibleView is not a function!');
    }
  }

  // 동적 흐름 추적 패널이면 렌더링
  if (name === 'narrative-flow') {
    console.log('🔵 Calling renderNarrativeFlow...');
    if (typeof renderNarrativeFlow === 'function') {
      renderNarrativeFlow();
      console.log('✅ renderNarrativeFlow() called');
    } else {
      console.error('❌ renderNarrativeFlow is not a function!');
    }
  }
}

// ─── 프로젝트 ────────────────────────────────────────────
function selectProject(id) {
  state.currentProjectId = id;
  const proj = state.projects.find(p => p.id === id);
  if (!proj) return;
  // 이전 프로젝트 작업 결과 초기화
  analysisData       = null;
  correctedText      = '';
  proofRevised       = '';
  _correctionErrors  = [];
  _correctionOrigin  = '';
  const box  = document.getElementById('nav-proj-box');
  const icon = document.getElementById('nav-proj-icon');
  const name = document.getElementById('nav-proj-name');
  if (box)  box.title  = proj.title;
  if (icon) icon.className = 'ti ti-book';
  if (name) name.textContent = proj.title;
  document.querySelectorAll('.project-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));

  // 프로젝트에 설정집/동적흐름이 있으면 사이드바 메뉴 표시
  // (교열 중에는 startFirstChunk에서 이미 표시하므로 숨기지 않음)
  const currentlyVisible = document.getElementById('worldbible-label').style.display !== 'none';
  if (proj.worldBible || proj.narrativeFlow || currentlyVisible) {
    document.getElementById('worldbible-label').style.display = 'block';
    document.getElementById('ni-worldbible').style.display = 'flex';
    document.getElementById('ni-narrative-flow').style.display = 'flex';
  } else {
    document.getElementById('worldbible-label').style.display = 'none';
    document.getElementById('ni-worldbible').style.display = 'none';
    document.getElementById('ni-narrative-flow').style.display = 'none';
  }

  openProjectPanel(id);
}

function openProjectPanel(id) {
  const proj = state.projects.find(p => p.id === id);
  if (!proj) return;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-project').classList.add('active');
  state.currentPanel = 'project';
  document.getElementById('proj-title').textContent = proj.title;
  document.getElementById('proj-genre').textContent = proj.genre + ' · ' + formatDate(proj.createdAt);
  renderProjectResults(id);
}

let projectFilter = 'all';
function setProjectFilter(type) {
  projectFilter = type;
  document.querySelectorAll('.pf-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  if (state.currentProjectId) renderProjectResults(state.currentProjectId);
}

function renderProjectResults(id) {
  const wrap    = document.getElementById('project-results-wrap');
  let   results = state.results.filter(r => r.projectId === id);
  const types   = [...new Set(results.map(r => r.type))];

  const filterHtml = results.length ? `
    <div class="pf-bar">
      <button class="pf-btn ${projectFilter==='all'?'active':''}" data-type="all" onclick="setProjectFilter('all')">전체 (${results.length})</button>
      ${types.map(t => {
        const cnt = results.filter(r=>r.type===t).length;
        return `<button class="pf-btn ${projectFilter===t?'active':''}" data-type="${t}" onclick="setProjectFilter('${t}')">${TYPE_LABELS[t]?.label||t} (${cnt})</button>`;
      }).join('')}
    </div>` : '';

  if (projectFilter !== 'all') results = results.filter(r => r.type === projectFilter);

  if (results.length === 0) {
    wrap.innerHTML = filterHtml + '<div class="result-empty"><i class="ti ti-inbox" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.3"></i>아직 저장된 결과물이 없어요</div>';
    return;
  }
  wrap.innerHTML = filterHtml + results.map(r => {
    const t = TYPE_LABELS[r.type] || {label:r.type, icon:'ti-file'};
    return `<div class="result-card" id="rc-${r.id}">
      <div class="result-card-header">
        <div class="result-card-type"><i class="ti ${t.icon}"></i>${t.label}${r.autoSaved?'<span class="result-badge" style="margin-left:6px"><i class="ti ti-bolt" style="font-size:9px"></i>자동</span>':''}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="result-card-date">${formatDate(r.createdAt)}</span>
          <button class="btn btn-sec" style="padding:3px 8px;font-size:11px" onclick="deleteResult('${r.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div class="result-card-body" id="rb-${r.id}">${escapeHtml(r.content)}</div>
      <div class="result-card-footer">
        <button class="btn btn-sec" style="padding:3px 8px;font-size:11px" onclick="toggleExpand('${r.id}')"><i class="ti ti-chevron-down"></i>펼치기</button>
        <button class="btn btn-sec" style="padding:3px 8px;font-size:11px" onclick="copyResult('${r.id}')"><i class="ti ti-clipboard"></i>복사</button>
        <button class="btn btn-sec" style="padding:3px 8px;font-size:11px" onclick="exportResult('${r.id}')"><i class="ti ti-download"></i>내보내기</button>
      </div>
    </div>`;
  }).join('');
}

async function saveResult(type, content = null, auto = false) {
  if (!state.currentProjectId) { showToast('프로젝트를 먼저 선택해주세요'); return; }
  const cnt = content || getResultContent(type);
  if (!cnt?.trim()) { showToast('저장할 결과물이 없어요'); return; }
  const r = {id:Date.now().toString(), projectId:state.currentProjectId, type, content:cnt, createdAt:new Date().toISOString(), autoSaved:auto};
  state.results.unshift(r);
  await save();
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  showToast((auto?'자동저장 · ':'') + (proj?.title||'') + '에 저장됐어요 ✓');
}

async function autoSave(type, content) { await saveResult(type, content, true); }

function getResultContent(type) {
  const map = {
    correction:   () => correctedText,
    proofreading: () => proofRevised,
    analysis:     () => analysisData ? buildAnalysisText(analysisData) : '',
    marketing:    () => document.getElementById('out-marketing')?.innerText?.trim() || '',
    cover:        () => '표지 시안 생성됨',
    video:        () => '홍보 영상 생성됨'
  };
  return map[type]?.() || '';
}

async function exportResult(id) {
  const r    = state.results.find(r => r.id === id);
  if (!r) return;
  const t    = TYPE_LABELS[r.type];
  const proj = state.projects.find(p => p.id === r.projectId);
  const fname= `${proj?.title||'edito'}_${t?.label||r.type}_${formatDate(r.createdAt)}.txt`;
  if (isElectron) {
    const res = await window.electronAPI.saveFile({content:r.content, filename:fname, ext:'txt'});
    if (res.success) showToast('저장: ' + res.filePath.split('/').pop());
  } else {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(r.content);
    a.download = fname; a.click();
  }
}

async function deleteResult(id) {
  state.results = state.results.filter(r => r.id !== id);
  await save();
  if (state.currentProjectId) renderProjectResults(state.currentProjectId);
  showToast('삭제됐어요');
}

function toggleExpand(id) {
  const body = document.getElementById('rb-' + id);
  body.classList.toggle('expanded');
  const btn = body.nextElementSibling.querySelector('button');
  btn.innerHTML = body.classList.contains('expanded') ? '<i class="ti ti-chevron-up"></i>접기' : '<i class="ti ti-chevron-down"></i>펼치기';
}

function copyResult(id) {
  const r = state.results.find(r => r.id === id);
  if (r) navigator.clipboard.writeText(r.content).then(() => showToast('복사됐어요'));
}

// ─── 프로젝트 CRUD ────────────────────────────────────────
function openNewProject() {
  document.getElementById('new-proj-title').value = '';
  document.getElementById('modal-overlay').classList.add('show');
  document.getElementById('modal-new-project').classList.add('show');
  setTimeout(() => document.getElementById('new-proj-title').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
}

let isCreatingProject = false;

async function createProject() {
  if (isCreatingProject) return; // 중복 실행 방지
  isCreatingProject = true;

  try {
    const title = document.getElementById('new-proj-title').value.trim();
    const genre = document.getElementById('new-proj-genre').value;
    if (!title) {
      showToast('책 제목을 입력해주세요');
      return;
    }
    const proj = {
      id: Date.now().toString(),
      title,
      genre,
      createdAt: new Date().toISOString(),

      // 설정집: 원고의 고정 세계관 정보 (인물/장소/용어/규칙)
      worldBible: {
        characters: [],   // 인물 프로필
        places: [],       // 장소/공간
        terms: [],        // 고유 용어/개념
        worldRules: [],   // 세계관 규칙
        forbidden: [],    // 금지어/교체어
        styleRules: [],   // 문체 규칙
      },

      // 커스텀 사전: 이야기 흐름에 따라 변하는 상태 기록 (연속성 추적)
      customDict: {
        narrativeState: [],  // 배치별 상태 변화 기록
        proofHistory: [],    // 교열 이력 (몇 차, 어느 챕터)
      }
    };
    state.projects.unshift(proj);
    await save();
    closeModal();
    renderProjectList();
    renderHomeRecent();
    selectProject(proj.id);

    // 커스텀 사전 메뉴 표시
    if (typeof updateCustomDictVisibility === 'function') {
      updateCustomDictVisibility();
    }

    showToast('프로젝트 "' + title + '" 만들어졌어요');
  } finally {
    isCreatingProject = false;
  }
}

async function renameCurrentProject() {
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj) return;
  const t = prompt('새 이름을 입력하세요', proj.title);
  if (!t?.trim()) return;
  proj.title = t.trim();
  await save();
  renderProjectList();
  selectProject(proj.id);
  showToast('이름이 변경됐어요');
}

async function trashCurrentProject() {
  const idx = state.projects.findIndex(p => p.id === state.currentProjectId);
  if (idx === -1) return;
  const proj  = state.projects[idx];
  const pRes  = state.results.filter(r => r.projectId === proj.id);
  state.trash.unshift({...proj, deletedAt:new Date().toISOString(), results:pRes});
  state.projects.splice(idx, 1);
  state.results = state.results.filter(r => r.projectId !== proj.id);
  state.currentProjectId = null;
  document.getElementById('nav-proj-icon').className = 'ti ti-book-off';
  document.getElementById('nav-proj-name').textContent = '프로젝트 없음';
  await save();
  renderProjectList(); renderTrash(); updateTrashCount(); renderHomeRecent();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-home').classList.add('active');
  showToast('"' + proj.title + '" 이 휴지통으로 이동됐어요');
}

async function restoreProject(id) {
  const idx = state.trash.findIndex(t => t.id === id);
  if (idx === -1) return;
  const {results, deletedAt, ...proj} = state.trash[idx];
  state.projects.unshift(proj);
  if (results) state.results.push(...results);
  state.trash.splice(idx, 1);
  await save();
  renderProjectList(); renderTrash(); updateTrashCount();
  showToast('"' + proj.title + '" 이 복원됐어요');
}

async function permanentDelete(id) {
  state.trash = state.trash.filter(t => t.id !== id);
  await save(); renderTrash(); updateTrashCount();
  showToast('영구 삭제됐어요');
}

async function emptyTrash() {
  if (!state.trash.length) return;
  if (!confirm('휴지통을 완전히 비울까요?')) return;
  state.trash = [];
  await save(); renderTrash(); updateTrashCount();
  showToast('휴지통을 비웠어요');
}

// ─── 렌더링 ──────────────────────────────────────────────
function renderProjectList() {
  const wrap = document.getElementById('project-list');
  if (!state.projects.length) {
    wrap.innerHTML = '<div style="font-size:10px;color:var(--text3);padding:5px 14px">프로젝트가 없어요</div>';
    return;
  }
  wrap.innerHTML = state.projects.map(p => `
    <div class="project-item ${p.id===state.currentProjectId?'active':''}" data-id="${p.id}" onclick="selectProject('${p.id}')">
      <i class="ti ti-book" style="font-size:13px;flex-shrink:0"></i>
      <span class="project-item-name">${escapeHtml(p.title)}</span>
      <span class="project-item-genre">${p.genre.split('—')[0].trim()}</span>
    </div>`).join('');
}

function renderTrash() {
  const wrap = document.getElementById('trash-list-wrap');
  if (!state.trash.length) {
    wrap.innerHTML = '<div class="trash-empty"><i class="ti ti-trash" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>휴지통이 비어있어요</div>';
    return;
  }
  wrap.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="btn btn-danger" onclick="emptyTrash()"><i class="ti ti-trash"></i>휴지통 비우기</button></div>` +
    state.trash.map(t => `
      <div class="trash-card">
        <div><div class="trash-card-title">${escapeHtml(t.title)}</div>
        <div class="trash-card-meta">${t.genre} · 삭제 ${formatDate(t.deletedAt)} · 30일 후 자동 삭제</div></div>
        <div class="trash-card-btns">
          <button class="btn btn-sec" style="font-size:11px;padding:4px 9px" onclick="restoreProject('${t.id}')"><i class="ti ti-restore"></i>복원</button>
          <button class="btn btn-danger" style="font-size:11px;padding:4px 9px" onclick="permanentDelete('${t.id}')"><i class="ti ti-x"></i>완전 삭제</button>
        </div>
      </div>`).join('');
}

function updateTrashCount() {
  const el = document.getElementById('trash-count');
  if (state.trash.length > 0) { el.style.display = 'inline'; el.textContent = state.trash.length; }
  else el.style.display = 'none';
}

function renderHomeRecent() {
  const wrap = document.getElementById('home-recent');
  if (!wrap) return;
  const recent = state.projects.slice(0, 4);
  if (!recent.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div class="home-recent-title">최근 프로젝트</div>` +
    recent.map(p => {
      const cnt = state.results.filter(r => r.projectId === p.id).length;
      return `<div class="home-rec-item" onclick="selectProject('${p.id}')">
        <div style="display:flex;align-items:center;gap:8px">
          <i class="ti ti-book" style="color:var(--accent);font-size:14px"></i>
          <div>
            <div style="font-size:12px;color:var(--text)">${escapeHtml(p.title)}</div>
            <div style="font-size:10px;color:var(--text3)">${p.genre} · ${formatDate(p.createdAt)}</div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text3)">${cnt}개 결과</div>
      </div>`;
    }).join('');
}

// ─── 유틸 ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function toggleTheme() {
  const app  = document.getElementById('app');
  const isDk = app.dataset.theme !== 'light';
  app.dataset.theme = isDk ? 'light' : 'dark';
  const icon1 = document.getElementById('theme-icon');
  const icon2 = document.getElementById('theme-icon2');
  const lbl   = document.getElementById('theme-label');
  if (icon1) icon1.className = isDk ? 'ti ti-moon' : 'ti ti-sun';
  if (icon2) icon2.className = isDk ? 'ti ti-moon' : 'ti ti-sun';
  if (lbl)   lbl.textContent  = isDk ? '다크 모드' : '라이트 모드';
  localStorage.setItem('edito_theme', isDk ? 'light' : 'dark');
}

function toggleKeyVis(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.innerHTML = el.type === 'password' ? '<i class="ti ti-eye"></i>' : '<i class="ti ti-eye-off"></i>';
}

// ─── 텍스트 통계 ─────────────────────────────────────────
function getTextStats(text) {
  const chars      = text.length;
  const charsNoSp  = text.replace(/\s/g,'').length;
  const words      = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences  = text.split(/[.!?。]+/).filter(s=>s.trim()).length;
  const readingMin = Math.max(1, Math.round(words/350));
  return {chars, charsNoSp, words, sentences, readingMin};
}

function updateStat(inputId, statId) {
  const el = document.getElementById(inputId);
  const st = document.getElementById(statId);
  if (!el || !st) return;
  const s = getTextStats(el.value);
  st.textContent = `${s.chars.toLocaleString()}자 · ${s.words.toLocaleString()}단어 · 읽기 약 ${s.readingMin}분`;
}

function updateCorrStats() {
  const t = document.getElementById('inp-correction')?.value || '';
  const s = getTextStats(t);
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v.toLocaleString(); };
  set('cs-total', s.chars); set('cs-nospace', s.charsNoSp); set('cs-sentence', s.sentences);
}

// ─── 파일 드래그&드롭 ────────────────────────────────────
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e, targetId, statId) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file || !file.name.match(/\.(txt|md|text)$/i)) { showToast('.txt 파일만 지원해요'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const el = document.getElementById(targetId);
    if (el) {
      el.value = ev.target.result;
      updateStat(targetId, statId);
      if (targetId === 'inp-correction') updateCorrStats();
      showToast(file.name + ' 불러왔어요');
    }
  };
  reader.readAsText(file, 'utf-8');
}

async function importFile(targetId) {
  if (!isElectron) { showToast('파일 불러오기는 앱에서만 가능해요'); return; }
  const res = await window.electronAPI.openFileDialog();
  if (!res.success) return;
  const el = document.getElementById(targetId);
  if (el) {
    el.value = res.content;
    const statId = 'stat-' + targetId.replace('inp-','');
    updateStat(targetId, statId);
    if (targetId === 'inp-correction') updateCorrStats();
    showToast(res.name + ' 불러왔어요');
  }
}

// ─── 장르/스타일 선택 ────────────────────────────────────
function selectGenre(el) {
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

function selStyle(el) {
  document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

// ─── 출력 영역 로딩/결과 렌더 헬퍼 ──────────────────────
let progressTimers = {};

function showLoading(outId, msg) {
  const el = document.getElementById(outId);
  if (!el) return;
  el.innerHTML = `<div class="output-loading">
    <div class="loading-row"><div class="spinner"></div><span>${msg}</span></div>
    <div class="loading-bar-wrap"><div class="loading-bar" id="${outId}-bar"></div></div>
  </div>`;
  let pct = 0;
  clearInterval(progressTimers[outId]);
  progressTimers[outId] = setInterval(() => {
    pct = Math.min(pct + Math.random() * 3, 90);
    const bar = document.getElementById(outId + '-bar');
    if (bar) bar.style.width = pct + '%';
  }, 600);
}

function finishLoading(outId) {
  clearInterval(progressTimers[outId]);
  const bar = document.getElementById(outId + '-bar');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {}, 200);
}

function showError(outId, msg) {
  clearInterval(progressTimers[outId]);
  const el = document.getElementById(outId);
  if (el) el.innerHTML = `<div class="output-loading"><span style="color:var(--danger)">오류: ${escapeHtml(msg)}</span></div>`;
}

// ─── 원고 분석 ───────────────────────────────────────────
let analysisData = null;

async function startAnalysis() {
  const text = document.getElementById('inp-analysis')?.value?.trim();
  if (!text)         { showToast('원고를 입력해주세요'); return; }
  if (text.length < 100) { showToast('최소 100자 이상 입력해주세요'); return; }

  showLoading('out-analysis', 'Qwen 2.5 14B가 원고를 분석 중... (1~3분 소요)');

  try {
    const result = isElectron
      ? await window.electronAPI.analyzeManuscript({text, model: settings.ollamaModel || null})
      : {success:false, error:'Electron 앱에서만 사용 가능해요'};

    finishLoading('out-analysis');

    if (!result.success) { showError('out-analysis', result.error); return; }
    analysisData = result.data;
    renderAnalysisResult(result.data);
    if (state.currentProjectId) await autoSave('analysis', buildAnalysisText(result.data));

  } catch(e) { showError('out-analysis', e.message); }
}

function renderAnalysisResult(d) {
  const wrap = document.getElementById('out-analysis');
  if (!wrap || !d) return;

  const pC = d.market?.publishability==='상'?'bh':d.market?.publishability==='중'?'bm':'bl';
  const rC = d.style?.readability==='상'?'bh':d.style?.readability==='중'?'bm':'bl';

  wrap.innerHTML = `
    <div class="analysis-summary-block">
      <div class="asb-label"><i class="ti ti-book" style="font-size:10px"></i> 줄거리·핵심 내용</div>
      ${escapeHtml(d.summary||'')}
    </div>

    <div class="analysis-block">
      <div class="analysis-block-title"><i class="ti ti-users"></i>장르 및 독자층</div>
      <div class="arow"><span class="alabel">주 장르</span><span class="avalue">${escapeHtml(d.genre?.main||'')}</span></div>
      <div class="arow"><span class="alabel">세부 장르</span><span class="avalue">${escapeHtml(d.genre?.sub||'')}</span></div>
      <div class="arow"><span class="alabel">타겟 연령</span><span class="avalue">${escapeHtml(d.genre?.target_age||'')}</span></div>
      <div class="arow"><span class="alabel">타겟 독자</span><span class="avalue">${escapeHtml(d.genre?.target_reader||'')}</span></div>
    </div>

    <div class="analysis-block">
      <div class="analysis-block-title"><i class="ti ti-trending-up"></i>시장성 분석</div>
      <div class="arow"><span class="alabel">출판 가능성</span><span class="avalue"><span class="abadge ${pC}">${escapeHtml(d.market?.publishability||'')}</span></span></div>
      ${d.market?.score?`<div class="arow"><span class="alabel">시장성 점수</span><span class="avalue">${d.market.score}점 / 100점<div class="score-bar"><div class="score-fill" style="width:${d.market.score}%"></div></div></span></div>`:''}
      <div class="arow"><span class="alabel">강점</span><span class="avalue" style="color:#7ec99a">${escapeHtml(d.market?.strength||'')}</span></div>
      <div class="arow"><span class="alabel">약점</span><span class="avalue" style="color:#f09595">${escapeHtml(d.market?.weakness||'')}</span></div>
      <div class="arow"><span class="alabel">유사 도서</span><span class="avalue">${escapeHtml(d.market?.similar_books||'')}</span></div>
    </div>

    <div class="analysis-block">
      <div class="analysis-block-title"><i class="ti ti-layout"></i>원고 구성</div>
      <div class="arow"><span class="alabel">서사 구조</span><span class="avalue">${escapeHtml(d.structure?.narrative||'')}</span></div>
      <div class="arow"><span class="alabel">흐름 평가</span><span class="avalue">${escapeHtml(d.structure?.flow||'')}</span></div>
    </div>

    <div class="analysis-block">
      <div class="analysis-block-title"><i class="ti ti-pencil"></i>문체 분석</div>
      <div class="arow"><span class="alabel">문체 특징</span><span class="avalue">${escapeHtml(d.style?.characteristic||'')}</span></div>
      <div class="arow"><span class="alabel">가독성</span><span class="avalue"><span class="abadge ${rC}">${escapeHtml(d.style?.readability||'')}</span></span></div>
      <div class="arow"><span class="alabel">전반 톤</span><span class="avalue">${escapeHtml(d.style?.tone||'')}</span></div>
    </div>

    <div class="analysis-block">
      <div class="analysis-block-title"><i class="ti ti-edit"></i>편집 방향</div>
      <div class="arow"><span class="alabel">방향</span><span class="avalue">${escapeHtml(d.editorial?.direction||'')}</span></div>
      <div class="arow"><span class="alabel">강화할 점</span><span class="avalue"><ul class="analysis-list">${(d.editorial?.strengthen||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul></span></div>
      <div class="arow"><span class="alabel">보완할 점</span><span class="avalue"><ul class="analysis-list">${(d.editorial?.supplement||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul></span></div>
      <div class="arow"><span class="alabel">종합 의견</span><span class="avalue" style="font-style:italic">${escapeHtml(d.editorial?.overall||'')}</span></div>
    </div>`;

  // 단어 빈도 추가
  renderWordFrequency(document.getElementById('inp-analysis')?.value || '', wrap);
}

function buildAnalysisText(d) {
  if (!d) return '';
  return `[원고 분석 리포트]\n\n■ 줄거리\n${d.summary}\n\n■ 장르·독자층\n- 주 장르: ${d.genre?.main}\n- 타겟: ${d.genre?.target_reader}\n\n■ 시장성\n- 출판 가능성: ${d.market?.publishability}\n- 점수: ${d.market?.score}점\n- 강점: ${d.market?.strength}\n- 약점: ${d.market?.weakness}\n- 유사 도서: ${d.market?.similar_books}\n\n■ 원고 구성\n${d.structure?.narrative}\n\n■ 문체\n${d.style?.characteristic}\n\n■ 편집 방향\n${d.editorial?.direction}\n\n■ 강화할 점\n${(d.editorial?.strengthen||[]).map(s=>'- '+s).join('\n')}\n\n■ 보완할 점\n${(d.editorial?.supplement||[]).map(s=>'- '+s).join('\n')}\n\n■ 종합 의견\n${d.editorial?.overall}`;
}

function copyAnalysis() {
  if (!analysisData) { showToast('분석 결과가 없어요'); return; }
  navigator.clipboard.writeText(buildAnalysisText(analysisData)).then(() => showToast('복사됐어요'));
}

async function exportAnalysis() {
  if (!analysisData) { showToast('분석 결과가 없어요'); return; }
  const text  = buildAnalysisText(analysisData);
  const proj  = state.projects.find(p => p.id === state.currentProjectId);
  const fname = `${proj?.title||'edito'}_원고분석_${formatDate(new Date().toISOString())}.txt`;
  if (isElectron) {
    const res = await window.electronAPI.saveFile({content:text, filename:fname, ext:'txt'});
    if (res.success) showToast('저장: ' + res.filePath.split('/').pop());
  }
}

// 단어 빈도
function renderWordFrequency(text, container) {
  const stop = new Set(['이','가','은','는','을','를','의','에','도','로','으로','와','과','이다','하다','있다','되다','것','수','등','및','더','그','때','위','후','전','중','않','없','못','안','모든','많은','또한','그러나','하지만','따라서','그래서']);
  const freq = {};
  (text.match(/[가-힣]{2,}/g)||[]).forEach(w => { if (!stop.has(w)) freq[w] = (freq[w]||0)+1; });
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20);
  if (!top.length) return;
  const max = top[0][1];
  const div = document.createElement('div');
  div.className = 'analysis-block';
  div.innerHTML = `<div class="analysis-block-title"><i class="ti ti-chart-bar"></i>자주 쓰인 단어 (상위 20개)</div>
    <div class="wf-grid">${top.map(([w,c])=>{
      const pct = Math.round(c/max*100);
      const cls = c>=max*0.7?'wfh':c>=max*0.4?'wfm':'';
      return `<div class="wf-item"><span class="wf-word ${cls}">${escapeHtml(w)}</span><div class="wf-bar-w"><div class="wf-bar" style="width:${pct}%"></div></div><span class="wf-count">${c}</span></div>`;
    }).join('')}</div>`;
  container.appendChild(div);
}

// ─── 교정 ────────────────────────────────────────────────
let correctedText = '';
let _correctionErrors = [];
let _correctionOrigin = '';

function splitIntoChunks(text, max = 2000) {
  const paras   = text.split(/\n\n+/);
  const chunks  = [];
  let   current = '';
  for (const p of paras) {
    if ((current + '\n\n' + p).length > max && current) { chunks.push(current.trim()); current = p; }
    else current = current ? current + '\n\n' + p : p;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

async function startCorrection() {
  const text = document.getElementById('inp-correction')?.value?.trim();
  if (!text) { showToast('원고를 입력해주세요'); return; }
  if (!settings.bareunApiKey) { showToast('설정에서 바른AI API 키를 먼저 입력해주세요'); sw('settings'); return; }

  const chunks    = text.length > 2500 ? splitIntoChunks(text, 2000) : [text];
  const isChunked = chunks.length > 1;

  showLoading('out-correction', isChunked ? `원고를 ${chunks.length}개 구간으로 나눠 교정 중...` : '바른AI 교정 중...');
  document.getElementById('btn-accept-all').style.display = 'none';
  document.getElementById('cs-errors').textContent = '...';

  if (!isElectron) { showError('out-correction', 'Electron 앱에서만 사용 가능해요'); return; }

  try {
    let allErrors = [], revisedParts = [];
    for (let i = 0; i < chunks.length; i++) {
      if (isChunked) {
        const bar = document.getElementById('out-correction-bar');
        if (bar) bar.style.width = Math.round((i/chunks.length)*90) + '%';
      }
      const result = await window.electronAPI.correctText({apiKey: settings.bareunApiKey, text: chunks[i]});
      if (!result.success) { showError('out-correction', result.error); return; }
      allErrors.push(...(result.errors||[]));
      revisedParts.push(result.revised || chunks[i]);
    }

    finishLoading('out-correction');
    correctedText = revisedParts.join('\n\n');
    const merged  = {origin: text, revised: correctedText, errors: allErrors, error_count: allErrors.length};
    document.getElementById('cs-errors').textContent = allErrors.length;
    renderCorrectionResult(merged);
    if (allErrors.length) document.getElementById('btn-accept-all').style.display = 'inline-flex';
    if (state.currentProjectId) await autoSave('correction', correctedText);
    if (isChunked) showToast(`${chunks.length}개 구간 교정 완료 · ${allErrors.length}개 오류`);

  } catch(e) { showError('out-correction', e.message); }
}

function computeWordDiff(orig, revised) {
  const ow = orig.split(/(\s+)/), rw = revised.split(/(\s+)/);
  const m  = ow.length, n = rw.length;
  const dp = Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for (let i=m-1;i>=0;i--) for (let j=n-1;j>=0;j--)
    dp[i][j] = ow[i]===rw[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j],dp[i][j+1]);
  const res = []; let i=0,j=0;
  while (i<m||j<n) {
    if (i<m&&j<n&&ow[i]===rw[j]) { res.push({t:'eq',v:ow[i]}); i++;j++; }
    else if (j<n&&(i>=m||dp[i][j+1]>=dp[i+1][j])) { res.push({t:'add',v:rw[j]}); j++; }
    else { res.push({t:'del',v:ow[i]}); i++; }
  }
  return res;
}

function renderInlineDiff(orig, revised) {
  if (!orig||!revised||orig===revised) return `<div class="corr-diff">${escapeHtml(orig||'')}</div>`;
  const parts = computeWordDiff(orig, revised).map(d => {
    if (d.t==='eq')  return escapeHtml(d.v);
    if (d.t==='del') return `<span class="diff-del">${escapeHtml(d.v)}</span>`;
    if (d.t==='add') return `<span class="diff-add">${escapeHtml(d.v)}</span>`;
    return '';
  });
  return `<div class="corr-diff">${parts.join('')}</div>`;
}

function renderCorrectionResult(result) {
  const wrap = document.getElementById('out-correction');

  if (!result.errors?.length) {
    wrap.innerHTML = `
      <div class="corr-summary">
        <span class="corr-badge cb-ok"><i class="ti ti-check" style="font-size:11px"></i>오류 없음</span>
      </div>
      <div class="res-card">
        <div class="res-card-title">교정된 원고</div>
        <div class="corr-diff">${escapeHtml(result.revised||'')}</div>
      </div>`;
    return;
  }

  const errList = result.errors.map((e, i) =>
    `<div class="cerr-row" id="cerr-${i}">
      <span class="c-orig">${escapeHtml(e.original||'')}</span>
      <i class="ti ti-arrow-right" style="font-size:11px;color:var(--text3);flex-shrink:0"></i>
      <span class="c-sugg">${escapeHtml(e.corrected||'')}</span>
      <span class="c-type">${escapeHtml(e.type||'')}</span>
      <button class="btn btn-sec" style="padding:2px 7px;font-size:10px" onclick="acceptChange(${i})">✓</button>
      <button class="btn btn-sec" style="padding:2px 7px;font-size:10px" onclick="rejectChange(${i})">✗</button>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="corr-summary">
      <span class="corr-badge cb-err"><i class="ti ti-alert-triangle" style="font-size:11px"></i>${result.errors.length}개 오류</span>
      <span class="corr-badge cb-ok"><i class="ti ti-check" style="font-size:11px"></i>교정 완료</span>
    </div>
    <div class="res-card">
      <div class="res-card-title" style="justify-content:space-between">
        교정된 원고
        <button class="btn btn-sec" style="padding:2px 7px;font-size:10px" onclick="toggleDiffView()"><i class="ti ti-layout-columns"></i>하이라이트</button>
      </div>
      <div id="diff-container">${renderInlineDiff(result.origin||'', result.revised)}</div>
    </div>
    <div class="res-card">
      <div class="res-card-title">오류 목록 (${result.errors.length}개) · 수락/무시</div>
      <div class="corr-err-list">${errList}</div>
    </div>`;
}

let diffViewActive = true;
function toggleDiffView() {
  diffViewActive = !diffViewActive;
  const c = document.getElementById('diff-container');
  if (!c) return;
  c.innerHTML = diffViewActive
    ? renderInlineDiff(document.getElementById('inp-correction')?.value||'', correctedText)
    : `<div class="corr-diff">${escapeHtml(correctedText)}</div>`;
}

function acceptChange(i) {
  const row = document.getElementById('cerr-' + i);
  if (row) { row.style.opacity='0.4'; row.style.pointerEvents='none'; }
  // correctedText에 이미 반영돼 있으므로 추가 작업 없음
}

function rejectChange(i) {
  const row = document.getElementById('cerr-' + i);
  if (row) { row.style.opacity='0.35'; row.style.pointerEvents='none'; }
  const err = _correctionErrors[i];
  if (err?.corrected && err?.original && correctedText.includes(err.corrected)) {
    correctedText = correctedText.replace(err.corrected, err.original);
    const dc = document.getElementById('diff-container');
    if (dc) {
      dc.innerHTML = diffViewActive
        ? renderInlineDiff(_correctionOrigin, correctedText)
        : `<div class="corr-diff">${escapeHtml(correctedText)}</div>`;
    }
  }
}

function acceptAllCorrections() {
  document.querySelectorAll('[id^="cerr-"]').forEach(r => { r.style.opacity='0.4'; r.style.pointerEvents='none'; });
  document.getElementById('btn-accept-all').style.display = 'none';
  showToast('전체 교정 수락됐어요');
}

function copyCorrected() {
  if (!correctedText) { showToast('교정 결과가 없어요'); return; }
  navigator.clipboard.writeText(correctedText).then(() => showToast('교정본 복사됐어요'));
}

// ─── 마케팅 문구 생성 ─────────────────────────────────────
async function startMarketingGeneration() {
  const title = document.getElementById('mkt-title')?.value?.trim() || '';
  const summary = document.getElementById('mkt-summary')?.value?.trim() || '';

  if (!title || !summary) {
    showToast('책 제목과 핵심 내용을 입력해주세요');
    return;
  }

  const outEl = document.getElementById('out-marketing');
  showLoading('out-marketing', '마케팅 문구 생성 중... (1~2분 소요)');

  const taskId = createProgressTask('마케팅 문구', 'marketing');
  updateProgressTask(taskId, { progress: 30, detail: '4종 생성 중...' });

  try {
    const result = isElectron
      ? await window.electronAPI.generateMarketing({
          title,
          author: document.getElementById('mkt-author')?.value?.trim() || '',
          genre: document.getElementById('mkt-genre')?.value?.trim() || '',
          target: document.getElementById('mkt-target')?.value?.trim() || '',
          summary,
          outputTypes: ['보도자료', '서점 소개문', '제목 후보', 'SNS 카피']
        })
      : null;

    finishLoading('out-marketing');

    if (!result || !result.success) {
      completeProgressTask(taskId, false);
      showError('out-marketing', result?.error || '생성 실패');
      return;
    }

    renderMarketingResult(result.results);
    completeProgressTask(taskId, true);

  } catch (e) {
    completeProgressTask(taskId, false);
    showError('out-marketing', e.message);
  }
}

function renderMarketingResult(results) {
  const wrap = document.getElementById('out-marketing');
  let html = '';

  for (const [type, content] of Object.entries(results)) {
    html += `
      <div class="res-card">
        <div class="res-card-title"><i class="ti ti-text"></i>${escapeHtml(type)}</div>
        <pre style="white-space:pre-wrap;line-height:1.8;font-size:12px">${escapeHtml(content)}</pre>
      </div>
    `;
  }

  wrap.innerHTML = html;
}

// ─── 원고 분석 ───────────────────────────────────────────
async function startAnalysis() {
  const text = document.getElementById('inp-analysis')?.value?.trim();
  if (!text) { showToast('분석할 원고를 입력해주세요'); return; }
  if (text.length < 100) { showToast('최소 100자 이상 입력해주세요'); return; }

  const outEl = document.getElementById('out-analysis');
  showLoading('out-analysis', 'LLM이 원고를 분석 중입니다... (1~2분 소요)');

  const taskId = createProgressTask('원고 분석', 'analysis');
  updateProgressTask(taskId, { progress: 30, detail: 'LLM 분석 중...' });

  try {
    const result = isElectron
      ? await window.electronAPI.analyzeManuscript({ text: text.substring(0, 5000) })
      : null;

    finishLoading('out-analysis');

    if (!result || !result.success) {
      completeProgressTask(taskId, false);
      showError('out-analysis', result?.error || '분석 실패');
      return;
    }

    renderAnalysisResult(result.data);

    if (state.currentProjectId) {
      await autoSave('analysis', `[원고 분석]\n\n${JSON.stringify(result.data, null, 2)}`);
    }

    completeProgressTask(taskId, true);

  } catch (e) {
    completeProgressTask(taskId, false);
    showError('out-analysis', e.message);
  }
}

function renderAnalysisResult(data) {
  const wrap = document.getElementById('out-analysis');
  wrap.innerHTML = `
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-book"></i>요약</div>
      <p style="line-height:1.8">${escapeHtml(data.summary || '')}</p>
    </div>
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-tag"></i>장르 분석</div>
      <p><strong>주 장르:</strong> ${escapeHtml(data.genre?.main || '')}</p>
      <p><strong>세부:</strong> ${escapeHtml(data.genre?.sub || '')}</p>
      <p><strong>타겟:</strong> ${escapeHtml(data.genre?.target_reader || '')}</p>
    </div>
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-chart-line"></i>시장성 평가</div>
      <p><strong>출판 가능성:</strong> ${escapeHtml(data.market?.publishability || '')}</p>
      <p><strong>강점:</strong> ${escapeHtml(data.market?.strength || '')}</p>
      <p><strong>약점:</strong> ${escapeHtml(data.market?.weakness || '')}</p>
    </div>
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-edit"></i>편집 방향</div>
      <p>${escapeHtml(data.editorial?.overall || '')}</p>
    </div>
  `;
}

// ─── 교정 시작 함수 ──────────────────────────────────────
async function startCorrection() {
  const text = document.getElementById('inp-correction')?.value?.trim();
  if (!text) { showToast('원고를 입력해주세요'); return; }

  const apiKey = settings.bareunApiKey;
  if (!apiKey) {
    showToast('설정에서 바른AI API 키를 입력해주세요');
    sw('settings');
    return;
  }

  const progressBar = document.getElementById('progress-correction');
  const progressFill = progressBar?.querySelector('.progress-fill');
  const progressText = progressBar?.querySelector('.progress-text');
  const outEl = document.getElementById('out-correction');

  // 진행률 바 표시
  if (progressBar) progressBar.style.display = 'flex';
  outEl.innerHTML = '<div class="output-empty">교정 진행 중...</div>';

  // 진행률 사이드바 작업 생성
  const taskId = createProgressTask('교정', 'correction');

  // 진행률 이벤트 리스너
  if (isElectron) {
    window.electronAPI.onCorrectionProgress((progress) => {
      if (!progressFill || !progressText) return;
      const { current, total } = progress;
      const percent = (current / total) * 100;
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `교정 중... (${current}/${total} 청크)`;

      // 사이드바 업데이트
      updateProgressTask(taskId, {
        current,
        total,
        progress: percent,
        detail: `${current}/${total} 청크`
      });
    });
  }

  try {
    if (progressText) progressText.textContent = '교정 시작...';
    if (progressFill) progressFill.style.width = '5%';

    const result = isElectron
      ? await window.electronAPI.correctText({ apiKey, text })
      : null;

    if (progressBar) progressBar.style.display = 'none';

    if (!result || !result.success) {
      completeProgressTask(taskId, false);
      showError('out-correction', result?.error || '교정 실패');
      return;
    }

    // 결과 렌더링
    correctedText = result.revised || text;
    _correctionErrors = result.errors || [];
    _correctionOrigin = text;

    renderCorrectionResult(result);

    // 자동 저장
    if (state.currentProjectId) {
      await autoSave('correction', `[교정]\n\n${result.error_count || 0}개 오류 수정\n\n교정본:\n${result.revised}`);
    }

    completeProgressTask(taskId, true);

  } catch (e) {
    if (progressBar) progressBar.style.display = 'none';
    completeProgressTask(taskId, false);
    showError('out-correction', e.message);
  }
}

// ─── 교열 ────────────────────────────────────────────────
let proofRevised = '';
let _lastNarrativeState = [];   // 커스텀 사전: 상태 변화
let _lastWorldBible     = [];   // 설정집: 고정 세계관 정보

async function startProofreading() {
  const text = document.getElementById('inp-proofreading')?.value?.trim();
  if (!text) { showToast('원고를 입력해주세요'); return; }

  const genre = document.querySelector('.genre-chip.on')?.textContent || '문학·소설';
  const userRequests = document.getElementById('inp-proof-requests')?.value?.trim() || '';

  // 커스텀 사전 프롬프트 생성
  const customDictPrompt = typeof buildCustomDictPrompt === 'function' ? buildCustomDictPrompt() : '';

  const progressBar = document.getElementById('progress-proofreading');
  const progressFill = progressBar?.querySelector('.progress-fill');
  const progressText = progressBar?.querySelector('.progress-text');
  const outEl = document.getElementById('out-proofreading');
  const worldBiblePanel = document.getElementById('world-bible-panel');
  const bibleList       = document.getElementById('bible-list');
  const narrativePanel  = document.getElementById('narrative-state-panel');
  const narrativeList   = document.getElementById('narrative-state-list');
  const sameProjTip     = document.getElementById('same-project-tip');

  // 패널 초기화
  if (worldBiblePanel) worldBiblePanel.style.display = 'none';
  if (bibleList)       bibleList.innerHTML = '';
  if (narrativePanel)  narrativePanel.style.display = 'none';
  if (narrativeList)   narrativeList.innerHTML = '';
  if (sameProjTip)     sameProjTip.style.display = 'none';
  _lastNarrativeState = [];
  _lastWorldBible = [];

  if (progressBar) progressBar.style.display = 'flex';
  outEl.innerHTML = '<div class="output-empty">교열 진행 중...</div>';

  const taskId = createProgressTask('교열', 'proofreading');

  if (isElectron) {
    // 진행률 리스너
    window.electronAPI.onProofreadingProgress((progress) => {
      if (!progressFill || !progressText) return;
      const { current, total } = progress;
      const percent = (current / total) * 100;
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `교열 중... (${current}/${total} 청크)`;
      updateProgressTask(taskId, { current, total, progress: percent, detail: `${current}/${total} 청크` });
    });

    // 설정집 + 커스텀 사전 실시간 업데이트 리스너
    window.electronAPI.onProofreadingStateUpdate((stateData) => {
      // 설정집 업데이트
      if (stateData?.bible_updates?.length) {
        if (worldBiblePanel) worldBiblePanel.style.display = 'block';
        stateData.bible_updates.forEach(update => {
          _lastWorldBible.push(update);
          if (bibleList) bibleList.appendChild(makeBibleItem(update));
        });
        const badge = document.getElementById('bible-count-badge');
        if (badge) badge.textContent = `(${_lastWorldBible.length}개 발견)`;
      }

      // 커스텀 사전 업데이트
      if (stateData?.updates?.length) {
        if (narrativePanel) narrativePanel.style.display = 'block';
        stateData.updates.forEach(update => {
          _lastNarrativeState.push(update);
          if (narrativeList) narrativeList.appendChild(makeStateItem(update, stateData.chunk));
        });
        const badge = document.getElementById('narrative-count-badge');
        if (badge) badge.textContent = `(${_lastNarrativeState.length}개 발견)`;
      }

      updateSaveCounts();
      if (sameProjTip) sameProjTip.style.display = 'block';
    });
  }

  try {
    if (progressText) progressText.textContent = '교열 시작...';
    if (progressFill) progressFill.style.width = '5%';

    let result;
    if (isElectron) {
      result = await window.electronAPI.proofreadText({
        genre, text, userRequests,
        customDictPrompt,
        model: settings.ollamaModel || null
      });
    } else {
      const res = await fetch('http://localhost:11434/api/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'exaone3.0:7.8b', prompt:`당신은 ${genre} 전문 교열자입니다. 원고를 교열하고 JSON으로만 응답: {"summary":"총평","issues":[{"original":"원문","suggestion":"제안","reason":"이유"}],"revised":"교열본","state_updates":[]}\n\n원고:\n${text}`, stream:false, options:{temperature:0.3,num_predict:4096}})
      });
      const data = await res.json();
      const raw = data.response || '';
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}') + 1;
      result = s >= 0 && e > s ? { success: true, ...JSON.parse(raw.slice(s, e)) } : { success: false, error: '파싱 실패' };
    }

    if (progressBar) progressBar.style.display = 'none';

    if (!result.success) {
      completeProgressTask(taskId, false);
      showError('out-proofreading', result.error);
      return;
    }

    proofRevised = result.revised || text;
    renderProofResult(result, genre);

    // 최종 결과 표시 (실시간으로 못 받은 경우 보완)
    if (result.world_bible?.length) {
      _lastWorldBible = result.world_bible;
      if (worldBiblePanel) worldBiblePanel.style.display = 'block';
      if (bibleList && bibleList.children.length === 0) {
        result.world_bible.forEach(u => bibleList.appendChild(makeBibleItem(u)));
      }
      const badge = document.getElementById('bible-count-badge');
      if (badge) badge.textContent = `(${result.world_bible.length}개 발견)`;
    }

    if (result.narrative_state?.length) {
      _lastNarrativeState = result.narrative_state;
      if (narrativePanel) narrativePanel.style.display = 'block';
      if (narrativeList && narrativeList.children.length === 0) {
        result.narrative_state.forEach(u => narrativeList.appendChild(makeStateItem(u, null)));
      }
      const badge = document.getElementById('narrative-count-badge');
      if (badge) badge.textContent = `(${result.narrative_state.length}개 발견)`;
    }

    if (result.world_bible?.length || result.narrative_state?.length) {
      if (sameProjTip) sameProjTip.style.display = 'block';
      updateSaveCounts();
    }

    if (state.currentProjectId) await autoSave('proofreading', `[${genre} 교열]\n\n총평: ${result.summary}\n\n교열본:\n${result.revised}`);
    completeProgressTask(taskId, true);

  } catch(e) {
    if (progressBar) progressBar.style.display = 'none';
    completeProgressTask(taskId, false);
    showError('out-proofreading', e.message);
  }
}

const CATEGORY_STYLE = {
  '인물':   { color: '#7eb8f7', icon: 'ti-user' },
  '날씨':   { color: '#74c0fc', icon: 'ti-cloud' },
  '물건':   { color: '#b197fc', icon: 'ti-package' },
  '분위기': { color: '#ffa94d', icon: 'ti-mood-happy' },
  '장소':   { color: '#63e6be', icon: 'ti-map-pin' },
  '관계':   { color: '#f783ac', icon: 'ti-users' },
  '용어':   { color: '#a9e34b', icon: 'ti-book' },
  '사건':   { color: '#c9a96e', icon: 'ti-bolt' },
  '모순':   { color: '#ff6b6b', icon: 'ti-alert-triangle' },
};

// 서사 상태 항목 DOM 생성 (체크박스 + 충돌 경고 포함)
function makeStateItem(update, chunkNum) {
  const parts    = update.split('|').map(s => s.trim());
  const category = parts[0] || '';
  const target   = parts[1] || '';
  const content  = parts[2] || update;
  const style    = CATEGORY_STYLE[category] || { color: '#52b788', icon: 'ti-plus' };

  // 기존 설정집과 충돌 감지
  const conflict = detectConflict(category, target);
  const conflictHtml = conflict
    ? `<div style="font-size:10px;color:#ffa94d;margin-top:3px"><i class="ti ti-alert-triangle"></i> 기존 설정과 충돌: "${escapeHtml(conflict)}" → 저장 시 기존 항목이 구 상태로 처리됩니다</div>`
    : '';

  const item = document.createElement('div');
  item.className = 'review-item narrative-review-item';
  item.dataset.update = update;
  item.style.cssText = `background:#2a2826;padding:8px 12px;border-radius:6px;border-left:3px solid ${style.color};font-size:12px;color:#e8e6e3;display:flex;align-items:start;gap:10px${conflict ? ';border:1px solid #ffa94d44' : ''}`;
  item.innerHTML = `
    <input type="checkbox" checked style="margin-top:3px;flex-shrink:0;accent-color:#c9a96e;cursor:pointer" onchange="updateNarrativeSaveCount()">
    <i class="ti ${style.icon}" style="color:${style.color};margin-top:2px;flex-shrink:0"></i>
    <div style="flex:1">
      <span style="color:${style.color};font-weight:600;font-size:11px">${escapeHtml(category)}</span>
      ${target ? `<span style="color:var(--text3);font-size:10px;margin-left:4px">· ${escapeHtml(target)}</span>` : ''}
      ${chunkNum ? `<span style="color:var(--text3);font-size:10px;margin-left:4px">[청크${chunkNum}]</span>` : ''}
      <div style="margin-top:2px;color:#e8e6e3">${escapeHtml(content)}</div>
      ${conflictHtml}
    </div>`;
  return item;
}

// 설정집(World Bible) 항목 DOM 생성
function makeBibleItem(update) {
  const BIBLE_STYLE = {
    '인물': { color: '#7eb8f7', icon: 'ti-user' },
    '장소': { color: '#63e6be', icon: 'ti-map-pin' },
    '용어': { color: '#a9e34b', icon: 'ti-book' },
    '규칙': { color: '#ffa94d', icon: 'ti-gavel' },
  };

  const parts    = update.split('|').map(s => s.trim());
  const category = parts[0] || '';
  const target   = parts[1] || '';
  const content  = parts[2] || update;
  const style    = BIBLE_STYLE[category] || { color: '#7eb8f7', icon: 'ti-star' };

  const item = document.createElement('div');
  item.className = 'review-item bible-review-item';
  item.dataset.update = update;
  item.style.cssText = `background:#2a2826;padding:8px 12px;border-radius:6px;border-left:3px solid ${style.color};font-size:12px;color:#e8e6e3;display:flex;align-items:start;gap:10px`;
  item.innerHTML = `
    <input type="checkbox" checked style="margin-top:3px;flex-shrink:0;accent-color:#7eb8f7;cursor:pointer" onchange="updateSaveCounts()">
    <i class="ti ${style.icon}" style="color:${style.color};margin-top:2px;flex-shrink:0"></i>
    <div style="flex:1">
      <span style="color:${style.color};font-weight:600;font-size:11px">${escapeHtml(category)}</span>
      ${target ? `<span style="color:var(--text3);font-size:10px;margin-left:4px">· ${escapeHtml(target)}</span>` : ''}
      <div style="margin-top:2px;color:#e8e6e3">${escapeHtml(content)}</div>
    </div>`;
  return item;
}

// 설정집에 저장
async function saveWorldBible() {
  if (!state.currentProjectId) { showToast('프로젝트를 선택해주세요'); return; }

  const checkedItems = [];
  document.querySelectorAll('#bible-list .review-item input[type=checkbox]:checked').forEach(cb => {
    const item = cb.closest('.review-item');
    if (item?.dataset.update) checkedItems.push(item.dataset.update);
  });

  if (!checkedItems.length) { showToast('저장할 항목을 선택해주세요'); return; }

  const added = await appendWorldBible(checkedItems);
  const hint = document.getElementById('bible-save-hint');
  if (hint) hint.innerHTML = `<span style="color:#52b788"><i class="ti ti-check"></i> ${added}개 항목이 설정집에 저장됐습니다</span>`;
  showToast(`${added}개 항목이 설정집에 저장됐어요`);
}

// 기존 설정집에서 같은 카테고리+대상의 기존 내용 반환
function detectConflict(category, target) {
  if (!category || !target || !state.currentProjectId) return null;
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj?.customDict?.narrativeState) return null;

  const existing = proj.customDict.narrativeState.find(e => {
    if (e.outdated) return false;
    const p = e.text.split('|').map(s => s.trim());
    return p[0] === category && p[1] === target;
  });
  return existing ? (existing.text.split('|')[2] || '').trim() : null;
}

// 저장 카운트 업데이트
function updateNarrativeSaveCount() {
  const checked = document.querySelectorAll('.narrative-review-item input[type=checkbox]:checked').length;
  const hint = document.getElementById('narrative-save-hint');
  if (hint) hint.textContent = `${checked}개 항목을 설정집에 추가합니다`;
}

// 전체 선택/해제 (범용)
function toggleAllCheck(containerId, val) {
  document.querySelectorAll(`#${containerId} .review-item input[type=checkbox]`).forEach(cb => cb.checked = val);
  updateSaveCounts();
}
function toggleAllNarrativeCheck(val) { toggleAllCheck('narrative-state-list', val); }

// 저장 카운트 업데이트 (설정집 + 커스텀 사전)
function updateSaveCounts() {
  updateNarrativeSaveCount();
  const bibleChecked = document.querySelectorAll('#bible-list .review-item input[type=checkbox]:checked').length;
  const bibleHint = document.getElementById('bible-save-hint');
  if (bibleHint) bibleHint.textContent = `${bibleChecked}개 항목을 설정집에 추가합니다`;
}

// 체크된 항목만 설정집에 저장
async function saveNarrativeToDict() {
  if (!state.currentProjectId) { showToast('프로젝트를 선택해주세요'); return; }

  // 체크된 항목만 수집
  const checkedItems = [];
  document.querySelectorAll('.narrative-review-item').forEach(item => {
    const cb = item.querySelector('input[type=checkbox]');
    if (cb?.checked && item.dataset.update) {
      checkedItems.push(item.dataset.update);
    }
  });

  if (!checkedItems.length) { showToast('저장할 항목을 선택해주세요'); return; }

  // 배치 레이블 (몇 차 교열인지)
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  const existingBatches = proj?.customDict?.narrativeState
    ? new Set(proj.customDict.narrativeState.filter(e => !e.outdated).map(e => e.batch)).size
    : 0;
  const batchLabel = `${existingBatches + 1}차 교열 (${new Date().toLocaleDateString('ko-KR')})`;

  const added = await appendNarrativeState(checkedItems, batchLabel);

  // 저장 완료 후 버튼 상태 변경
  const hint = document.getElementById('narrative-save-hint');
  if (hint) hint.innerHTML = `<span style="color:#52b788"><i class="ti ti-check"></i> ${added}개 항목이 설정집에 저장됐습니다 (${batchLabel})</span>`;

  showToast(`${added}개 항목이 설정집에 저장됐어요`);
}

function renderProofResult(result, genre) {
  const issues = result.issues || [];
  const wrap   = document.getElementById('out-proofreading');

  const issueHtml = issues.length === 0
    ? '<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px">개선 제안이 없어요</div>'
    : issues.map(iss => `
        <div class="proof-issue">
          <div class="proof-orig">${escapeHtml(iss.original||'')}</div>
          <div class="proof-arrow">→</div>
          <div class="proof-sugg">${escapeHtml(iss.suggestion||'')}</div>
          <div class="proof-reason">${escapeHtml(iss.reason||'')}</div>
        </div>`).join('');

  wrap.innerHTML = `
    <div class="proof-summary-card">
      <div class="proof-summary-label"><i class="ti ti-message-circle" style="font-size:10px"></i> ${genre} 교열 총평</div>
      ${escapeHtml(result.summary||'')}
    </div>
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-list-check"></i>개선 제안 (${issues.length}건)</div>
      ${issueHtml}
    </div>
    <div class="res-card">
      <div class="res-card-title"><i class="ti ti-edit"></i>교열된 원고</div>
      <div class="proof-revised-text">${escapeHtml(result.revised||'')}</div>
    </div>`;
}

function copyProofResult() {
  if (!proofRevised) { showToast('교열 결과가 없어요'); return; }
  navigator.clipboard.writeText(proofRevised).then(() => showToast('교열본 복사됐어요'));
}

async function exportProofResult() {
  if (!proofRevised) { showToast('교열 결과가 없어요'); return; }
  const genre = document.querySelector('.genre-chip.on')?.textContent || '교열';
  const proj  = state.projects.find(p => p.id === state.currentProjectId);
  const fname = `${proj?.title||'edito'}_${genre}_교열_${formatDate(new Date().toISOString())}.md`;
  const summary = document.querySelector('.proof-summary-card')?.innerText?.trim() || '';
  const content = `# ${proj?.title||''} — ${genre} 교열 결과\n\n## 총평\n${summary}\n\n## 교열된 원고\n\n${proofRevised}`;
  if (isElectron) {
    const res = await window.electronAPI.saveFile({content, filename:fname, ext:'md'});
    if (res.success) showToast('저장: ' + res.filePath.split('/').pop());
  }
}

// ─── 통합 편집 (교정→교열) ────────────────────────────────
let fullEditResults = { original: '', corrected: '', proofread: '' };

function selectGenreFull(el) {
  document.querySelectorAll('.genre-chip-full').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

async function startFullEdit() {
  const text = document.getElementById('inp-full-edit')?.value?.trim();
  if (!text) { showToast('원고를 입력해주세요'); return; }

  const genre = document.querySelector('.genre-chip-full.on')?.textContent || '문학·소설';
  const userRequests = document.getElementById('inp-full-requests')?.value?.trim() || '';
  const apiKey = settings.bareunApiKey;

  if (!apiKey) {
    showToast('설정에서 바른AI API 키를 입력해주세요');
    sw('settings');
    return;
  }

  const progressBar = document.getElementById('progress-full-edit');
  const progressFill = progressBar?.querySelector('.progress-fill');
  const progressText = progressBar?.querySelector('.progress-text');

  progressBar.style.display = 'flex';
  const outEl = document.getElementById('out-full-edit');
  outEl.innerHTML = '<div class="output-empty">편집 진행 중...</div>';

  // 진행률 사이드바 작업 생성
  const taskId = createProgressTask(`통합 편집 (${genre})`, 'full_edit');

  // 진행률 이벤트 리스너 설정
  if (isElectron) {
    window.electronAPI.onFullEditProgress((progress) => {
      if (!progressFill || !progressText) return;

      const { stage, current, total } = progress;

      if (stage === 'correction') {
        const percent = (current / total) * 50; // 0-50%
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `1/2 교정 중... (${current}/${total} 청크)`;

        // 사이드바 업데이트
        updateProgressTask(taskId, {
          progress: percent,
          detail: `1/2 교정 (${current}/${total})`
        });
      } else if (stage === 'proofreading') {
        const percent = 50 + (current / total) * 50; // 50-100%
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `2/2 교열 중... (${current}/${total} 청크)`;

        // 사이드바 업데이트
        updateProgressTask(taskId, {
          progress: percent,
          detail: `2/2 교열 (${current}/${total})`
        });
      }
    });
  }

  try {
    // 통합 편집 API 호출
    if (progressText) progressText.textContent = '편집 시작...';
    if (progressFill) progressFill.style.width = '5%';

    const result = isElectron
      ? await window.electronAPI.fullEdit({ apiKey, genre, text, userRequests })
      : null;

    if (!result || !result.success) {
      throw new Error(result?.error || '편집 실패');
    }

    // 진행률은 이미 이벤트로 처리됨
    if (progressFill) progressFill.style.width = '100%';
    if (progressText) progressText.textContent = '완료!';

    // 결과 저장
    fullEditResults = {
      original: result.original || text,
      corrected: result.corrected || text,
      proofread: result.proofread || text,
      correctionErrorCount: result.correctionErrorCount || 0,
      proofIssues: result.proofIssues || []
    };

    // 3단 비교 뷰 렌더링
    setTimeout(() => {
      progressBar.style.display = 'none';
      renderThreeWayComparison(fullEditResults);
    }, 500);

    // 자동 저장
    if (state.currentProjectId) {
      await autoSave('full-edit', `[통합 편집 - ${genre}]\n\n교정: ${result.correctionErrorCount}개 수정\n교열: ${result.proofIssues?.length || 0}건 개선\n\n최종본:\n${result.proofread}`);
    }

    completeProgressTask(taskId, true);

  } catch (e) {
    progressBar.style.display = 'none';
    completeProgressTask(taskId, false);
    showError('out-full-edit', e.message);
  }
}

function renderThreeWayComparison(results) {
  const wrap = document.getElementById('out-full-edit');

  wrap.innerHTML = `
    <div class="three-way-comparison">
      <div class="compare-column">
        <div class="compare-header">
          <h4>원본</h4>
          <span class="badge">원고</span>
        </div>
        <div class="compare-content original">
          ${escapeHtml(results.original)}
        </div>
      </div>

      <div class="compare-column">
        <div class="compare-header">
          <h4>교정본</h4>
          <span class="badge badge-correction">
            ${results.correctionErrorCount}개 오류 수정
          </span>
        </div>
        <div class="compare-content corrected">
          ${escapeHtml(results.corrected)}
        </div>
      </div>

      <div class="compare-column">
        <div class="compare-header">
          <h4>교열본</h4>
          <span class="badge badge-proofread">
            ${results.proofIssues.length}건 개선 (권장)
          </span>
        </div>
        <div class="compare-content proofread">
          ${escapeHtml(results.proofread)}
        </div>
      </div>
    </div>

    <div class="comparison-actions">
      <button class="btn btn-sec" onclick="useVersion('original')">
        원본 사용
      </button>
      <button class="btn btn-sec" onclick="useVersion('corrected')">
        교정본 사용
      </button>
      <button class="btn btn-run" onclick="useVersion('proofread')">
        교열본 사용 (권장)
      </button>
    </div>
  `;
}

function useVersion(version) {
  const text = fullEditResults[version];
  if (!text) {
    showToast('해당 버전이 없습니다');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    const labels = { original: '원본', corrected: '교정본', proofread: '교열본' };
    showToast(`${labels[version]} 복사됐어요`);
  });
}

// ─── 패널 전환 ───────────────────────────────────────────
function sw(panelName) {
  const panels = ['home', 'project', 'analysis', 'correction', 'proofreading', 'full-edit', 'cover', 'video', 'marketing', 'trash', 'settings'];

  if (!panels.includes(panelName)) {
    console.warn('Unknown panel:', panelName);
    return;
  }

  // 모든 패널 비활성화
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  // 모든 nav 아이템 비활성화
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // 선택된 패널 활성화
  const targetPanel = document.getElementById(`panel-${panelName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // 선택된 nav 아이템 활성화
  const targetNav = document.getElementById(`ni-${panelName}`);
  if (targetNav) {
    targetNav.classList.add('active');
  }

  state.currentPanel = panelName;
}

// ─── 마케팅 문구 ─────────────────────────────────────────
async function startMarketingGeneration() {
  const title   = document.getElementById('mkt-title')?.value?.trim()   || '';
  const author  = document.getElementById('mkt-author')?.value?.trim()  || '';
  const genre   = document.getElementById('mkt-genre')?.value?.trim()   || '';
  const target  = document.getElementById('mkt-target')?.value?.trim()  || '';
  const summary = document.getElementById('mkt-summary')?.value?.trim() || '';

  if (!title)   { showToast('책 제목을 입력해주세요'); return; }
  if (!summary) { showToast('핵심 내용 요약을 입력해주세요'); return; }

  const selected = [];
  document.querySelectorAll('#panel-marketing .type-chip.on').forEach(el => {
    selected.push(el.textContent.trim().replace(/[^ -~가-힣]/g,'').trim());
  });
  if (!selected.length) { showToast('생성할 문구를 하나 이상 선택해주세요'); return; }

  showLoading('out-marketing', `Qwen 2.5 14B가 ${selected.join(', ')} 생성 중...`);

  try {
    const result = isElectron
      ? await window.electronAPI.generateMarketing({title, author, genre, target, summary, outputTypes:selected, model: settings.ollamaModel || null})
      : {success:false, error:'Electron 앱에서만 사용 가능해요'};

    finishLoading('out-marketing');

    if (!result.success) { showError('out-marketing', result.error); return; }
    renderMarketingResult(result.results);
    const allText = Object.entries(result.results).map(([k,v])=>`[${k}]\n${v}`).join('\n\n---\n\n');
    if (state.currentProjectId) await autoSave('marketing', allText);

  } catch(e) { showError('out-marketing', e.message); }
}

function renderMarketingResult(results) {
  const ICONS = {'보도자료':'ti-news','서점 소개문':'ti-book','제목 후보':'ti-typography','SNS 카피':'ti-brand-instagram'};
  const wrap  = document.getElementById('out-marketing');
  wrap.innerHTML = Object.entries(results).map(([type, content]) => `
    <div class="mkt-block">
      <div class="mkt-block-title">
        <i class="ti ${ICONS[type]||'ti-file'}"></i>${type}
        <button class="btn btn-sec" style="padding:2px 8px;font-size:10px;margin-left:auto"
          onclick="navigator.clipboard.writeText(${JSON.stringify(content)}).then(()=>showToast('복사됐어요'))">
          <i class="ti ti-clipboard"></i>복사
        </button>
      </div>
      <div class="res-card-body" style="max-height:none;white-space:pre-wrap;font-size:12px;color:var(--text2);line-height:1.8">${escapeHtml(content)}</div>
    </div>`).join('');
}

function copyAllMarketing() {
  const wrap = document.getElementById('out-marketing');
  if (!wrap?.textContent?.trim()) { showToast('생성된 문구가 없어요'); return; }
  const texts = [];
  wrap.querySelectorAll('.mkt-block').forEach(el => {
    const title   = el.querySelector('.mkt-block-title')?.textContent?.replace(/복사/,'').trim()||'';
    const content = el.querySelector('.res-card-body')?.textContent?.trim()||'';
    if (content) texts.push(`[${title}]\n${content}`);
  });
  navigator.clipboard.writeText(texts.join('\n\n---\n\n')).then(() => showToast('전체 복사됐어요'));
}

// ─── 표지 디자인 ─────────────────────────────────────────
async function startCoverGeneration() {
  const genre  = document.getElementById('cover-genre')?.value       || '소설 — 문학';
  const mood   = document.getElementById('cover-mood')?.value?.trim() || '';
  const bg     = document.getElementById('cover-bg')?.value?.trim()   || '';
  const char   = document.getElementById('cover-char')?.value?.trim() || '';
  const props  = document.getElementById('cover-props')?.value?.trim()|| '';
  const style  = document.querySelector('.style-chip.on')?.textContent || '미니멀·여백';

  showLoading('out-cover', 'Stable Diffusion이 표지 시안 3종 생성 중... (1~3분 소요)');

  try {
    const result = isElectron
      ? await window.electronAPI.generateCover({genre, mood, background:bg, character:char, props, style})
      : {success:false, error:'Electron 앱에서만 사용 가능해요'};

    finishLoading('out-cover');

    if (!result.success) { showError('out-cover', result.error); return; }

    const wrap = document.getElementById('out-cover');
    const imgs = (result.images||[]).map((p, i) => `
      <div class="cover-item">
        <img src="file://${p}" alt="시안 ${i+1}" onerror="this.parentElement.style.background='var(--bg4)'">
        <div class="cover-item-label">시안 ${i+1}</div>
      </div>`).join('');

    wrap.innerHTML = `
      <div class="cover-grid">${imgs}</div>
      <div class="cover-prompt-box"><div class="cover-prompt-label">생성 프롬프트</div>${escapeHtml(result.prompt||'')}</div>`;

    if (state.currentProjectId) await autoSave('cover', `[표지 디자인]\n스타일: ${style}\n장르: ${genre}\n파일: ${(result.images||[]).join(', ')}`);

  } catch(e) { showError('out-cover', e.message); }
}

// ─── 홍보 영상 ───────────────────────────────────────────
let sceneCount = 3;

function addScene() {
  if (sceneCount >= 5) return;
  sceneCount++;
  const s = document.querySelector(`.scene-item[data-n="${sceneCount}"]`);
  if (s) s.style.display = 'block';
  if (sceneCount >= 5) document.getElementById('add-scene-btn').style.display = 'none';
}

function removeScene(n) {
  const s = document.querySelector(`.scene-item[data-n="${n}"]`);
  if (s) { s.style.display = 'none'; s.querySelector('textarea').value = ''; }
  sceneCount = n - 1;
  document.getElementById('add-scene-btn').style.display = 'inline-flex';
}

async function startVideoGeneration() {
  const title    = document.getElementById('vid-title')?.value?.trim();
  const duration = document.getElementById('vid-duration')?.value;
  const bgm      = document.getElementById('vid-bgm')?.value;
  const scenes   = [];
  document.querySelectorAll('.scene-item:not([style*="display: none"]) textarea').forEach(t => {
    if (t.value.trim()) scenes.push(t.value.trim());
  });

  if (!title)  { showToast('책 제목을 입력하세요'); return; }
  if (!scenes.length) { showToast('장면을 최소 1개 입력하세요'); return; }

  showLoading('out-video', '영상 생성 중... (수 분 소요)');

  try {
    const result = isElectron
      ? await window.electronAPI.generateVideo({title, duration, scenes, bgm})
      : {success:false, error:'Electron 앱에서만 사용 가능해요'};

    finishLoading('out-video');

    const wrap = document.getElementById('out-video');
    if (result.success) {
      wrap.innerHTML = `<div class="res-card"><div class="res-card-title"><i class="ti ti-check" style="color:var(--success)"></i>영상 생성 완료</div><div class="res-card-body">${escapeHtml(result.outputPath||'')}</div></div>`;
      showToast('영상이 생성됐어요');
    } else {
      showError('out-video', result.error);
    }
  } catch(e) { showError('out-video', e.message); }
}

function previewRef(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('vid-ref-name').textContent = file.name;
}

// ─── 찾기·바꾸기 ─────────────────────────────────────────
let frTarget = 'inp-correction';
let frOpen   = false;

function openFindReplace(targetId = 'inp-correction') {
  frTarget = targetId;
  if (frOpen) { closeFindReplace(); return; }
  frOpen = true;
  const panel = document.getElementById('panel-' + state.currentPanel);
  if (!panel) return;
  const body  = panel.querySelector('.panel-body');
  if (!body)  return;

  const fr = document.createElement('div');
  fr.id    = 'fr-panel';
  fr.className = 'find-replace-panel';
  fr.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:11px;color:var(--text2);font-weight:500">찾기 · 바꾸기</span>
      <button class="btn-icon" style="width:22px;height:22px;font-size:12px" onclick="closeFindReplace()"><i class="ti ti-x"></i></button>
    </div>
    <div class="fr-row"><span class="fr-label">찾을 텍스트</span><input class="fr-input" id="fr-find" placeholder="찾을 텍스트..." oninput="frCount()"><span class="fr-count" id="fr-count"></span></div>
    <div class="fr-row"><span class="fr-label">바꿀 텍스트</span><input class="fr-input" id="fr-replace" placeholder="바꿀 텍스트 (빈칸=삭제)"></div>
    <div class="fr-btns">
      <button class="btn btn-sec" style="font-size:11px;padding:4px 9px" onclick="frCount()"><i class="ti ti-search"></i>개수 확인</button>
      <button class="btn btn-p" style="font-size:11px;padding:4px 9px" onclick="frReplaceAll()"><i class="ti ti-replace"></i>모두 바꾸기</button>
    </div>`;

  body.insertBefore(fr, body.firstChild);
  document.getElementById('fr-find')?.focus();
}

function closeFindReplace() {
  frOpen = false;
  document.getElementById('fr-panel')?.remove();
}

function frCount() {
  const find  = document.getElementById('fr-find')?.value;
  const cnt   = document.getElementById('fr-count');
  if (!find || !cnt) return;
  const text  = document.getElementById(frTarget)?.value || '';
  const n     = text.split(find).length - 1;
  cnt.textContent = n > 0 ? `${n}개 발견` : '없음';
  cnt.style.color = n > 0 ? 'var(--accent)' : 'var(--text3)';
}

function frReplaceAll() {
  const find    = document.getElementById('fr-find')?.value;
  const replace = document.getElementById('fr-replace')?.value || '';
  if (!find) { showToast('찾을 텍스트를 입력해주세요'); return; }
  const el = document.getElementById(frTarget);
  if (!el) return;
  const n = el.value.split(find).length - 1;
  if (!n) { showToast('"' + find + '" 을 찾을 수 없어요'); return; }
  el.value = el.value.split(find).join(replace);
  updateStat(frTarget, 'stat-' + frTarget.replace('inp-',''));
  if (frTarget === 'inp-correction') updateCorrStats();
  showToast(`${n}개 바꿨어요`);
}

// ─── 전처리 ──────────────────────────────────────────────
function openPreprocessMenu() {
  const wrap = document.getElementById('panel-correction')?.querySelector('.panel-body');
  if (!wrap) return;
  const existing = document.getElementById('pp-panel');
  if (existing) { existing.remove(); return; }
  const pp = document.createElement('div');
  pp.id    = 'pp-panel';
  pp.className = 'preprocess-panel';
  pp.innerHTML = `<span class="pp-label">전처리</span>
    <button class="pp-btn" onclick="preprocess('double-space')">공백 정리</button>
    <button class="pp-btn" onclick="preprocess('quote')">따옴표 통일</button>
    <button class="pp-btn" onclick="preprocess('punct')">문장부호</button>
    <button class="pp-btn" onclick="preprocess('linebreak')">단락 정리</button>
    <button class="pp-btn" onclick="preprocess('fullwidth')">전각 변환</button>
    <button class="btn-icon" style="width:20px;height:20px;font-size:11px;margin-left:auto" onclick="document.getElementById('pp-panel').remove()"><i class="ti ti-x"></i></button>`;
  wrap.insertBefore(pp, wrap.firstChild);
}

function preprocess(type) {
  const el = document.getElementById('inp-correction');
  if (!el?.value) { showToast('원고를 먼저 입력해주세요'); return; }
  let text = el.value, before = text;
  switch(type) {
    case 'double-space': text = text.replace(/  +/g,' ').replace(/ +\n/g,'\n').replace(/\n +/g,'\n'); break;
    case 'quote':        text = text.replace(/「/g,'"').replace(/」/g,'"').replace(/"|"/g,'"').replace(/'|'/g,"'"); break;
    case 'punct':        text = text.replace(/\.\.\./g,'…').replace(/,([가-힣A-Za-z])/g,', $1'); break;
    case 'linebreak':    text = text.replace(/\n{3,}/g,'\n\n').replace(/([가-힣A-Za-z,]{10,})\n([가-힣])/g,'$1 $2'); break;
    case 'fullwidth':    text = text.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/　/g,' '); break;
  }
  if (text === before) { showToast('변경된 내용이 없어요'); return; }
  el.value = text;
  updateCorrStats();
  updateStat('inp-correction','stat-correction');
  showToast({
    'double-space':'이중 공백 제거됨','quote':'따옴표 통일됨',
    'punct':'문장부호 정리됨','linebreak':'단락 정리됨','fullwidth':'전각 변환됨'
  }[type]);
}

// ─── 원고 일관성 검사 ────────────────────────────────────
function checkConsistency(text) {
  const issues = [];
  const dq = (text.match(/"/g)||[]).length;
  if (dq%2!==0) issues.push({type:'따옴표', detail:`큰따옴표 ${dq}개 (짝이 안 맞아요)`});
  const opens  = (text.match(/[([{]/g)||[]).length;
  const closes = (text.match(/[)\]}]/g)||[]).length;
  if (opens!==closes) issues.push({type:'괄호', detail:`여는 괄호 ${opens}개, 닫는 괄호 ${closes}개`});
  const paras = text.split('\n').filter(l=>l.trim().length>30);
  const noEnd = paras.filter(p=>!/[.!?。…]$/.test(p.trim()));
  if (noEnd.length) issues.push({type:'문장 끝맺음', detail:`${noEnd.length}개 단락에 마침 기호 없음`});
  const repeats = text.match(/(\b\S+\b)(\s+\1){2,}/g);
  if (repeats?.length) issues.push({type:'반복 표현', detail:repeats.slice(0,3).map(r=>`"${r.split(/\s+/)[0]}"`).join(', ')});
  const longSents = text.split(/[.!?。]/).filter(s=>s.trim().length>100);
  if (longSents.length) issues.push({type:'긴 문장', detail:`${longSents.length}개 문장이 100자 이상`});
  return issues;
}

function showConsistencyReport(inputId) {
  const text = document.getElementById(inputId)?.value?.trim();
  if (!text) { showToast('원고를 먼저 입력해주세요'); return; }
  const issues = checkConsistency(text);
  const stats  = getTextStats(text);
  const overlay = document.createElement('div');
  overlay.className = 'consistency-overlay';
  overlay.innerHTML = `<div class="consistency-report">
    <div class="cm-title"><i class="ti ti-stethoscope" style="font-size:14px;color:var(--accent)"></i> 원고 빠른 검사</div>
    <div class="cm-stats">
      <div class="cm-stat"><div class="cm-stat-n">${stats.chars.toLocaleString()}</div><div class="cm-stat-l">글자</div></div>
      <div class="cm-stat"><div class="cm-stat-n">${stats.words.toLocaleString()}</div><div class="cm-stat-l">단어</div></div>
      <div class="cm-stat"><div class="cm-stat-n">${stats.sentences}</div><div class="cm-stat-l">문장</div></div>
      <div class="cm-stat"><div class="cm-stat-n">${stats.readingMin}분</div><div class="cm-stat-l">읽기</div></div>
    </div>
    ${issues.length===0
      ? '<div class="cm-ok"><i class="ti ti-check" style="color:var(--success)"></i>눈에 띄는 문제 없음</div>'
      : issues.map(i=>`<div class="cm-issue"><span class="cm-type">${i.type}</span><span class="cm-detail">${i.detail}</span></div>`).join('')}
    <button class="btn btn-sec" style="margin-top:12px;width:100%;justify-content:center" onclick="this.closest('.consistency-overlay').remove()">닫기</button>
  </div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─── 설정 ────────────────────────────────────────────────
async function loadSettings() {
  if (isElectron) {
    const res = await window.electronAPI.loadSettings();
    if (res.success && res.data) settings = res.data;
  } else {
    const raw = localStorage.getItem('edito_settings');
    if (raw) settings = JSON.parse(raw);
  }
  if (settings.bareunApiKey) {
    const el = document.getElementById('bareun-api-key');
    if (el) el.value = settings.bareunApiKey;
  }
  if (settings.ollamaModel) {
    const el = document.getElementById('ollama-model');
    if (el) el.value = settings.ollamaModel;
  }
}

async function saveSettings() {
  const bareunKey = document.getElementById('bareun-api-key')?.value?.trim();
  const ollamaMod = document.getElementById('ollama-model')?.value;
  if (bareunKey) settings.bareunApiKey = bareunKey;
  if (ollamaMod) settings.ollamaModel  = ollamaMod;
  if (isElectron) await window.electronAPI.saveSettings(settings);
  else localStorage.setItem('edito_settings', JSON.stringify(settings));
  showToast('설정이 저장됐어요 ✓');
}

async function testBareun() {
  const key  = document.getElementById('bareun-api-key')?.value?.trim();
  const stat = document.getElementById('bareun-status');
  if (!key) { stat.textContent = 'API 키를 입력해주세요'; return; }
  stat.textContent = '확인 중...'; stat.style.color = 'var(--text3)';
  if (!isElectron) { stat.textContent = 'Electron 앱에서만 가능해요'; return; }
  const res = await window.electronAPI.correctText({apiKey:key, text:'테스트 문장입니다.'});
  if (res.success) { stat.textContent = '✓ 연결됨'; stat.style.color = '#4a9e6b'; settings.bareunApiKey = key; await saveSettings(); }
  else { stat.textContent = '✗ ' + (res.error||'연결 실패'); stat.style.color = '#c94a4a'; }
}

async function testOllama() {
  const stat = document.getElementById('ollama-status');
  stat.textContent = '확인 중...';
  try {
    const res    = await fetch('http://localhost:11434/api/tags');
    const data   = await res.json();
    const models = data.models?.map(m=>m.name) || [];
    const hasExaone = models.some(m => m.includes('exaone'));

    if (hasExaone) {
      stat.textContent = '✓ EXAONE 3.0 설치됨';
      stat.style.color = '#4a9e6b';
    } else {
      stat.textContent = '⚠ EXAONE 3.0 미설치 (설치 명령: ollama pull exaone3.0:7.8b)';
      stat.style.color = '#d4b87a';
    }
  } catch { stat.textContent = '✗ Ollama 실행 필요'; stat.style.color = '#c94a4a'; }
}

async function testSD() {
  const stat = document.getElementById('sd-status');
  stat.textContent = '확인 중...';
  try {
    const res = await fetch('http://127.0.0.1:7861/sdapi/v1/options');
    if (res.ok) { stat.textContent = '✓ 연결됨'; stat.style.color = '#4a9e6b'; }
    else        { stat.textContent = '✗ 연결 실패'; stat.style.color = '#c94a4a'; }
  } catch { stat.textContent = '✗ SD 실행 필요'; stat.style.color = '#c94a4a'; }
}

// ─── 키보드 단축키 ────────────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === ',') { e.preventDefault(); sw('settings'); return; }
    if (meta && e.key === 'n') { e.preventDefault(); openNewProject(); return; }
    if (e.key === 'Escape')    { closeModal(); closeFindReplace(); return; }
    if (meta && (e.key==='Enter'||e.key==='\r')) {
      e.preventDefault();
      const fns = {analysis:startAnalysis, correction:startCorrection, proofreading:startProofreading, 'full-edit':startFullEdit, cover:startCoverGeneration, video:startVideoGeneration, marketing:startMarketingGeneration};
      fns[state.currentPanel]?.();
      return;
    }
    if (meta && e.key === 'r') {
      e.preventDefault();
      sw('full-edit');
      return;
    }
    if (meta && e.key === 's') {
      e.preventDefault();
      const panels = ['analysis','correction','proofreading','cover','video','marketing'];
      if (panels.includes(state.currentPanel)) saveResult(state.currentPanel);
      return;
    }
  });
}

// ─── 30일 지난 휴지통 자동 삭제 ──────────────────────────
function cleanOldTrash() {
  const now = new Date(), before = state.trash.length;
  state.trash = state.trash.filter(t => (now - new Date(t.deletedAt)) / (1000*60*60*24) < 30);
  if (state.trash.length !== before) save();
}

// ─── 초기화 ──────────────────────────────────────────────
async function init() {
  await load();
  cleanOldTrash();

  const theme = localStorage.getItem('edito_theme') || 'dark';
  document.getElementById('app').dataset.theme = theme;
  const icon1 = document.getElementById('theme-icon');
  const icon2 = document.getElementById('theme-icon2');
  const lbl   = document.getElementById('theme-label');
  if (icon1) icon1.className  = theme==='light' ? 'ti ti-moon' : 'ti ti-sun';
  if (icon2) icon2.className  = theme==='light' ? 'ti ti-moon' : 'ti ti-sun';
  if (lbl)   lbl.textContent  = theme==='light' ? '다크 모드' : '라이트 모드';

  renderProjectList();
  renderTrash();
  updateTrashCount();
  renderHomeRecent();
  await loadSettings();
  initKeyboard();

  // 스플래시 로딩바 시작
  let pct = 10;
  const fill = document.getElementById('splash-fill');
  if (fill) fill.style.width = pct + '%';
  const t = setInterval(() => {
    if (pct < 30) { pct += 5; if(fill) fill.style.width = pct + '%'; }
    else clearInterval(t);
  }, 400);

  // 엔진 상태 이벤트 수신
  if (isElectron) {
    window.electronAPI.onEngineUpdate(data => {
      updateSplashEngine(data.engine, data.status, data.msg);
    });
    // 현재 상태 확인
    const status = await window.electronAPI.getEngineStatus();
    if (status.ollama === 'ready') updateSplashEngine('ollama', 'ready', 'Ollama 준비됨');
    if (status.sd     === 'ready') updateSplashEngine('sd',     'ready', 'Stable Diffusion 준비됨');
    if (status.sd === 'not-installed') updateSplashEngine('sd', 'not-installed', 'Stable Diffusion 미설치 (선택사항)');
  } else {
    // 브라우저 모드: 스플래시 바로 닫기
    setTimeout(hideSplash, 1500);
  }
}

document.addEventListener('DOMContentLoaded', init);

// sw 함수가 있다면 확장 (custom-dict 렌더링)
if (typeof sw !== 'undefined') {
  const _sw = sw;
  window.sw = function(panel) {
    if (panel === 'custom-dict' && typeof renderCustomDict === 'function') {
      renderCustomDict();
    }
    _sw(panel);
  };
}
