// SESLER (OYNATMA FONKSİYONLARI)
const eatSound = new Audio('assets/eat.mp3');
const crashSound = new Audio('assets/crash.mp3');

// Ses ön yükleme
eatSound.preload = 'auto';
crashSound.preload = 'auto';

let soundOn = true;

const soundButton = document.getElementById('soundToggle');
soundButton.classList.add('sound-on');

soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  soundButton.textContent = soundOn ? 'Ses Açık' : 'Ses Kapalı';
  soundButton.setAttribute('aria-label', soundOn ? 'Ses açık' : 'Ses kapalı');
  
  // Toggle classes for color
  soundButton.classList.toggle('sound-on', soundOn);
  soundButton.classList.toggle('sound-off', !soundOn);
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
const playAgainBtn = document.getElementById('playAgainBtn');
const speedBoostBtn = document.getElementById('speedBoostBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let direction = { x: 0, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let gameStarted = false;
let lastDirectionChange = 0;
const directionChangeCooldown = 100;

const skins = {
  green: '#00ff99',
  blue: '#0099ff',
  red: '#ff0033',
  neon: '#00ffff'
};

let animationFrameId = null;
let speedBoostActive = false;
const speedBoostDuration = 5000; // 5 saniye
const originalSpeeds = {
  easy: 200,
  medium: 150,
  hard: 100
};

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
  speedBoostActive = false;
  speedBoostBtn.disabled = false;

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  
  direction = { x: 1, y: 0 };
  lastDirectionChange = performance.now();
  
  placeFood();
  gameOverModal.classList.remove('active');

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Oyun bitirme fonksiyonu
function endGame() {
  gameStarted = false;
  speedBoostActive = false;
  speedBoostBtn.disabled = false;

  if (soundOn) {
    crashSound.currentTime = 0;
    crashSound.play();
  }

  finalScoreSpan.textContent = score;
  gameOverModal.classList.add('active');

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  saveScore(usernameInput.value.trim(), score);
  loadHighScores();
}

// Yiyecek yerleştirme
function placeFood() {
  const emptyCells = [];
  
  for (let x = 0; x < tileCount; x++) {
    for (let y = 0; y < tileCount; y++) {
      if (!snake.some(segment => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  
  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    food = emptyCells[randomIndex];
  } else {
    food = { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) };
  }
}

// Oyun güncelleme ve çizim
let lastFrameTime = 0;
let speed = 150;

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
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    return endGame();
  }

  if (snake.some((segment, index) => index > 0 && segment.x === head.x && segment.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

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
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
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

  const skinColor = skins[skinSelector.value] || '#00ff99';
  snake.forEach((segment, i) => {
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
      
      ctx.fillStyle = 'black';
      const eyeSize = gridSize / 8;
      const eyeOffset = gridSize / 4;
      
      let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
      
      if (direction.x === 1) {
        leftEyeX = segment.x * gridSize + gridSize - eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + gridSize - eyeOffset;
        rightEyeY = segment.y * gridSize + gridSize - eyeOffset;
      } else if (direction.x === -1) {
        leftEyeX = segment.x * gridSize + eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + eyeOffset;
        rightEyeY = segment.y * gridSize + gridSize - eyeOffset;
      } else if (direction.y === -1) {
        leftEyeX = segment.x * gridSize + eyeOffset;
        leftEyeY = segment.y * gridSize + eyeOffset;
        rightEyeX = segment.x * gridSize + gridSize - eyeOffset;
        rightEyeY = segment.y * gridSize + eyeOffset;
      } else {
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

// Tekrar Oyna
playAgainBtn.addEventListener('click', () => {
  gameOverModal.classList.remove('active');
  startGame();
});

// Start butonu
startBtn.addEventListener('click', startGame);

// Zorluk değişimi
difficultySelector.addEventListener('change', () => {
  if (gameStarted) {
    speed = parseInt(difficultySelector.value);
  }
});

// Hız Artır Butonu
speedBoostBtn.addEventListener('click', () => {
  if (!gameStarted || speedBoostActive) return;
  
  speedBoostActive = true;
  speedBoostBtn.disabled = true;
  
  const originalSpeed = speed;
  speed = Math.max(30, speed - 40); // Hızı artır
  
  setTimeout(() => {
    speed = originalSpeed;
    speedBoostActive = false;
    speedBoostBtn.disabled = false;
  }, speedBoostDuration);
});

// Yüksek skorları kaydet ve getir
function saveScore(username, score) {
  if (!username || score == null) return;
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

    const emojis = ["👑 ", "🥈 ", "🥉 "];

    scores.forEach((item, index) => {
      const li = document.createElement('li');

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'emoji';
      emojiSpan.textContent = emojis[index] || "";

      const rankSpan = document.createElement('span');
      rankSpan.textContent = `${index + 1}. `;
      rankSpan.className = 'rank';

      const usernameSpan = document.createElement('span');
      usernameSpan.textContent = item.username;
      usernameSpan.className = 'username';

          // Ok simgesi
      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'arrow';
      arrowSpan.textContent = '  →   ';

      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = item.score;
      scoreSpan.className = 'score-value';

      li.appendChild(emojiSpan);
      li.appendChild(rankSpan);
      li.appendChild(usernameSpan);
      li.appendChild(arrowSpan);

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
const sensitivity = 30;

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
  
  const maxDistance = 40;
  const distance = Math.min(maxDistance, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx);
  
  const joyX = Math.cos(angle) * distance;
  const joyY = Math.sin(angle) * distance;
  
  joystick.style.transform = `translate(${joyX}px, ${joyY}px)`;
  
  const now = performance.now();
  if (now - lastDirectionChange < directionChangeCooldown) return;
  
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
