// SESLER (OYNATMA FONKSİYONLARI)
const eatSound = new Audio('assets/eat.mp3');
const crashSound = new Audio('assets/crash.mp3');

// Ses ön yükleme
eatSound.preload = 'auto';
crashSound.preload = 'auto';

let soundOn = true;

document.getElementById('soundToggle').addEventListener('click', () => {
  soundOn = !soundOn;
  const soundButton = document.getElementById('soundToggle');
  soundButton.textContent = soundOn ? 'Ses Açık' : 'Ses Kapalı';
  soundButton.setAttribute('aria-label', soundOn ? 'Ses açık' : 'Ses kapalı');
});

// CANVAS & OYUN DEĞİŞKENLERİ
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 400;

const scoreDisplay = document.getElementById('score');
const highScoresList = document.getElementById('highScoresList');
const startBtn = document.getElementById('startBtn');
const usernameInput = document.getElementById('username');
const skinSelector = document.getElementById('skinSelector');
const difficultySelector = document.getElementById('difficultySelector');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreSpan = document.getElementById('finalScore');
const closeModalBtn = document.getElementById('closeModalBtn');
const joystickContainer = document.getElementById('joystickContainer');
const joystick = document.getElementById('joystick');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let direction = { x: 0, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let gameStarted = false;
let lastDirectionChange = 0;
const directionChangeCooldown = 100; // 100ms cooldown

const skins = {
  green: '#00ff99',
  blue: '#0099ff',
  red: '#ff0033',
  neon: '#00ffff'
};

let animationFrameId = null; // requestAnimationFrame id

// Firebase import ve setup
import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoPKRND8gksuDg_RegLVs8xI3wxHupy3o",
  authDomain: "snakeio100.firebaseapp.com",
  databaseURL: "https://snakeio100-default-rtdb.firebaseio.com/",
  projectId: "snakeio100",
  storageBucket: "snakeio100.appspot.com",
  messagingSenderId: "837914150930",
  appId: "1:837914150930:web:0ae17bdfd7bb923727b0cb",
  measurementId: "G-VB0YK5EKGT"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Oyun başlatma fonksiyonu
function startGame() {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Lütfen kullanıcı adınızı girin!");
    return;
  }

  gameStarted = true;
  score = 0;
  speed = parseInt(difficultySelector.value);
  scoreDisplay.textContent = score;

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  
  direction = { x: 1, y: 0 };
  lastDirectionChange = performance.now();
  
  placeFood();
  gameOverModal.classList.remove('active'); // Modal'ı kapat

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Oyun bitirme fonksiyonu
function endGame() {
  gameStarted = false;

  if (soundOn) {
    crashSound.currentTime = 0;
    crashSound.play();
  }

  finalScoreSpan.textContent = score;
  gameOverModal.classList.add('active'); // Modal'ı göster

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  saveScore(usernameInput.value.trim(), score);
  loadHighScores();
}

// Yiyecek yerleştirme (optimize edilmiş versiyon)
function placeFood() {
  const emptyCells = [];
  
  // Tüm boş hücreleri bul
  for (let x = 0; x < tileCount; x++) {
    for (let y = 0; y < tileCount; y++) {
      if (!snake.some(segment => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  
  // Rastgele boş hücre seç
  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    food = emptyCells[randomIndex];
  } else {
    // Boş hücre yoksa (tüm alan doluysa) merkeze yerleştir
    food = { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) };
  }
}

// Oyun güncelleme ve çizim
let lastFrameTime = 0;
let speed = 150; // default orta zorluk

function gameLoop(currentTime) {
  if (!gameStarted) return;

  if (currentTime - lastFrameTime > speed) {
    update();
    draw();
    lastFrameTime = currentTime;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function update() {
  // Yeni kafayı oluştur
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Duvarlara çarpma kontrolü
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    return endGame();
  }

  // Kendi üzerine çarpma
  if (snake.some((segment, index) => index > 0 && segment.x === head.x && segment.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  // Yemek yedi mi kontrolü
  if (head.x === food.x && head.y === food.y) {
    if (soundOn) {
      eatSound.currentTime = 0;
      eatSound.play();
    }
    score++;
    scoreDisplay.textContent = score;
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  // Arka plan
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Izgara çizgileri
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(canvas.width, i * gridSize);
    ctx.stroke();
  }

  // Yemek çiz
  ctx.fillStyle = '#ff5500';
  ctx.beginPath();
  ctx.arc(
    food.x * gridSize + gridSize / 2,
    food.y * gridSize + gridSize / 2,
    gridSize / 2 - 1,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Yılan çizimi
  const skinColor = skins[skinSelector.value] || '#00ff99';
  snake.forEach((segment, i) => {
    // Kafa için özel çizim
    if (i === 0) {
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(
        segment.x * gridSize + gridSize / 2,
        segment.y * gridSize + gridSize / 2,
        gridSize / 2 - 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Gözler
      ctx.fillStyle = 'black';
      const eyeSize = gridSize / 8;
      const eyeOffset = gridSize / 4;
      
      // Göz pozisyonları yöne göre ayarla
      let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
      
      if (direction.x === 1) { // Sağa
        leftEyeX = segment.x * gridSize + gridSize - eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + gridSize - eyeOffset;
        rightEyeY = segment.y * gridSize + gridSize - eyeOffset;
      } else if (direction.x === -1) { // Sola
        leftEyeX = segment.x * gridSize + eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + eyeOffset;
        rightEyeY = segment.y * gridSize + gridSize - eyeOffset;
      } else if (direction.y === -1) { // Yukarı
        leftEyeX = segment.x * gridSize + eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + gridSize - eyeOffset;
        rightEyeY = segment.y * gridSize + eyeOffset;
      } else { // Aşağı
        leftEyeX = segment.x * gridSize + eyeOffset;
        leftEyeY = segment.y * gridSize + gridSize - eyeOffset;
        rightEyeX = segment.x * gridSize + gridSize - eyeOffset;
        rightEyeY = segment.y * gridSize + gridSize - eyeOffset;
      }
      
      ctx.beginPath();
      ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      return;
    }
    
    // Vücut parçaları
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(
      segment.x * gridSize + gridSize / 2,
      segment.y * gridSize + gridSize / 2,
      gridSize / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Vücut deseni
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      segment.x * gridSize + gridSize / 2,
      segment.y * gridSize + gridSize / 2,
      gridSize / 3,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  });
}

// Klavye yön kontrolü
function handleKeyDown(e) {
  if (!gameStarted) return;
  
  // Yön değiştirme cooldown kontrolü
  const now = performance.now();
  if (now - lastDirectionChange < directionChangeCooldown) return;
  
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      if (direction.y !== 1) {
        direction = { x: 0, y: -1 };
        lastDirectionChange = now;
      }
      break;
    case 'arrowdown':
    case 's':
      if (direction.y !== -1) {
        direction = { x: 0, y: 1 };
        lastDirectionChange = now;
      }
      break;
    case 'arrowleft':
    case 'a':
      if (direction.x !== 1) {
        direction = { x: -1, y: 0 };
        lastDirectionChange = now;
      }
      break;
    case 'arrowright':
    case 'd':
      if (direction.x !== -1) {
        direction = { x: 1, y: 0 };
        lastDirectionChange = now;
      }
      break;
  }
}

window.addEventListener('keydown', handleKeyDown);

// Modal Kapatma
closeModalBtn.addEventListener('click', () => {
  gameOverModal.classList.remove('active');
});

// Start butonu
startBtn.addEventListener('click', startGame);

// Zorluk değişimi
difficultySelector.addEventListener('change', () => {
  if (gameStarted) {
    speed = parseInt(difficultySelector.value);
  }
});

// Yüksek skorları kaydet ve getir
function saveScore(username, score) {
  if (!username || !score) return;
  const scoresRef = ref(database, 'scores');
  push(scoresRef, {
    username: username,
    score: score,
    date: Date.now()
  });
}

function loadHighScores() {
  const scoresRef = query(ref(database, 'scores'), orderByChild('score'), limitToLast(5));
  onValue(scoresRef, (snapshot) => {
    highScoresList.innerHTML = '';
    const scores = [];
    snapshot.forEach(childSnap => {
      scores.push(childSnap.val());
    });

    scores.sort((a, b) => b.score - a.score);

    scores.forEach((item, index) => {
      const li = document.createElement('li');
      
      const rankSpan = document.createElement('span');
      rankSpan.textContent = `${index + 1}. `;
      rankSpan.className = 'rank';
      
      const usernameSpan = document.createElement('span');
      usernameSpan.textContent = item.username;
      usernameSpan.className = 'username';
      
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = item.score;
      scoreSpan.className = 'score-value';
      
      li.appendChild(rankSpan);
      li.appendChild(usernameSpan);
      li.appendChild(scoreSpan);
      highScoresList.appendChild(li);
    });
  });
}

// İlk yüklemede skorları göster
loadHighScores();

// Mobil joystick göster/gizle
function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

if (isMobile()) {
  joystickContainer.style.display = 'block';
}

// Basit joystick hareketi
let joystickActive = false;
let startX, startY;
const sensitivity = 30; // Pixel eşiği

joystickContainer.addEventListener('touchstart', e => {
  if (!gameStarted) return;
  joystickActive = true;
  const touch = e.touches[0];
  const rect = joystickContainer.getBoundingClientRect();
  startX = rect.left + rect.width / 2;
  startY = rect.top + rect.height / 2;
});

joystickContainer.addEventListener('touchmove', e => {
  if (!joystickActive || !gameStarted) return;
  e.preventDefault();

  const touch = e.touches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  
  // Joystick görsel hareketi (sınırlı)
  const maxDistance = 40;
  const distance = Math.min(maxDistance, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx);
  
  const joyX = Math.cos(angle) * distance;
  const joyY = Math.sin(angle) * distance;
  
  joystick.style.transform = `translate(${joyX}px, ${joyY}px)`;
  
  // Yön değiştirme cooldown kontrolü
  const now = performance.now();
  if (now - lastDirectionChange < directionChangeCooldown) return;
  
  // Yön belirleme
  if (Math.abs(dx) > sensitivity || Math.abs(dy) > sensitivity) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && direction.x !== -1) {
        direction = { x: 1, y: 0 };
        lastDirectionChange = now;
      } else if (dx < 0 && direction.x !== 1) {
        direction = { x: -1, y: 0 };
        lastDirectionChange = now;
      }
    } else {
      if (dy > 0 && direction.y !== -1) {
        direction = { x: 0, y: 1 };
        lastDirectionChange = now;
      } else if (dy < 0 && direction.y !== 1) {
        direction = { x: 0, y: -1 };
        lastDirectionChange = now;
      }
    }
  }
});

joystickContainer.addEventListener('touchend', () => {
  joystickActive = false;
  joystick.style.transform = 'translate(-50%, -50%)';
});