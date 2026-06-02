/**
 * Diff Viewer 통합 - 교정/교열 결과와 diff viewer 연동
 */

// ─── 전역 변수 ───
let correctionDiffViewer = null;
let proofreadingDiffViewer = null;
let fullEditDiffViewer = null;

/**
 * 교정 결과에 diff viewer 적용
 */
function showCorrectionDiff(originalText, revisedText, errors) {
  // errors 배열을 issues 형식으로 변환
  const issues = errors.map(error => ({
    original: error.original || '',
    suggestion: error.corrected || error.suggestion || '',
    reason: error.type || '맞춤법/띄어쓰기',
    type: '문법'
  }));

  // Diff viewer 초기화
  correctionDiffViewer = initDiffViewer('diff-correction', originalText, revisedText, issues);

  // 기존 출력 패널 숨기기 (선택사항)
  const outPanel = document.getElementById('out-correction');
  if (outPanel) {
    outPanel.style.display = 'none';
  }
}

/**
 * 교열 결과에 diff viewer 적용
 */
function showProofreadingDiff(originalText, revisedText, issues) {
  // Diff viewer 초기화
  proofreadingDiffViewer = initDiffViewer('diff-proofreading', originalText, revisedText, issues);

  // 기존 출력 패널 숨기기 (선택사항)
  const outPanel = document.getElementById('out-proofreading');
  if (outPanel) {
    outPanel.style.display = 'none';
  }
}

/**
 * 통합 편집 결과에 diff viewer 적용
 */
function showFullEditDiff(originalText, revisedText, issues) {
  // Diff viewer 초기화
  fullEditDiffViewer = initDiffViewer('diff-full-edit', originalText, revisedText, issues);

  // 기존 출력 패널 숨기기 (선택사항)
  const outPanel = document.getElementById('out-full-edit');
  if (outPanel) {
    outPanel.style.display = 'none';
  }
}

/**
 * Diff viewer에서 적용된 결과를 출력 패널에 반영
 */
window.applyDiffResult = function(resultText, changeCount) {
  // 현재 활성화된 패널 확인
  const currentPanel = state?.currentPanel || '';

  let outputId = '';
  let textareaId = '';

  if (currentPanel === 'correction') {
    outputId = 'out-correction';
    correctedText = resultText; // 전역 변수에 저장
  } else if (currentPanel === 'proofreading') {
    outputId = 'out-proofreading';
    proofreadText = resultText; // 전역 변수에 저장
  } else if (currentPanel === 'full-edit') {
    outputId = 'out-full-edit';
    fullEditResult = resultText; // 전역 변수에 저장
  }

  // 출력 패널에 결과 표시
  const outputPanel = document.getElementById(outputId);
  if (outputPanel) {
    outputPanel.innerHTML = `
      <div style="padding: 16px; background: var(--bg3); border-radius: 8px;">
        <div style="margin-bottom: 12px; color: var(--text2); font-size: 12px;">
          <i class="ti ti-check"></i> ${changeCount}개 변경사항이 적용되었습니다.
        </div>
        <div style="max-height: 400px; overflow-y: auto; font-family: 'Menlo', monospace; font-size: 12px; line-height: 1.8; white-space: pre-wrap; color: var(--text);">
${resultText}
        </div>
      </div>
    `;
    outputPanel.style.display = 'block';
  }
};

/**
 * 기존 교정 함수와 통합 (기존 함수가 있다면 수정)
 *
 * 사용 예시:
 *
 * // 기존 교정 로직 후:
 * if (result.success) {
 *   showCorrectionDiff(originalText, result.revised, result.errors);
 * }
 *
 * // 기존 교열 로직 후:
 * if (result.success) {
 *   showProofreadingDiff(originalText, result.revised, result.issues);
 * }
 */

/**
 * Diff viewer 토글 (보이기/숨기기)
 */
function toggleDiffViewer(type) {
  const diffId = `diff-${type}`;
  const outId = `out-${type}`;

  const diffEl = document.getElementById(diffId);
  const outEl = document.getElementById(outId);

  if (diffEl && diffEl.querySelector('.diff-viewer')) {
    const isActive = diffEl.querySelector('.diff-viewer').classList.contains('active');

    if (isActive) {
      // Diff 뷰어 숨기고 기존 출력 보이기
      diffEl.querySelector('.diff-viewer').classList.remove('active');
      if (outEl) outEl.style.display = 'block';
    } else {
      // Diff 뷰어 보이고 기존 출력 숨기기
      diffEl.querySelector('.diff-viewer').classList.add('active');
      if (outEl) outEl.style.display = 'none';
    }
  }
}

/**
 * 뷰 전환 버튼 추가 헬퍼
 */
function addDiffViewToggle(panelType) {
  const actionBar = document.querySelector(`#panel-${panelType} .action-bar`);

  if (actionBar && !actionBar.querySelector('.btn-diff-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-sec btn-diff-toggle';
    toggleBtn.innerHTML = '<i class="ti ti-file-diff"></i>비교 뷰';
    toggleBtn.onclick = () => toggleDiffViewer(panelType);

    // 저장 버튼 앞에 삽입
    const saveBtn = actionBar.querySelector('[onclick*="saveResult"]');
    if (saveBtn) {
      actionBar.insertBefore(toggleBtn, saveBtn);
    } else {
      actionBar.appendChild(toggleBtn);
    }
  }
}

// 앱 로드 시 버튼 추가
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      addDiffViewToggle('correction');
      addDiffViewToggle('proofreading');
      addDiffViewToggle('full-edit');
    }, 500);
  });
}
