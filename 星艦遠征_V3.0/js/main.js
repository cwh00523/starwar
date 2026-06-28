"use strict";
// ==================== 主程式 – 初始化、事件綁定、全域狀態 ====================

// DOM 引用
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const $ = id => document.getElementById(id);
const scoreText = $('scoreText'), healthText = $('healthText'), shieldText = $('shieldText');
const weaponLvText = $('weaponLvText'), ultLvText = $('ultLvText'), speedText = $('speedText');
const timerText = $('timerText'), autoAimText = $('autoAimText'), stageText = $('stageText');
const weaponText = $('weaponText'), chargeBarContainer = $('chargeBarContainer'), chargeFill = $('chargeFill');
const bossHpContainer = $('bossHpContainer');

// 狀態變數（使用全域 STATE，不再重複定義）
let gameState = 0;
let level = 1, score = 0, killsNeeded = 8, killsCount = 0;
let levelStartTime = Date.now(), levelShots = 0, levelHits = 0;
let scrollX = 0, targetScrollX = 0, shakeTimer = 0, comboCount = 0, comboTimer = 0;
let pendingLevelReset = false, levelIntroText = '', levelIntroTimer = 0;
let enemySpeedMultiplier = 1, enemySpeedTimer = 0, enemyBulletSpeedMultiplier = 1, enemyBulletSpeedTimer = 0;
let autoAim = false, endingSequence = false;
let WORLD_HEIGHT = 600, scaleFactor = 1, magnetRange = 150;
let playerName = '艦長';
let sensitivity = 0.12;
let keys = {};
let mouseX = 400, mouseY = 300, mouseLeft = false;
let joystickActive = false, joystickId = null, joystickX = 0, joystickY = 0;

// ==================== 螢幕適配 ====================
function resizeGame(){
  const w = window.innerWidth || 800;
  const h = window.innerHeight || 600;
  canvas.width = w;
  canvas.height = h;
  WORLD_HEIGHT = h;
  scaleFactor = (w < 768) ? 0.5 : (w < 1024 ? 0.8 : 1.0);
  player.size = 32 * scaleFactor;
}
window.addEventListener('resize', resizeGame);

function requestFullscreen(){
  const el = document.documentElement;
  if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if(el.msRequestFullscreen) el.msRequestFullscreen();
}

// ==================== BGM UI 同步 ====================
function updateBgmUI() {
  const playBtn = document.getElementById('bgmPlayBtn');
  const pauseStatus = document.getElementById('pauseBgmStatus');
  const inGameStatus = document.getElementById('bgmInGameStatus');
  const songSelect = document.getElementById('bgmSongSelect');

  const isPlaying = window.isBgmPlayingNow ? window.isBgmPlayingNow() : false;
  const idx = window.getCurrentBgmIndex ? window.getCurrentBgmIndex() : 0;
  const nameList = window.BGM_DISPLAY_NAMES || [];
  const currentName = nameList[idx] || '未知曲目';

  if (playBtn) {
    playBtn.textContent = isPlaying ? '⏹' : '▶';
    playBtn.classList.toggle('playing', isPlaying);
  }
  if (pauseStatus) pauseStatus.textContent = isPlaying ? `▶ ${currentName}` : '⏹ ' + t('stopped');
  if (inGameStatus) {
    if (isPlaying) {
      inGameStatus.textContent = `🎵 ${currentName}`;
      inGameStatus.style.display = 'block';
    } else {
      inGameStatus.textContent = '🎵 ' + t('stopped');
      inGameStatus.style.display = 'none';
    }
  }
  if (songSelect) songSelect.value = idx;
}

function initBGMPlayerUI() {
  const songSelect = document.getElementById('bgmSongSelect');
  if (!songSelect) return;
  songSelect.innerHTML = '';
  const nameList = window.BGM_DISPLAY_NAMES || [];
  nameList.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    songSelect.appendChild(opt);
  });

  songSelect.addEventListener('change', function() {
    const idx = parseInt(this.value);
    if (!isNaN(idx)) {
      window.playBGM(idx);
      updateBgmUI();
    }
  });

  const playBtn = document.getElementById('bgmPlayBtn');
  if (playBtn) {
    playBtn.addEventListener('click', function() {
      const isPlaying = window.isBgmPlayingNow ? window.isBgmPlayingNow() : false;
      if (isPlaying) {
        window.stopBGM();
      } else {
        const idx = parseInt(songSelect.value) || 0;
        window.playBGM(idx);
      }
      updateBgmUI();
    });
  }

  // 暫停選單內的控制
  const pausePlay = document.getElementById('pauseBgmPlayBtn');
  if (pausePlay) {
    pausePlay.addEventListener('click', function() {
      const isPlaying = window.isBgmPlayingNow ? window.isBgmPlayingNow() : false;
      if (isPlaying) {
        window.stopBGM();
      } else {
        const idx = parseInt(songSelect.value) || 0;
        window.playBGM(idx);
      }
      updateBgmUI();
    });
  }
  const pausePrev = document.getElementById('pauseBgmPrevBtn');
  if (pausePrev) {
    pausePrev.addEventListener('click', function() {
      const idx = parseInt(songSelect.value) || 0;
      const nameList = window.BGM_DISPLAY_NAMES || [];
      const newIdx = (idx - 1 + nameList.length) % nameList.length;
      songSelect.value = newIdx;
      window.playBGM(newIdx);
      updateBgmUI();
    });
  }
  const pauseNext = document.getElementById('pauseBgmNextBtn');
  if (pauseNext) {
    pauseNext.addEventListener('click', function() {
      const idx = parseInt(songSelect.value) || 0;
      const nameList = window.BGM_DISPLAY_NAMES || [];
      const newIdx = (idx + 1) % nameList.length;
      songSelect.value = newIdx;
      window.playBGM(newIdx);
      updateBgmUI();
    });
  }

  window._updateBgmUI = updateBgmUI;
  updateBgmUI();
}

// ==================== 語言切換 ====================
function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      if (el.id === 'storyText') {
        el.textContent = t('storyContent') || t('story');
      } else if (el.id === 'endingText') {
        el.textContent = t('endingContent') || t('ending');
      } else {
        el.textContent = t(key);
      }
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  document.title = t('windowTitle') || '星艦遠征';
  const gameOverTitle = document.getElementById('gameOverTitle');
  if (gameOverTitle) gameOverTitle.textContent = t('gameOver');
  if (typeof updateUI === 'function') updateUI();
  updateBgmUI();
}

function switchLanguage(lang) {
  currentLocale = LOCALES[lang] || LOCALES.zh;
  applyLanguage();
  if (gameState === STATE.PLAYING || gameState === STATE.PAUSED) {
    const stage = getStageName(level);
    stageText.textContent = stage;
  }
}

// ==================== 共用：故事畫面結束後啟動遊戲 ====================
function startGameFromStory(){
  try {
    $('storyOverlay').classList.remove('show');
    const tl = window._targetLevel;
    if(tl !== undefined && tl > 0){
      level = tl - 1;
      score = 0;
      player.health = 3;
      player.shieldCount = 0;
      weaponLevel = 1;
      ultLevel = 1;
      currentWeapon = 0;
      player.attackBonus = 0;
      player.x = 200;
      player.y = canvas.height / 2;
      gameState = STATE.PLAYING;
      pendingLevelReset = false;
      performLevelReset();
      window._targetLevel = -1;
    } else {
      resetGame();
    }
    gameState = STATE.PLAYING;
    $('uiLayer').style.display = 'flex';
    $('gameOverOverlay').style.display = 'none';
    $('pauseOverlay').style.display = 'none';
    updateUI();
  } catch(e) {
    console.warn('startGameFromStory error:', e);
    resetGame();
  }
}

// ==================== 設備檢測 ====================
function detectTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// ==================== 初始化 ====================
function init(){
  try {
    resizeGame();

    // 隱藏觸控按鈕（非觸控裝置）
    if (!detectTouchDevice()) {
      const tc = document.getElementById('touchControls');
      if (tc) tc.style.display = 'none';
    }

    // --- BGM UI ---
    initBGMPlayerUI();

    // --- 語言切換 ---
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      langSelect.addEventListener('change', function() {
        switchLanguage(this.value);
      });
    }

    // --- 載入存檔 ---
    const loadBtn = document.getElementById('loadSaveBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', function() {
        document.getElementById('importFileInput').click();
      });
    }

    // --- 出發按鈕 ---
    const startBtn = $('startGameBtn');
    if(startBtn) {
      startBtn.addEventListener('click', function(e){
        try {
          playerName = $('playerNameInput').value.trim() || '艦長';
          const lang = $('languageSelect').value;
          currentLocale = LOCALES[lang] || LOCALES.zh;
          applyLanguage();

          const unlockCode = $('unlockInput').value;
          const code = unlockCode.trim().toUpperCase();
          let targetLevel = -1;
          if(code === 'AUTO' || code === 'AIM'){
            autoAim = true;
          } else if(code.startsWith('STAR-')){
            const num = parseInt(code.split('-')[1]);
            if(num >= 1 && num <= CONFIG.TOTAL_LEVELS){ targetLevel = num; autoAim = true; }
          }

          const storyText = $('storyText');
          if(storyText) storyText.textContent = t('storyContent') || t('story') || '🚀 冒險即將開始...';
          $('storySkipBtn').classList.remove('enabled');
          $('storyOverlay').classList.add('show');
          $('loginOverlay').style.display = 'none';
          requestFullscreen();
          window._targetLevel = targetLevel;
          setTimeout(() => { $('storySkipBtn').classList.add('enabled'); }, 3000);
        } catch(err) {
          console.error('出發按鈕錯誤:', err);
          resetGame();
          $('loginOverlay').style.display = 'none';
          $('uiLayer').style.display = 'flex';
        }
      });
    }

    // --- 故事按鈕 ---
    const storyStart = $('storyStartBtn');
    if(storyStart) storyStart.addEventListener('click', startGameFromStory);
    const storySkip = $('storySkipBtn');
    if(storySkip) {
      storySkip.addEventListener('click', function(){
        if(this.classList.contains('enabled')) startGameFromStory();
      });
    }

    // --- 排行榜 ---
    const leaderBtn = $('leaderboardBtn');
    if(leaderBtn) leaderBtn.addEventListener('click', showLeaderboard);
    const closeLeader = $('closeLeaderboardBtn');
    if(closeLeader) closeLeader.addEventListener('click', ()=>{ $('leaderboardOverlay').style.display = 'none'; });

    // --- 暫停選單 ---
    const resumeBtn = $('resumeFromPauseBtn');
    if(resumeBtn) resumeBtn.addEventListener('click', ()=>{
      gameState = STATE.PLAYING;
      $('pauseOverlay').style.display = 'none';
    });
    const restartPause = $('restartFromPauseBtn');
    if(restartPause) restartPause.addEventListener('click', ()=>{
      $('pauseOverlay').style.display = 'none';
      resetGame();
    });
    const backMenu = $('backToMenuBtn');
    if(backMenu) backMenu.addEventListener('click', ()=>{
      $('pauseOverlay').style.display = 'none';
      $('gameOverOverlay').style.display = 'none';
      $('loginOverlay').style.display = 'flex';
      gameState = STATE.LOGIN;
      $('uiLayer').style.display = 'none';
    });

    // --- Game Over ---
    const restartGame = $('restartGameBtn');
    if(restartGame) restartGame.addEventListener('click', resetGame);
    const backMenuGameOver = $('backToMenuFromGameOverBtn');
    if(backMenuGameOver) backMenuGameOver.addEventListener('click', ()=>{
      $('gameOverOverlay').style.display = 'none';
      $('loginOverlay').style.display = 'flex';
      gameState = STATE.LOGIN;
      $('uiLayer').style.display = 'none';
    });

    // --- 說明 ---
    const helpBtn = $('helpBtn');
    if(helpBtn) helpBtn.addEventListener('click', ()=>{ $('helpOverlay').classList.add('show'); });
    const closeHelp = $('closeHelpBtn');
    if(closeHelp) closeHelp.addEventListener('click', ()=>{ $('helpOverlay').classList.remove('show'); });
    const helpOverlay = $('helpOverlay');
    if(helpOverlay) helpOverlay.addEventListener('click', (e)=>{ if(e.target === helpOverlay) helpOverlay.classList.remove('show'); });

    // --- 存檔匯出/匯入 ---
    const exportBtn = $('exportSaveBtn');
    if(exportBtn) exportBtn.addEventListener('click', exportSave);
    const importBtn = $('importSaveBtn');
    if(importBtn) importBtn.addEventListener('click', ()=>{ $('importFileInputPause').click(); });
    const fileInputPause = $('importFileInputPause');
    if(fileInputPause) {
      fileInputPause.addEventListener('change', (e)=>{
        if(e.target.files.length > 0) importSave(e.target.files[0]);
        e.target.value = '';
      });
    }
    // 登入頁的 importFileInput 已在 save.js 綁定，此處無需重複

    // --- 結局 ---
    const endingContinue = $('endingContinueBtn');
    if(endingContinue) endingContinue.addEventListener('click', ()=>{
      $('endingOverlay').style.display = 'none';
      $('loginOverlay').style.display = 'flex';
      gameState = STATE.LOGIN;
      $('uiLayer').style.display = 'none';
      endingSequence = false;
    });

    // ==================== 觸控按鈕 ====================
    const tbShoot = $('tbShoot');
    if(tbShoot) {
      tbShoot.addEventListener('touchstart', (e)=>{
        e.preventDefault();
        mouseLeft = !mouseLeft;
        const btn = $('tbShoot');
        if(mouseLeft){ btn.classList.add('active'); btn.textContent = '🔫 ON'; }
        else { btn.classList.remove('active'); btn.textContent = '🔫'; }
      });
    }
    const tbCharge = $('tbCharge');
    if(tbCharge) {
      tbCharge.addEventListener('touchstart', (e)=>{ e.preventDefault(); isCharging = true; });
      tbCharge.addEventListener('touchend',   (e)=>{ e.preventDefault(); isCharging = false; });
    }
    const tbUlt = $('tbUlt');
    if(tbUlt) tbUlt.addEventListener('click', ()=>{ if(gameState === STATE.PLAYING) ultimate(); });
    const tbShield = $('tbShield');
    if(tbShield) tbShield.addEventListener('click', ()=>{ if(gameState === STATE.PLAYING) activateShield(); });
    const tbWeapon = $('tbWeapon');
    if(tbWeapon) {
      tbWeapon.addEventListener('click', ()=>{
        if(gameState !== STATE.PLAYING) return;
        const unlocked = getUnlockedWeapons();
        if(unlocked.length === 0) return;
        let idx = unlocked.indexOf(currentWeapon);
        idx = (idx + 1) % unlocked.length;
        currentWeapon = unlocked[idx];
        updateUI();
      });
    }

    // ==================== 鍵盤事件 ====================
    window.addEventListener('keydown', (e)=>{
      // BGM 熱鍵
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        const isPlaying = window.isBgmPlayingNow ? window.isBgmPlayingNow() : false;
        if (isPlaying) {
          window.stopBGM();
        } else {
          const select = document.getElementById('bgmSongSelect');
          const idx = select ? parseInt(select.value) || 0 : 0;
          window.playBGM(idx);
        }
        updateBgmUI();
        return;
      }
      if (e.key === 'B' && e.shiftKey) {
        e.preventDefault();
        const select = document.getElementById('bgmSongSelect');
        if (select) {
          const idx = parseInt(select.value) || 0;
          const nameList = window.BGM_DISPLAY_NAMES || [];
          const newIdx = (idx - 1 + nameList.length) % nameList.length;
          select.value = newIdx;
          window.playBGM(newIdx);
          updateBgmUI();
        }
        return;
      }
      if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const select = document.getElementById('bgmSongSelect');
        if (select) {
          const idx = parseInt(select.value) || 0;
          const nameList = window.BGM_DISPLAY_NAMES || [];
          const newIdx = (idx + 1) % nameList.length;
          select.value = newIdx;
          window.playBGM(newIdx);
          updateBgmUI();
        }
        return;
      }

      // 遊戲控制
      if(gameState === STATE.LOGIN || gameState === STATE.GAMEOVER || gameState === STATE.ENDING) return;

      if(e.key === ' ' || e.key === 'Space'){
        e.preventDefault();
        if(gameState === STATE.PLAYING){
          mouseLeft = !mouseLeft;
          const btn = $('tbShoot');
          if(mouseLeft){ btn.classList.add('active'); btn.textContent = '🔫 ON'; }
          else { btn.classList.remove('active'); btn.textContent = '🔫'; }
        }
        return;
      }

      if(gameState === STATE.PLAYING){
        if(e.key === 'Escape'){ gameState = STATE.PAUSED; $('pauseOverlay').style.display = 'flex'; return; }
        if(e.key === 'e' || e.key === 'E'){ activateShield(); return; }
        if(e.key === 'w' || e.key === 'W') keys.w = true;
        if(e.key === 'a' || e.key === 'A') keys.a = true;
        if(e.key === 's' || e.key === 'S') keys.s = true;
        if(e.key === 'd' || e.key === 'D') keys.d = true;
        if(e.key === 'ArrowUp')    keys.ArrowUp    = true;
        if(e.key === 'ArrowDown')  keys.ArrowDown  = true;
        if(e.key === 'ArrowLeft')  keys.ArrowLeft  = true;
        if(e.key === 'ArrowRight') keys.ArrowRight = true;
        if(!pendingLevelReset && levelIntroTimer <= 0){
          if(e.key === 'q' || e.key === 'Q') ultimate();
          const num = parseInt(e.key);
          if(num >= 1 && num <= 6){
            const idx = num - 1;
            const unlocked = getUnlockedWeapons();
            if(unlocked.includes(idx)){ currentWeapon = idx; updateUI(); }
          }
        }
      } else if(gameState === STATE.PAUSED && e.key === 'Escape'){
        gameState = STATE.PLAYING;
        $('pauseOverlay').style.display = 'none';
      }
    });

    window.addEventListener('keyup', (e)=>{
      if(e.key === 'w' || e.key === 'W') keys.w = false;
      if(e.key === 'a' || e.key === 'A') keys.a = false;
      if(e.key === 's' || e.key === 'S') keys.s = false;
      if(e.key === 'd' || e.key === 'D') keys.d = false;
      if(e.key === 'ArrowUp')    keys.ArrowUp    = false;
      if(e.key === 'ArrowDown')  keys.ArrowDown  = false;
      if(e.key === 'ArrowLeft')  keys.ArrowLeft  = false;
      if(e.key === 'ArrowRight') keys.ArrowRight = false;
    });

    // ==================== 滑鼠事件 ====================
    canvas.addEventListener('mousemove', (e)=>{
      const r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) * (canvas.width  / r.width);
      mouseY = (e.clientY - r.top)  * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e)=>{
      if(gameState !== STATE.PLAYING || pendingLevelReset || levelIntroTimer > 0) return;
      if(e.button === 0){
        mouseLeft = !mouseLeft;
        const btn = $('tbShoot');
        if(mouseLeft){ btn.classList.add('active'); btn.textContent = '🔫 ON'; }
        else { btn.classList.remove('active'); btn.textContent = '🔫'; }
      }
      if(e.button === 2){ e.preventDefault(); isCharging = true; }
    });
    canvas.addEventListener('mouseup', (e)=>{ if(e.button === 2) isCharging = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ==================== 觸控搖桿 ====================
    canvas.addEventListener('touchstart', (e)=>{
      e.preventDefault();
      if(gameState !== STATE.PLAYING) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      let cx = (touch.clientX - rect.left) * (canvas.width  / rect.width);
      let cy = (touch.clientY - rect.top)  * (canvas.height / rect.height);
      if(cx < canvas.width * 0.5){
        joystickActive = true;
        joystickId = touch.identifier;
        joystickX = 0; joystickY = 0;
        window.joystickCenterX = cx;
        window.joystickCenterY = cy;
      } else {
        mouseX = cx; mouseY = cy;
      }
    }, {passive: false});

    canvas.addEventListener('touchmove', (e)=>{
      e.preventDefault();
      if(gameState !== STATE.PLAYING) return;
      for(let touch of e.changedTouches){
        const rect = canvas.getBoundingClientRect();
        let cx = (touch.clientX - rect.left) * (canvas.width  / rect.width);
        let cy = (touch.clientY - rect.top)  * (canvas.height / rect.height);
        if(touch.identifier === joystickId && joystickActive){
          const dx = cx - window.joystickCenterX;
          const dy = cy - window.joystickCenterY;
          const maxR = 80;
          const mag = Math.sqrt(dx*dx + dy*dy);
          if(mag > maxR){ joystickX = (dx/mag)*maxR; joystickY = (dy/mag)*maxR; }
          else { joystickX = dx; joystickY = dy; }
        } else {
          if(cx > canvas.width * 0.3){ mouseX = cx; mouseY = cy; }
        }
      }
    }, {passive: false});

    canvas.addEventListener('touchend', (e)=>{
      e.preventDefault();
      for(let touch of e.changedTouches){
        if(touch.identifier === joystickId){
          joystickActive = false; joystickId = null; joystickX = 0; joystickY = 0;
        }
      }
      if(e.touches.length === 0){
        joystickActive = false; joystickId = null; joystickX = 0; joystickY = 0;
      }
    }, {passive: false});

    canvas.addEventListener('touchcancel', ()=>{
      joystickActive = false; joystickId = null; joystickX = 0; joystickY = 0;
    }, {passive: false});

    // ==================== 啟動遊戲 ====================
    gameState = STATE.LOGIN;
    $('loginOverlay').style.display = 'flex';
    applyLanguage();
    updateUI();

    setTimeout(()=>{
      try {
        const all = [...ENEMY_EMOJIS, ...BOSS_EMOJIS, ...ELITE_EMOJIS,
          '🚀','❤️','⚡','🔫','💰','🛡️','🐢','⏱️','⚔️','🧲','💖'];
        for(let e of all) cacheEmoji(e, 30);
      } catch(e) {}
    }, 100);

    // 預設播放 BGM
    setTimeout(() => {
      const select = document.getElementById('bgmSongSelect');
      if (select && select.options.length > 0) {
        const idx = 0;
        select.value = idx;
        window.playBGM(idx);
        updateBgmUI();
      }
    }, 500);

    gameLoop();
  } catch(e) {
    console.error('初始化失敗:', e);
    $('loginOverlay').style.display = 'flex';
  }
}

// 啟動
window.addEventListener('load', init);