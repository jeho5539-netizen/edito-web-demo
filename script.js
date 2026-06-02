// 탭 전환
function switchTab(tabName) {
  // 사이드바 네비게이션 활성화
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.nav-item').classList.add('active');

  // 패널 전환
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById('panel-' + tabName).classList.add('active');

  // 스크롤 최상단으로
  document.querySelector('.main-content').scrollTop = 0;
}

// 결과 탭 전환
function switchResultTab(feature, tabName) {
  const prefix = feature + '-';

  // 탭 버튼 활성화
  event.target.parentElement.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // 탭 콘텐츠 전환
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(prefix + tabName).classList.add('active');
}

// 교열 실행
function runProofread() {
  const btn = event.target;
  const resultSection = document.getElementById('result-proofread');

  // 버튼 비활성화
  btn.disabled = true;
  btn.innerHTML = '<span class="loading">처리 중...</span>';

  // 시뮬레이션 딜레이
  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>교열 시작</span>';

    // 결과로 스크롤
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1500);
}

// 교정 실행
function runCorrection() {
  const btn = event.target;
  const resultSection = document.getElementById('result-correction');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading">처리 중...</span>';

  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>교정 시작</span>';

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1000);
}

// 원고 분석 실행
function runAnalysis() {
  const btn = event.target;
  const resultSection = document.getElementById('result-analysis');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading">분석 중...</span>';

  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>분석 시작</span>';

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 2000);
}

// 마케팅 문구 생성
function runMarketing() {
  const btn = event.target;
  const resultSection = document.getElementById('result-marketing');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading">생성 중...</span>';

  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>문구 생성</span>';

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 2500);
}

// 표지 컨셉 생성
function runCover() {
  const btn = event.target;
  const resultSection = document.getElementById('result-cover');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading">생성 중...</span>';

  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>컨셉 스케치 생성</span>';

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 2000);
}

// 홍보 영상 제작
function runVideo() {
  const btn = event.target;
  const resultSection = document.getElementById('result-video');

  btn.disabled = true;
  btn.innerHTML = '<span class="loading">제작 중...</span>';

  setTimeout(() => {
    resultSection.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span>홍보 영상 제작</span>';

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 3000);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('Edito Web Demo Ready');

  // 첫 번째 탭 활성화
  document.getElementById('panel-proofread').classList.add('active');
});
