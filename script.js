// Game Constants
const GRAVITY = 0.5;
const JUMP = -10;
const PIPE_WIDTH = 80;
const GAP = 180;
const BIRD_SIZE = 40;
const WIDTH = 400;
const HEIGHT = 600;

// Game State
let birdY = 250;
let birdVelocity = 0;
let pipes = [];
let particles = [];
let score = 0;
let bestScore = 0;
let gameStarted = false;
let gameOver = false;
let soundEnabled = true;
let gameLoop = null;
let pipeInterval = null;

// Audio Context
let audioContext = null;

// DOM Elements
const bird = document.getElementById('bird');
const gameContainer = document.getElementById('gameContainer');
const scoreDisplay = document.getElementById('score');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const soundToggle = document.getElementById('soundToggle');
const restartBtn = document.getElementById('restartBtn');
const pipesContainer = document.getElementById('pipes');
const particlesContainer = document.getElementById('particles');
const finalScoreDisplay = document.getElementById('finalScore');
const bestScoreDisplay = document.getElementById('bestScoreDisplay');
const bestScoreGameover = document.getElementById('bestScoreGameover');

// Initialize
function init() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    setupEventListeners();
    updateBestScoreDisplay();
}

// Sound Functions
function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.log('Audio error:', error);
    }
}

// Particle System
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const particle = {
            id: Date.now() + i + Math.random(),
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 2,
            life: 1,
            color: color,
            size: Math.random() * 4 + 2
        };
        particles.push(particle);
        renderParticle(particle);
    }
}

function renderParticle(particle) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.id = 'particle-' + particle.id;
    el.style.left = particle.x + 'px';
    el.style.top = particle.y + 'px';
    el.style.width = particle.size + 'px';
    el.style.height = particle.size + 'px';
    el.style.backgroundColor = particle.color;
    el.style.opacity = particle.life;
    particlesContainer.appendChild(el);
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.life -= 0.02;
        
        const el = document.getElementById('particle-' + p.id);
        if (p.life > 0 && el) {
            el.style.left = p.x + 'px';
            el.style.top = p.y + 'px';
            el.style.opacity = p.life;
            return true;
        } else {
            if (el) el.remove();
            return false;
        }
    });
}

// Game Functions
function jump() {
    if (gameOver) return;
    
    if (!gameStarted) {
        startGame();
    }
    
    birdVelocity = JUMP;
    playSound(520, 0.1, 'square', 0.2);
    createParticles(100, birdY + BIRD_SIZE / 2, '#60a5fa', 6);
}

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');
    
    // Add flap animation to wing
    const wing = document.querySelector('.bird-wing');
    wing.classList.add('flap');
    
    // Start game loop
    gameLoop = setInterval(update, 1000 / 60);
    
    // Start pipe generation
    pipeInterval = setInterval(generatePipe, 2000);
}

function update() {
    if (!gameStarted || gameOver) return;
    
    // Update bird
    birdY += birdVelocity;
    birdVelocity += GRAVITY;
    
    // Check boundaries
    if (birdY > HEIGHT - BIRD_SIZE - 24 || birdY < 0) {
        endGame();
        return;
    }
    
    // Update bird position and rotation
    bird.style.top = birdY + 'px';
    const rotation = Math.min(Math.max(birdVelocity * 3, -30), 90);
    bird.style.transform = `rotate(${rotation}deg)`;
    
    // Update pipes
    updatePipes();
    
    // Update particles
    updateParticles();
}

function generatePipe() {
    if (!gameStarted || gameOver) return;
    
    const gap = Math.random() * (HEIGHT - GAP - 200) + 100;
    const pipe = {
        x: WIDTH,
        gap: gap,
        scored: false,
        id: Date.now()
    };
    
    pipes.push(pipe);
    renderPipe(pipe);
}

function renderPipe(pipe) {
    // Top pipe
    const topPipe = document.createElement('div');
    topPipe.className = 'pipe pipe-top';
    topPipe.id = 'pipe-top-' + pipe.id;
    topPipe.style.left = pipe.x + 'px';
    topPipe.style.top = '0';
    topPipe.style.height = pipe.gap + 'px';
    
    const topCap = document.createElement('div');
    topCap.className = 'pipe-cap pipe-cap-top';
    topPipe.appendChild(topCap);
    
    // Bottom pipe
    const bottomPipe = document.createElement('div');
    bottomPipe.className = 'pipe pipe-bottom';
    bottomPipe.id = 'pipe-bottom-' + pipe.id;
    bottomPipe.style.left = pipe.x + 'px';
    bottomPipe.style.top = (pipe.gap + GAP) + 'px';
    bottomPipe.style.height = (HEIGHT - pipe.gap - GAP) + 'px';
    
    const bottomCap = document.createElement('div');
    bottomCap.className = 'pipe-cap pipe-cap-bottom';
    bottomPipe.appendChild(bottomCap);
    
    pipesContainer.appendChild(topPipe);
    pipesContainer.appendChild(bottomPipe);
}

function updatePipes() {
    pipes = pipes.filter(pipe => {
        pipe.x -= 3;
        
        const topPipe = document.getElementById('pipe-top-' + pipe.id);
        const bottomPipe = document.getElementById('pipe-bottom-' + pipe.id);
        
        if (pipe.x < -PIPE_WIDTH) {
            if (topPipe) topPipe.remove();
            if (bottomPipe) bottomPipe.remove();
            return false;
        }
        
        if (topPipe && bottomPipe) {
            topPipe.style.left = pipe.x + 'px';
            bottomPipe.style.left = pipe.x + 'px';
        }
        
        // Collision detection
        if (100 + BIRD_SIZE > pipe.x && 100 < pipe.x + PIPE_WIDTH) {
            if (birdY < pipe.gap || birdY + BIRD_SIZE > pipe.gap + GAP) {
                endGame();
                return true;
            }
        }
        
        // Score
        if (pipe.x + PIPE_WIDTH < 100 && !pipe.scored) {
            pipe.scored = true;
            score++;
            scoreDisplay.textContent = score;
            playSound(800, 0.15, 'sine', 0.25);
            createParticles(100, birdY + BIRD_SIZE / 2, '#22c55e', 10);
        }
        
        return true;
    });
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    
    // Stop loops
    if (gameLoop) clearInterval(gameLoop);
    if (pipeInterval) clearInterval(pipeInterval);
    
    // Remove flap animation
    const wing = document.querySelector('.bird-wing');
    wing.classList.remove('flap');
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBestScore', bestScore);
        updateBestScoreDisplay();
    }
    
    // Show game over screen
    finalScoreDisplay.textContent = score;
    bestScoreGameover.textContent = bestScore;
    gameOverScreen.classList.remove('hidden');
    
    // Play sound and particles
    playSound(150, 0.4, 'sawtooth', 0.3);
    createParticles(100, birdY + BIRD_SIZE / 2, '#ef4444', 15);
}

function reset() {
    // Clear pipes
    pipes.forEach(pipe => {
        const topPipe = document.getElementById('pipe-top-' + pipe.id);
        const bottomPipe = document.getElementById('pipe-bottom-' + pipe.id);
        if (topPipe) topPipe.remove();
        if (bottomPipe) bottomPipe.remove();
    });
    pipes = [];
    
    // Clear particles
    particles.forEach(particle => {
        const el = document.getElementById('particle-' + particle.id);
        if (el) el.remove();
    });
    particles = [];
    
    // Reset state
    birdY = 250;
    birdVelocity = 0;
    score = 0;
    gameStarted = false;
    gameOver = false;
    
    // Update display
    bird.style.top = birdY + 'px';
    bird.style.transform = 'rotate(0deg)';
    scoreDisplay.textContent = '0';
    
    // Show start screen
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

function updateBestScoreDisplay() {
    const saved = localStorage.getItem('flappyBestScore');
    if (saved) {
        bestScore = parseInt(saved);
    }
    bestScoreDisplay.textContent = bestScore;
}

// Event Listeners
function setupEventListeners() {
    // Click/Touch
    gameContainer.addEventListener('click', jump);
    gameContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    }, { passive: false });
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            jump();
        }
        if (e.code === 'KeyR' && gameOver) {
            reset();
        }
    });
    
    // Sound toggle
    soundToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    });
    
    // Restart button
    restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        reset();
    });
}

// Start when page loads
window.addEventListener('load', init);