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

const diskCountInput = document.getElementById('numDisks'); 
const modeBtns = document.querySelectorAll('.mode-btn');
const startBtn = document.getElementById('start-game');
const autoSolveBtn = document.getElementById('auto-solve');
const resetBtn = document.getElementById('reset-game');
const stepsList = document.getElementById('steps-list');
const rankTable = document.querySelector('#rank-table tbody');

// ==================== BIẾN TOÀN CỤC ====================
let gameStarted = false;
let isAnimating = false;
let animationFrameId = null;
let autoRunning = false;

// ==================== SPEED CONTROL ====================
const speedControl = document.getElementById("speedControl");
const speedLabel = document.getElementById("speed-label");

let moveDelay = Number(speedControl.value);

speedControl.addEventListener("input", () => {
  moveDelay = Number(speedControl.value);
  if (moveDelay <= 300) speedLabel.textContent = "Tốc độ: Rất nhanh";
  else if (moveDelay <= 700) speedLabel.textContent = "Tốc độ: Trung bình";
  else if (moveDelay <= 1200) speedLabel.textContent = "Tốc độ: Chậm";
  else speedLabel.textContent = "Tốc độ: Rất chậm";
});

// ==================== TRẠNG THÁI ====================
let state = {
  towers: { A: [], B: [], C: [] },
  mode: 'manual',
  moveCount: 0,
  startTime: null,
  selectedDisk: null
};

// ==================== ĐIỀU HƯỚNG ====================
document.getElementById('view-guide').onclick = () => showPage('guide');
document.getElementById('play-now').onclick = () => showPage('game');
document.getElementById('guide-link').onclick = (e) => { e.preventDefault(); showPage('guide'); };
document.getElementById('play-link').onclick = (e) => { e.preventDefault(); showPage('game'); };
document.getElementById('rank-link').onclick = (e) => { e.preventDefault(); loadRanking(); showPage('ranking'); };
document.getElementById('back-home').onclick = () => { resetGameState(); showPage('home'); };
document.getElementById('home-link').onclick = (e) => { e.preventDefault(); resetGameState(); showPage('home'); };
document.getElementById('back-rank').onclick = () => showPage('home');

function showPage(id) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[id].classList.add("active");
  window.scrollTo(0, 0);
}

// ==================== CHỌN CHẾ ĐỘ ====================
modeBtns.forEach(btn => {
  btn.onclick = async () => {
    if (gameStarted) {
      await showModal("Vui lòng bấm nút 'Làm lại' để thay đổi chế độ!");
      return;
    }
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;

    if (state.mode === 'manual') {
      startBtn.style.display = 'inline-block';
      autoSolveBtn.style.display = 'none';
    } else {
      startBtn.style.display = 'none';
      autoSolveBtn.style.display = 'inline-block';
    }
  };
});
// ==================== KHỞI TẠO GAME ====================
startBtn.onclick = () => {
  new Audio('assets/click.wav').play().catch(() => {});
  initGame();
};
async function initGame() {
  const n = parseInt(diskCountInput.value);
  if (n > 20 || isNaN(n) || n < 1) {
    await showModal("Vui lòng nhập số đĩa từ 1 đến 20!");
    return;
  }

  // Chỉ hỏi tên khi ở chế độ manual
  if (state.mode === "manual") {
    const playerName = await showModal("Chào mừng bạn đến với Tháp Hà Nội!\nVui lòng nhập tên để lưu bảng xếp hạng:", true);
    if (playerName && playerName.trim() !== "") {
      state.playerName = playerName.trim();
      localStorage.setItem('currentPlayerName', state.playerName);
    } else {
      state.playerName = "Người chơi";
      localStorage.setItem('currentPlayerName', "Người chơi");
    }
  }

  resetGameState(); // ← Sau reset, tên bị ghi đè thành "Chưa nhập"

  // === DI CHUYỂN DÒNG NÀY XUỐNG ĐÂY (SAU resetGameState) ===
  if (state.mode === "manual") {
    document.getElementById('current-player').textContent = state.playerName;
  }

  gameStarted = true;
  autoSolveBtn.disabled = state.mode === "manual";

  state.startTime = Date.now();

  console.log("Tạo", n, "đĩa...");

  for (let i = n; i >= 1; i--) {
    state.towers.A.push(i);
    createDisk(i, 'A');
  }

  renderTowers();
  addStep(`Khởi tạo ${n} đĩa trên cọc A (chế độ người chơi).`);
}
// ==================== CÁC HÀM HỖ TRỢ ====================
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
    t.innerHTML = `<div class="base"></div><div class="pole"></div>`;
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

function animateDiskMove(diskEl, fromTower, toTower, callback) {
  isAnimating = true;
  const fromRect = fromTower.getBoundingClientRect();
  const toRect = toTower.getBoundingClientRect();
  const dx = toRect.left - fromRect.left;
  const lift = 60;

  diskEl.style.transition = `transform ${moveDelay/3}ms ease`;
  diskEl.style.transform = `translate(-50%, -${lift}px)`;

  setTimeout(() => {
    diskEl.style.transform = `translate(calc(-50% + ${dx}px), -${lift}px)`;
    setTimeout(() => {
      diskEl.style.transform = `translate(calc(-50% + ${dx}px), 0)`;
      setTimeout(() => {
        diskEl.style.transition = '';
        diskEl.style.transform = '';
        isAnimating = false;
        callback();
        // === THÊM ÂM THANH DI CHUYỂN ĐĨA ===
        new Audio('assets/pop.wav').play().catch(() => {}); 
      }, moveDelay/3);
    }, moveDelay/3);
  }, moveDelay/3);
}

function addStep(text) {
  const li = document.createElement('li');
  li.textContent = text;
  stepsList.appendChild(li);
  stepsList.scrollTop = stepsList.scrollHeight;
}

// ==================== DRAG & DROP ====================
function dragStart(e) {
  if (state.mode !== 'manual' || isAnimating || !gameStarted) return;
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
    const to = t.id.replace("tower", "");
    if (canMove(from, to)) {
      moveDisk(from, to);
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
  const disk = state.towers[from][state.towers[from].length - 1];
  const diskEl = document.querySelector(`.disk[data-size="${disk}"]`);

  animateDiskMove(diskEl, towers[from], towers[to], () => {
    state.towers[from].pop();
    state.towers[to].push(disk);
    state.moveCount++;
    towers[to].appendChild(diskEl);
    renderTowers();
    addStep(`Di chuyển đĩa ${disk} từ ${from} → ${to}`);
    checkWin();
  });
}

// ==================== RESET ====================
function resetGameState() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  isAnimating = false;
  autoRunning = false;
  gameStarted = false;
  state.towers = { A: [], B: [], C: [] };
  state.moveCount = 0;
  state.startTime = null;
  state.selectedDisk = null;
  autoSolveBtn.disabled = false;
  stepsList.innerHTML = "";
  clearTowers();
  localStorage.removeItem('currentPlayerName');
  //document.getElementById('current-player').textContent = "Chưa nhập";
  localStorage.removeItem('currentPlayerName');
}

// ==================== AUTO SOLVE ====================
function generateMoves(n, from, to, aux, moves = []) {
  if (n === 0) return moves;
  generateMoves(n - 1, from, aux, to, moves);
  moves.push([from, to]);
  generateMoves(n - 1, aux, to, from, moves);
  return moves;
}

function playFastAnimation() {
  const n = parseInt(diskCountInput.value);
  const moves = generateMoves(n, "A", "C", "B");

  stepsList.innerHTML = "";
  addStep(`Máy giải ${n} đĩa...`);

  autoRunning = true;
  let index = 0;

  function doMove() {
    if (!autoRunning) return;
    if (index >= moves.length) {
      const time = ((Date.now() - state.startTime) / 1000).toFixed(1);
      addStep(`✔ Hoàn thành trong ${time}s`);
      saveRecord(time);
      autoRunning = false;
      return;
    }

    const [from, to] = moves[index];
    const disk = state.towers[from].pop();
    state.towers[to].push(disk);
    state.moveCount++;

    const diskEl = document.querySelector(`.disk[data-size="${disk}"]`);

    animateDiskMove(diskEl, towers[from], towers[to], () => {
      towers[to].appendChild(diskEl);
      renderTowers();
      addStep(`Bước ${state.moveCount}: Di chuyển đĩa ${disk} từ ${from} → ${to}`);
      index++;
      setTimeout(doMove, moveDelay);
    });
  }

  doMove();
}

// ==================== CHECK WIN & RANKING ====================
async function checkWin() {
  const n = parseInt(diskCountInput.value);
  if (state.towers.C.length === n) {
    const time = ((Date.now() - state.startTime) / 1000).toFixed(1);
    const minMoves = Math.pow(2, n) - 1;
    const efficiency = (state.moveCount / minMoves).toFixed(3);

    let msg = `🎉 Chúc mừng ${state.playerName || "Người chơi"}!\n\n`;
    msg += `Thời gian: ${time}s\n`;
    msg += `Số bước: ${state.moveCount} (tối thiểu ${minMoves})\n`;
    msg += `Hiệu suất: ${efficiency}\n\n`;

    if (parseFloat(efficiency) === 1) {
      msg += `HOÀN HẢO! Bạn đã giải đúng thuật toán tối ưu! 🏆🌟`;
    } else if (parseFloat(efficiency) <= 1.2) {
      msg += `RẤT TỐT! Bạn đã giải khá gần tối ưu! 👏`;
    } else if (parseFloat(efficiency) <= 1.5) {
      msg += `TỐT! Bạn đã hoàn thành bài toán! 👍`;
    } else {
      msg += `Chúc mừng bạn đã hoàn thành! Hãy thử lại để đạt hiệu suất tốt hơn nhé! 💪`;
    }

    addStep(`HOÀN THÀNH! Thời gian: ${time}s`);
    await showModal(msg);
    saveRecord(time);
    new Audio('assets/win.wav').play().catch(() => {});
  }
}

function saveRecord(time) {
  if (state.mode !== 'manual') return;

  let playerName = localStorage.getItem('currentPlayerName');
  if (!playerName || playerName.trim() === "") {
    playerName = state.playerName || "Người chơi";
  }

  const n = parseInt(diskCountInput.value);
  const minMoves = Math.pow(2, n) - 1; // Số bước tối thiểu
  const efficiency = (state.moveCount / minMoves).toFixed(3); // Hiệu suất (càng gần 1 càng tốt)

  const record = {
    playerName: playerName.trim(),
    disks: n,
    moves: state.moveCount,
    minMoves: minMoves,        // Thêm để hiển thị
    efficiency: parseFloat(efficiency), // Chuyển thành số để sort dễ
    time: parseFloat(time),
    date: new Date().toLocaleDateString('vi-VN')
  };

  let records = JSON.parse(localStorage.getItem('hanoiRecords') || '[]');
  records.push(record);

  // === SẮP XẾP MỚI: Công bằng hơn ===
  records.sort((a, b) => {
    if (b.disks !== a.disks) return b.disks - a.disks; // Nhiều đĩa hơn xếp trước
    if (a.efficiency !== b.efficiency) return a.efficiency - b.efficiency; // Hiệu suất tốt hơn (gần 1) xếp trước
    if (a.moves !== b.moves) return a.moves - b.moves; // Ít bước hơn
    return a.time - b.time; // Nhanh hơn
  });

  records = records.slice(0, 10);
  localStorage.setItem('hanoiRecords', JSON.stringify(records));
  localStorage.removeItem('currentPlayerName');
}
function loadRanking() {
  const records = JSON.parse(localStorage.getItem('hanoiRecords') || '[]');
  rankTable.innerHTML = "";

  if (records.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align:center; color:#888; padding:30px; font-style:italic;">Chưa có kỷ lục nào. Hãy chơi và hoàn thành để lưu bảng xếp hạng nhé! 😊</td>`;
    rankTable.appendChild(tr);
    return;
  }

  records.forEach((r, i) => {
    const tr = document.createElement('tr');

    // XỬ LÝ HIỆU SUẤT AN TOÀN HOÀN TOÀN
    let effDisplay = "?";
    let effValue = null;
    if (r.efficiency !== undefined && r.efficiency !== null) {
      effValue = parseFloat(r.efficiency);
      if (!isNaN(effValue)) {
        effDisplay = effValue.toFixed(3);
      }
    }

    const trophy = effDisplay === "1.000" ? ' 🏆' : '';

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.playerName || "Người chơi"}${trophy}</td>
      <td>${r.disks || "?"}</td>
      <td>${r.moves || "?"} (${r.minMoves || "?"})</td>
      <td>${effDisplay}</td>
      <td>${r.time ? r.time + "s" : "?"}</td>
      <td>${r.date || "?"}</td>
    `;
    rankTable.appendChild(tr);
  });
}
// ==================== NÚT ĐIỀU KHIỂN ====================
resetBtn.onclick = () => {
  new Audio('assets/click.wav').play().catch(() => {});
  resetGameState();
  // Sau reset, hiển thị nút đúng chế độ hiện tại
  if (state.mode === 'manual') {
    startBtn.style.display = 'inline-block';
    autoSolveBtn.style.display = 'none';
  } else {
    startBtn.style.display = 'none';
    autoSolveBtn.style.display = 'inline-block';
  }
};

autoSolveBtn.onclick = async () => {
  new Audio('assets/click.wav').play().catch(() => {});
  if (gameStarted) return;
  resetGameState();
  state.mode = "auto";
  gameStarted = true;
  const n = parseInt(diskCountInput.value);
  if (isNaN(n) || n < 1 || n > 20) {
    await showModal("Vui lòng nhập số đĩa từ 1 đến 20!");
    return;
  }
  state.startTime = Date.now();
  for (let i = n; i >= 1; i--) {
    state.towers.A.push(i);
    createDisk(i, 'A');
  }
  renderTowers();
  addStep(`Khởi tạo ${n} đĩa trên cọc A (chế độ máy).`);
  playFastAnimation();
};
// ==================== CUSTOM MODAL ====================
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalBody = document.getElementById('modal-body');
const modalOk = document.getElementById('modal-ok');
const modalClose = document.querySelector('.modal-close');

let resolveModalPromise; // Để chờ người dùng bấm OK

function showModal(message, showInput = false) {
  return new Promise((resolve) => {
    modalMessage.textContent = message;
    
    // Hiển thị hoặc ẩn phần nhập tên
    const inputGroup = document.getElementById('name-input-group');
    if (!inputGroup) return; // An toàn
    if (showInput) {
      inputGroup.style.display = 'block';
      document.getElementById('playerNameInput').focus();
    } else {
      inputGroup.style.display = 'none';
    }

    customModal.style.display = 'flex';
    resolveModalPromise = resolve;

    // Xử lý bấm OK
    modalOk.onclick = () => {
      let name = "Người chơi";
      if (showInput) {
        name = document.getElementById('playerNameInput').value.trim();
        if (name === "") {
          modalMessage.textContent = "Vui lòng nhập tên người chơi!";
          return; // Không đóng modal
        }
      }
      customModal.style.display = 'none';
      resolve(name);
    };
  });
}

// Đóng modal bằng nút X hoặc click ngoài
modalClose.onclick = () => { customModal.style.display = 'none'; };
customModal.onclick = (e) => {
  if (e.target === customModal) customModal.style.display = 'none';
};
// Khởi động
loadRanking();