// ─── 실시간 진행률 사이드바 ───────────────────────────────

let progressTasks = [];
let nextTaskId = 1;

function toggleProgressSidebar() {
  const sidebar = document.getElementById('progress-sidebar');
  sidebar.classList.toggle('open');
}

function createProgressTask(name, type) {
  const task = {
    id: nextTaskId++,
    name,
    type,
    status: 'running',
    progress: 0,
    current: 0,
    total: 0,
    detail: '',
    startTime: Date.now()
  };

  progressTasks.push(task);
  updateProgressSidebar();
  return task.id;
}

function updateProgressTask(taskId, updates) {
  const task = progressTasks.find(t => t.id === taskId);
  if (!task) return;

  Object.assign(task, updates);
  updateProgressSidebar();
}

function completeProgressTask(taskId, success = true) {
  const task = progressTasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = success ? 'completed' : 'failed';
  task.progress = success ? 100 : task.progress;
  updateProgressSidebar();

  // 3초 후 제거
  setTimeout(() => {
    progressTasks = progressTasks.filter(t => t.id !== taskId);
    updateProgressSidebar();
  }, 3000);
}

function updateProgressSidebar() {
  const body = document.getElementById('progress-sidebar-body');
  const badge = document.getElementById('progress-badge');
  const toggleBtn = document.getElementById('progress-toggle');

  const activeTasks = progressTasks.filter(t => t.status === 'running');
  const activeCount = activeTasks.length;

  // 배지 업데이트
  if (activeCount > 0) {
    badge.textContent = activeCount;
    badge.style.display = 'flex';
    toggleBtn.classList.add('has-active');
  } else {
    badge.style.display = 'none';
    toggleBtn.classList.remove('has-active');
  }

  // 빈 상태
  if (progressTasks.length === 0) {
    body.innerHTML = `
      <div class="progress-sidebar-empty">
        <i class="ti ti-clock"></i>
        <div class="progress-sidebar-empty-text">진행 중인 작업이 없습니다</div>
      </div>
    `;
    return;
  }

  // 작업 목록 렌더링
  const html = progressTasks.map(task => {
    const icon = getTaskIcon(task.type);
    const statusClass = `status-${task.status}`;
    const elapsed = Math.round((Date.now() - task.startTime) / 1000);

    let statusText = '';
    if (task.status === 'running') {
      statusText = task.detail || (task.total > 0 ? `${task.current}/${task.total}` : '처리 중...');
    } else if (task.status === 'completed') {
      statusText = `완료 (${elapsed}초)`;
    } else if (task.status === 'failed') {
      statusText = '실패';
    }

    const progressPercent = task.total > 0
      ? Math.round((task.current / task.total) * 100)
      : task.progress;

    return `
      <div class="progress-task ${task.status === 'running' ? 'active' : ''} ${task.status === 'completed' ? 'completed' : ''}">
        <div class="progress-task-header">
          <div class="progress-task-icon ${statusClass}">
            <i class="ti ${icon}"></i>
          </div>
          <div class="progress-task-info">
            <div class="progress-task-name">${escapeHtml(task.name)}</div>
            <div class="progress-task-status">${statusText}</div>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${task.status === 'completed' ? 'completed' : ''} ${task.status === 'failed' ? 'failed' : ''}"
               style="width: ${progressPercent}%"></div>
        </div>
        <div class="progress-task-detail">
          <span>${progressPercent}%</span>
          <span>${elapsed}초 경과</span>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = html;
}

function getTaskIcon(type) {
  const icons = {
    correction: 'ti-text-spellcheck',
    proofreading: 'ti-edit',
    full_edit: 'ti-bolt',
    analysis: 'ti-chart-bar',
    marketing: 'ti-speakerphone',
    cover: 'ti-palette',
    video: 'ti-movie'
  };
  return icons[type] || 'ti-circle';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
