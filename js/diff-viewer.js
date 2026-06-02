/**
 * Diff Viewer - Before/After 비교 및 변경사항 관리
 */

class DiffViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.changes = [];
    this.originalText = '';
    this.revisedText = '';
    this.currentView = 'changes'; // 'changes', 'sidebyside', 'unified'
  }

  /**
   * Diff 뷰어 초기화
   */
  init(originalText, revisedText, issues = []) {
    this.originalText = originalText;
    this.revisedText = revisedText;
    this.changes = this.processIssues(issues);

    this.render();
  }

  /**
   * issues 배열을 change 객체로 변환
   */
  processIssues(issues) {
    return issues.map((issue, index) => {
      const typeMap = {
        '문법': 'grammar',
        '문체': 'style',
        '용어': 'consistency',
        '모순': 'contradiction'
      };

      return {
        id: `change-${index}`,
        original: issue.original || '',
        suggestion: issue.suggestion || issue.corrected || '',
        reason: issue.reason || issue.type || '',
        type: typeMap[issue.reason] || typeMap[issue.type] || 'grammar',
        status: 'pending' // 'pending', 'accepted', 'rejected'
      };
    });
  }

  /**
   * 뷰어 렌더링
   */
  render() {
    if (!this.container) return;

    const stats = this.calculateStats();

    this.container.innerHTML = `
      <div class="diff-viewer active">
        <!-- 헤더 -->
        <div class="diff-header">
          <div class="diff-tabs">
            <button class="diff-tab ${this.currentView === 'changes' ? 'active' : ''}"
                    onclick="diffViewer.switchView('changes')">
              <i class="ti ti-list-details"></i>
              변경사항 목록
            </button>
            <button class="diff-tab ${this.currentView === 'sidebyside' ? 'active' : ''}"
                    onclick="diffViewer.switchView('sidebyside')">
              <i class="ti ti-columns"></i>
              좌우 비교
            </button>
            <button class="diff-tab ${this.currentView === 'unified' ? 'active' : ''}"
                    onclick="diffViewer.switchView('unified')">
              <i class="ti ti-file-diff"></i>
              통합 Diff
            </button>
          </div>
          <div class="diff-stats">
            <div class="diff-stat added">
              <i class="ti ti-circle-plus"></i>
              <span class="diff-stat-value">${stats.added}</span>
              추가
            </div>
            <div class="diff-stat removed">
              <i class="ti ti-circle-minus"></i>
              <span class="diff-stat-value">${stats.removed}</span>
              제거
            </div>
            <div class="diff-stat modified">
              <i class="ti ti-circle-check"></i>
              <span class="diff-stat-value">${stats.accepted}</span>
              / ${stats.total} 승인됨
            </div>
          </div>
        </div>

        <!-- 컨텐츠 -->
        <div class="diff-content">
          <!-- 변경사항 목록 -->
          <div class="diff-panel ${this.currentView === 'changes' ? 'active' : ''}" id="diff-panel-changes">
            ${this.renderChangesList()}
          </div>

          <!-- 좌우 비교 -->
          <div class="diff-panel ${this.currentView === 'sidebyside' ? 'active' : ''}" id="diff-panel-sidebyside">
            ${this.renderSideBySide()}
          </div>

          <!-- 통합 diff -->
          <div class="diff-panel ${this.currentView === 'unified' ? 'active' : ''}" id="diff-panel-unified">
            ${this.renderUnified()}
          </div>
        </div>

        <!-- 액션 바 -->
        <div class="diff-actions">
          <div class="diff-actions-left">
            <button class="diff-action-btn success" onclick="diffViewer.acceptAll()">
              <i class="ti ti-checks"></i>
              전체 수락
            </button>
            <button class="diff-action-btn danger" onclick="diffViewer.rejectAll()">
              <i class="ti ti-x"></i>
              전체 거부
            </button>
          </div>
          <div class="diff-actions-right">
            <button class="diff-action-btn" onclick="diffViewer.reset()">
              <i class="ti ti-refresh"></i>
              초기화
            </button>
            <button class="diff-action-btn primary" onclick="diffViewer.applyChanges()">
              <i class="ti ti-check"></i>
              승인된 변경사항 적용
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 변경사항 목록 렌더링
   */
  renderChangesList() {
    if (this.changes.length === 0) {
      return `
        <div class="diff-empty">
          <i class="ti ti-file-text"></i>
          <div>변경사항이 없습니다.</div>
        </div>
      `;
    }

    return `
      <div class="diff-changes-list">
        ${this.changes.map(change => this.renderChangeItem(change)).join('')}
      </div>
    `;
  }

  /**
   * 개별 변경사항 렌더링
   */
  renderChangeItem(change) {
    const statusClass = change.status !== 'pending' ? change.status : '';

    return `
      <div class="change-item ${statusClass}" id="${change.id}">
        <div class="change-header">
          <span class="change-type ${change.type}">${this.getTypeLabel(change.type)}</span>
          <div class="change-actions">
            ${change.status !== 'accepted' ?
              `<button class="change-btn accept" onclick="diffViewer.acceptChange('${change.id}')">
                <i class="ti ti-check"></i>
                수락
              </button>` :
              `<button class="change-btn" onclick="diffViewer.undoChange('${change.id}')">
                <i class="ti ti-arrow-back-up"></i>
                취소
              </button>`
            }
            ${change.status !== 'rejected' ?
              `<button class="change-btn reject" onclick="diffViewer.rejectChange('${change.id}')">
                <i class="ti ti-x"></i>
                거부
              </button>` :
              `<button class="change-btn" onclick="diffViewer.undoChange('${change.id}')">
                <i class="ti ti-arrow-back-up"></i>
                취소
              </button>`
            }
          </div>
        </div>

        <div class="change-text">
          <div class="change-text-label">원문</div>
          <div class="change-text-content before">${this.escapeHtml(change.original)}</div>

          <div class="change-text-label">수정안</div>
          <div class="change-text-content after">${this.escapeHtml(change.suggestion)}</div>
        </div>

        ${change.reason ?
          `<div class="change-reason">
            <i class="ti ti-info-circle"></i>
            <span>${this.escapeHtml(change.reason)}</span>
          </div>` : ''
        }
      </div>
    `;
  }

  /**
   * 좌우 비교 렌더링
   */
  renderSideBySide() {
    return `
      <div class="diff-sidebyside">
        <div class="diff-column">
          <div class="diff-column-header before">원본</div>
          <div class="diff-text">${this.highlightText(this.originalText, 'before')}</div>
        </div>
        <div class="diff-column">
          <div class="diff-column-header after">수정본</div>
          <div class="diff-text">${this.highlightText(this.revisedText, 'after')}</div>
        </div>
      </div>
    `;
  }

  /**
   * 통합 diff 렌더링
   */
  renderUnified() {
    const lines = this.generateDiffLines();

    return `
      <div class="diff-unified">
        ${lines.map(line => `
          <div class="diff-line ${line.type}">
            ${line.type === 'removed' ? '- ' : line.type === 'added' ? '+ ' : '  '}${this.escapeHtml(line.content)}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Diff 라인 생성 (간단한 구현)
   */
  generateDiffLines() {
    const originalLines = this.originalText.split('\n');
    const revisedLines = this.revisedText.split('\n');
    const lines = [];

    const maxLen = Math.max(originalLines.length, revisedLines.length);

    for (let i = 0; i < maxLen; i++) {
      const origLine = originalLines[i];
      const revLine = revisedLines[i];

      if (origLine === revLine) {
        lines.push({ type: 'context', content: origLine || '' });
      } else {
        if (origLine !== undefined) {
          lines.push({ type: 'removed', content: origLine });
        }
        if (revLine !== undefined) {
          lines.push({ type: 'added', content: revLine });
        }
      }
    }

    return lines;
  }

  /**
   * 텍스트 하이라이트 (변경된 부분 강조)
   */
  highlightText(text, type) {
    // 간단한 구현: 그냥 텍스트 반환
    // 실제로는 diff 알고리즘으로 변경된 부분만 강조해야 함
    return this.escapeHtml(text);
  }

  /**
   * 뷰 전환
   */
  switchView(view) {
    this.currentView = view;
    this.render();
  }

  /**
   * 변경사항 수락
   */
  acceptChange(changeId) {
    const change = this.changes.find(c => c.id === changeId);
    if (change) {
      change.status = 'accepted';
      this.render();
    }
  }

  /**
   * 변경사항 거부
   */
  rejectChange(changeId) {
    const change = this.changes.find(c => c.id === changeId);
    if (change) {
      change.status = 'rejected';
      this.render();
    }
  }

  /**
   * 변경사항 취소 (pending으로 되돌림)
   */
  undoChange(changeId) {
    const change = this.changes.find(c => c.id === changeId);
    if (change) {
      change.status = 'pending';
      this.render();
    }
  }

  /**
   * 전체 수락
   */
  acceptAll() {
    this.changes.forEach(change => {
      if (change.status === 'pending') {
        change.status = 'accepted';
      }
    });
    this.render();
  }

  /**
   * 전체 거부
   */
  rejectAll() {
    this.changes.forEach(change => {
      if (change.status === 'pending') {
        change.status = 'rejected';
      }
    });
    this.render();
  }

  /**
   * 초기화
   */
  reset() {
    this.changes.forEach(change => {
      change.status = 'pending';
    });
    this.render();
  }

  /**
   * 승인된 변경사항 적용
   */
  applyChanges() {
    const acceptedChanges = this.changes.filter(c => c.status === 'accepted');

    if (acceptedChanges.length === 0) {
      alert('승인된 변경사항이 없습니다.');
      return;
    }

    let result = this.originalText;

    // 원문에서 각 변경사항 적용
    acceptedChanges.forEach(change => {
      result = result.replace(change.original, change.suggestion);
    });

    // 결과를 해당 패널의 출력란에 표시
    if (window.applyDiffResult) {
      window.applyDiffResult(result, acceptedChanges.length);
    }

    alert(`${acceptedChanges.length}개의 변경사항이 적용되었습니다.`);
  }

  /**
   * 통계 계산
   */
  calculateStats() {
    const added = this.changes.filter(c => c.suggestion && !c.original).length;
    const removed = this.changes.filter(c => c.original && !c.suggestion).length;
    const accepted = this.changes.filter(c => c.status === 'accepted').length;
    const total = this.changes.length;

    return { added, removed, accepted, total };
  }

  /**
   * 타입 라벨
   */
  getTypeLabel(type) {
    const labels = {
      grammar: '문법',
      style: '문체',
      consistency: '일관성',
      contradiction: '모순'
    };
    return labels[type] || '기타';
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 (각 패널별로 생성 가능)
let diffViewer = null;

/**
 * Diff 뷰어 초기화 헬퍼
 */
function initDiffViewer(containerId, originalText, revisedText, issues) {
  diffViewer = new DiffViewer(containerId);
  diffViewer.init(originalText, revisedText, issues);
  return diffViewer;
}
