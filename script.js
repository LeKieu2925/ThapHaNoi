// ==================== DOM ELEMENTS ====================
const pages = {
  home: document.getElementById('home'),
  guide: document.getElementById('guide'),
  game: document.getElementById('game'),
  ranking: document.getElementById('ranking')
};

const towers = {
  A: document.getElementById('towerA'),
  B: document.getElementById('towerB'),
  C: document.getElementById('towerC')
};

const diskCountInput = document.getElementById('numDisks');  // ĐÃ SỬA
const modeBtns = document.querySelectorAll('.mode-btn');
const startBtn = document.getElementById('start-game');
const autoSolveBtn = document.getElementById('auto-solve');
const resetBtn = document.getElementById('reset-game');
const stepsList = document.getElementById('steps-list');
const rankTable = document.querySelector('#rank-table tbody');

// ==================== TRẠNG THÁI ====================
let state = {
  towers: { A: [], B: [], C: [] },
  mode: 'manual',
  moveCount: 0,
  startTime: null,
  selectedDisk: null
};

let animationFrameId = null;

// ==================== ĐIỀU HƯỚNG ====================
document.getElementById('view-guide').onclick = () => showPage('guide');
document.getElementById('play-now').onclick = () => showPage('game');

document.getElementById('guide-link').onclick = (e) => {
  e.preventDefault();
  showPage('guide');
};

document.getElementById('play-link').onclick = (e) => {
  e.preventDefault();
  showPage('game');
};

document.getElementById('rank-link').onclick = (e) => {
  e.preventDefault();
  loadRanking();
  showPage('ranking');
};

document.getElementById('back-home').onclick = () => showPage('home');
document.getElementById('back-rank').onclick = () => showPage('home');

function showPage(id) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[id].classList.add("active");
  window.scrollTo(0, 0);
}

// ==================== CHỌN CHẾ ĐỘ ====================
modeBtns.forEach(btn => {
  btn.onclick = () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;

    autoSolveBtn.style.display = 
      state.mode === 'manual' ? 'inline-block' : 'none';
  };
});

// ==================== KHỞI TẠO GAME ====================
startBtn.onclick = initGame;

function initGame() {
  const n = parseInt(diskCountInput.value);

  if (n > 20) {
    alert("Tối đa chỉ 20 đĩa!");
    diskCountInput.value = 20;
    return;
  }

  // Reset state
  state = {
    towers: { A: [], B: [], C: [] },
    mode: state.mode,
    moveCount: 0,
    startTime: Date.now(),
    selectedDisk: null
  };

  stepsList.innerHTML = '';
  clearTowers();

  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  // Tạo đĩa
  for (let i = n; i >= 1; i--) {
    state.towers.A.push(i);
    createDisk(i, 'A');
  }

  renderTowers();
  addStep(`Khởi tạo ${n} đĩa trên cọc A.`);

  if (state.mode === 'auto') {
    autoSolveBtn.style.display = 'none';
    setTimeout(playFastAnimation, 800);
  }
}

function createDisk(size, towerId) {
  const d = document.createElement('div');
  d.className = "disk";
  d.dataset.size = size;
  d.textContent = size;
  d.style.width = `${40 + size * 15}px`;
  d.style.background = `hsl(${size * 30}, 70%, 45%)`;
  d.draggable = true;

  d.ondragstart = dragStart;
  d.ondragend = dragEnd;

  towers[towerId].appendChild(d);
}

function clearTowers() {
  Object.values(towers).forEach(t => {
    t.innerHTML = `
      <div class="base"></div>
      <div class="pole"></div>
    `;
  });
}

function renderTowers() {
  ["A", "B", "C"].forEach(id => {
    const disks = towers[id].querySelectorAll('.disk');
    disks.forEach((d, i) => {
      d.style.bottom = `${25 + i * 25}px`;
    });
  });
}

// ==================== DRAG & DROP ====================
function dragStart(e) {
  if (state.mode !== 'manual') return;
  state.selectedDisk = e.target;
  e.target.classList.add("dragging");
}

function dragEnd(e) {
  e.target.classList.remove("dragging");
}

Object.values(towers).forEach(t => {
  t.ondragover = e => e.preventDefault();
  t.ondrop = e => {
    e.preventDefault();
    if (!state.selectedDisk || state.mode !== 'manual') return;

    const from = state.selectedDisk.parentElement.id.replace("tower", "");
    const to   = t.id.replace("tower", "");

    if (canMove(from, to)) {
      moveDisk(from, to);
      checkWin();
    }

    state.selectedDisk = null;
  };
});

function canMove(from, to) {
  const f = state.towers[from];
  const t = state.towers[to];

  if (!f.length) return false;

  const disk = f[f.length - 1];
  const top = t.length ? t[t.length - 1] : Infinity;

  return disk < top;
}

function moveDisk(from, to) {
  const disk = state.towers[from].pop();
  state.towers[to].push(disk);
  state.moveCount++;

  const diskEl = document.querySelector(`.disk[data-size="${disk}"]`);
  towers[to].appendChild(diskEl);

  renderTowers();
  addStep(`Di chuyển đĩa ${disk} từ ${from} → ${to}`);
}

function addStep(text) {
  const li = document.createElement('li');
  li.textContent = text;
  stepsList.appendChild(li);
  stepsList.scrollTop = stepsList.scrollHeight;
}

// ==================== AUTO SOLVE ====================
function generateAllStates(n, from = "A", to = "C", aux = "B") {
  const states = [];
  const towers = { A: [], B: [], C: [] };

  for (let i = n; i >= 1; i--) towers.A.push(i);
  states.push(JSON.parse(JSON.stringify(towers)));

  function solve(n, from, to, aux) {
    if (n === 0) return;
    solve(n - 1, from, aux, to);
    towers[to].push(towers[from].pop());
    states.push(JSON.parse(JSON.stringify(towers)));
    solve(n - 1, aux, to, from);
  }

  solve(n, from, to, aux);
  return states;
}

function renderState(st) {
  document.querySelectorAll('.disk').forEach(d => d.remove());

  ["A", "B", "C"].forEach(id => {
    st[id].forEach((size, idx) => {
      const d = document.createElement('div');
      d.className = 'disk';
      d.dataset.size = size;
      d.textContent = size;
      d.style.width = `${40 + size * 15}px`;
      d.style.background = `hsl(${size * 30}, 70%, 45%)`;
      d.style.bottom = `${25 + idx * 25}px`;
      towers[id].appendChild(d);
    });
  });
}

autoSolveBtn.onclick = () => playFastAnimation();

function playFastAnimation() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  const n = parseInt(diskCountInput.value);
  const allStates = generateAllStates(n);

  state.moveCount = 0;
  stepsList.innerHTML = "";
  addStep(`Máy đang giải với ${n} đĩa...`);

  let frame = 0;
  let prevState = allStates[0];

  function animate() {
    if (frame < allStates.length) {
      const currentState = allStates[frame];

      // So sánh trạng thái trước – sau để xác định bước đang di chuyển
      if (frame > 0) {
        const move = getMove(prevState, currentState);
        if (move) {
          state.moveCount++;
          addStep(`Bước ${state.moveCount}: ${move}`);
        }
      }

      prevState = currentState;

      renderState(currentState);
      frame++;

      animationFrameId = requestAnimationFrame(animate);
    }
    else {
      const time = ((Date.now() - state.startTime) / 1000).toFixed(1);
      addStep(`Hoàn thành máy giải trong ${time}s`);
      saveRecord(time);
    }
  }

  animate();
}

// Hàm tìm sự thay đổi giữa 2 trạng thái
function getMove(prev, curr) {
  for (let t of ["A", "B", "C"]) {
    if (prev[t].toString() !== curr[t].toString()) {
      // Tìm vị trí đĩa bị lấy ra và thêm vào
      if (prev[t].length > curr[t].length) {
        var from = t;
        var disk = prev[t][prev[t].length - 1];
      }
      if (curr[t].length > prev[t].length) {
        var to = t;
      }
    }
  }
  return disk ? `Di chuyển đĩa ${disk} từ ${from} → ${to}` : null;
}
// Tạo danh sách các bước di chuyển
function generateMoves(n, from, to, aux, moves) {
  if (n === 0) return;

  generateMoves(n - 1, from, aux, to, moves);
  moves.push([from, to]);               // Lưu bước di chuyển
  generateMoves(n - 1, aux, to, from, moves);
}

// Render lại tất cả đĩa theo state.towers
function renderAll() {
  document.querySelectorAll('.disk').forEach(d => d.remove());

  ["A", "B", "C"].forEach(t => {
    state.towers[t].forEach((size, index) => {
      const d = document.createElement("div");
      d.className = "disk";
      d.dataset.size = size;
      d.textContent = size;
      d.style.width = `${40 + size * 15}px`;
      d.style.background = `hsl(${size*30}, 70%, 45%)`;
      d.style.bottom = `${25 + index * 25}px`;
      towers[t].appendChild(d);
    });
  });
}

// Máy giải có animation + hiện bước
function playFastAnimation() {
  const n = parseInt(diskCountInput.value);

  // Tạo danh sách bước
  const moves = [];
  generateMoves(n, "A", "C", "B", moves);

  stepsList.innerHTML = "";
  addStep(`Máy giải ${n} đĩa...`);

  let index = 0;

  function doMove() {
    if (index >= moves.length) {
      const time = ((Date.now() - state.startTime) / 1000).toFixed(1);
      addStep(`✔ Hoàn thành trong ${time}s`);
      saveRecord(time);
      return;
    }

    const [from, to] = moves[index];

    // Cập nhật logic dữ liệu
    const disk = state.towers[from].pop();
    state.towers[to].push(disk);
    state.moveCount++;

    // Render đĩa
    renderAll();

    // Hiển thị bước
    addStep(`Bước ${state.moveCount}: Di chuyển đĩa ${disk} từ ${from} → ${to}`);

    index++;

    // Tốc độ animation (ms)
    setTimeout(doMove, 100);   
  }

  doMove();
}

// ==================== CHECK WIN ====================
function checkWin() {
  const n = parseInt(diskCountInput.value);

  if (state.towers.C.length === n) {
    const time = ((Date.now() - state.startTime) / 1000).toFixed(1);
    addStep(`HOÀN THÀNH! Thời gian: ${time}s`);
    saveRecord(time);
  }
}

// ==================== LƯU BẢNG XẾP HẠNG ====================
function saveRecord(time) {
  const record = {
    disks: parseInt(diskCountInput.value),
    moves: state.moveCount,
    time: parseFloat(time),
    mode: state.mode === 'manual' ? 'Tự giải' : 'Máy giải',
    date: new Date().toLocaleDateString('vi-VN')
  };

  let records = JSON.parse(localStorage.getItem('hanoiRecords') || '[]');
  records.push(record);

  records.sort((a, b) => a.moves - b.moves || a.time - b.time);
  records = records.slice(0, 50);

  localStorage.setItem('hanoiRecords', JSON.stringify(records));
}

function loadRanking() {
  const records = JSON.parse(localStorage.getItem('hanoiRecords') || '[]');
  rankTable.innerHTML = "";

  records.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.disks}</td>
      <td>${r.moves}</td>
      <td>${r.time}s</td>
      <td>${r.mode}</td>
      <td>${r.date}</td>
    `;
    rankTable.appendChild(tr);
  });
}

// ==================== RESET ====================
resetBtn.onclick = () => initGame();

// Khởi động
loadRanking();
