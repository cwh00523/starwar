"use strict";
// ================================================================
//  3A 級遊戲音效引擎 · 音效合成 + 外部 MP3 BGM
//  MP3 檔案請置於 /BGM/ 目錄，檔名對應下方 BGM_FILES 陣列
// ================================================================

// ---------- 核心音訊上下文 ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ---------- 主音量控制 ----------
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.8;
masterGain.connect(audioCtx.destination);

// ---------- BGM 專用音量（獨立於主音量） ----------
const bgmGainNode = audioCtx.createGain();
bgmGainNode.gain.value = 0.3; // 預設 30%
bgmGainNode.connect(masterGain);

// ---------- BGM 狀態 ----------
let currentBgmSource = null;
let isBgmPlaying = false;
let currentBgmIndex = 0;

// ---------- MP3 檔案清單 ----------
const BGM_FILES = [
    "Before_the_Alarm_Sounds.mp3",
    "Before_the_Temple_Falls.mp3",
    "Gears_Under_Siege.mp3",
    "Horizon_Watch.mp3",
    "Iron_Passage.mp3",
    "Iron_Tide_Rising.mp3",
    "Keep_It_Quiet.mp3",
    "Midnight_Corridor.mp3",
    "Scorched_Sky.mp3",
    "Tenth_Fleet_Engaged.mp3",
    "The_Iron_Shore.mp3",
    "The_Longest_Watch.mp3",
    "Three_Notes_for_the_Grass.mp3"
];

// ---------- 曲目顯示名稱 ----------
const BGM_DISPLAY_NAMES = BGM_FILES.map(f => f.replace(/\.mp3$/i, ''));

// ---------- BGM 快取 ----------
const bgmCache = new Map();
const BGM_PATH = '/BGM/';

// ================================================================
//  🎵 BGM 載入與播放函數
// ================================================================

function loadBGM(index) {
    return new Promise((resolve, reject) => {
        if (index < 0 || index >= BGM_FILES.length) {
            reject(new Error(`BGM index ${index} 超出範圍`));
            return;
        }
        const filename = BGM_FILES[index];
        if (bgmCache.has(filename)) {
            resolve(bgmCache.get(filename));
            return;
        }
        const url = BGM_PATH + filename;
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`無法載入 ${url}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                bgmCache.set(filename, audioBuffer);
                resolve(audioBuffer);
            })
            .catch(err => {
                console.warn('BGM 載入失敗:', err);
                reject(err);
            });
    });
}

function playBGM(index = 0) {
    stopBGM();
    currentBgmIndex = index;
    loadBGM(index).then(buffer => {
        if (!buffer) return;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(bgmGainNode);
        source.start(0);
        currentBgmSource = source;
        isBgmPlaying = true;

        // 單曲循環：播放結束後重新播放同一首
        source.onended = () => {
            if (isBgmPlaying) {
                playBGM(currentBgmIndex);
            }
        };

        if (window._updateBgmUI) window._updateBgmUI();
    }).catch(err => {
        console.warn('無法播放 BGM:', err);
        isBgmPlaying = false;
        currentBgmSource = null;
        if (window._updateBgmUI) window._updateBgmUI();
    });
}

function stopBGM() {
    if (currentBgmSource) {
        try {
            currentBgmSource.stop();
        } catch (e) { /* ignore */ }
        currentBgmSource = null;
    }
    isBgmPlaying = false;
    if (window._updateBgmUI) window._updateBgmUI();
}

function toggleBGM(index = 0) {
    if (isBgmPlaying) {
        stopBGM();
        return false;
    } else {
        playBGM(index);
        return true;
    }
}

function setBGMVolume(val) {
    bgmGainNode.gain.value = Math.max(0, Math.min(1, val));
}

function setMasterVolume(val) {
    masterGain.gain.value = Math.max(0, Math.min(1, val));
}

function preloadAllBGM() {
    const promises = BGM_FILES.map((_, idx) => loadBGM(idx).catch(() => {}));
    return Promise.all(promises).then(() => {});
}

// ---------- 查詢介面 ----------
function getBgmList() {
    return BGM_DISPLAY_NAMES;
}

function getCurrentBgmIndex() {
    return currentBgmIndex;
}

function isBgmPlayingNow() {
    return isBgmPlaying;
}

// ================================================================
//  🔫 音效函數（保留原有高品質音效）
// ================================================================

function playAdvancedNote({ freq = 440, duration = 0.3, volume = 0.3, type = 'sine', filterFreq = null, useNoise = false, noiseVol = 0.1, target = 'master' } = {}) {
    const outputTarget = masterGain;
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    let finalNode = gain;
    if (filterFreq) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        gain.connect(filter);
        finalNode = filter;
    }
    osc.connect(gain);
    finalNode.connect(outputTarget);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);

    if (useNoise) {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
        const noise = audioCtx.createBufferSource();
        noise.buffer = buf;
        const ng = audioCtx.createGain();
        ng.gain.setValueAtTime(noiseVol, audioCtx.currentTime);
        ng.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(ng);
        ng.connect(outputTarget);
        noise.start();
        noise.stop(audioCtx.currentTime + duration);
    }
}

function sfxShoot() {
    playAdvancedNote({ freq: 4800, duration: 0.01, volume: 0.01, type: 'square', filterFreq: 3000 });
    playAdvancedNote({ freq: 5400, duration: 0.01, volume: 0.03, type: 'sawtooth' });
}
function sfxExplosion() {
    playAdvancedNote({ freq: 80, duration: 0.5, volume: 0.2, type: 'sawtooth', filterFreq: 150, useNoise: true, noiseVol: 0.15 });
    setTimeout(() => playAdvancedNote({ freq: 60, duration: 0.4, volume: 0.1, type: 'sine', filterFreq: 100 }), 180);
}
function sfxHit() {
    playAdvancedNote({ freq: 500, duration: 0.08, volume: 0.1, type: 'square', filterFreq: 900 });
    playAdvancedNote({ freq: 200, duration: 0.04, volume: 0.04, useNoise: true, noiseVol: 0.06 });
}
function sfxPickup() {
    for (let i = 0; i < 5; i++) setTimeout(() => playAdvancedNote({ freq: 600 + i * 120, duration: 0.08, volume: 0.06, type: 'sine' }), i * 35);
}
function sfxBossDefeat() {
    [220, 277, 330, 440].forEach((f, i) => setTimeout(() => playAdvancedNote({ freq: f, duration: 0.5, volume: 0.1, type: 'sine' }), i * 40));
    setTimeout(() => playAdvancedNote({ freq: 880, duration: 0.6, volume: 0.08, type: 'triangle' }), 200);
}
function sfxLevelUp() {
    [0, 2, 4, 7, 9, 12].forEach((s, i) => setTimeout(() => playAdvancedNote({ freq: 440 * Math.pow(2, s/12), duration: 0.1, volume: 0.07, type: 'sine' }), i * 55));
}

// ================================================================
//  🌐 全域匯出
// ================================================================
window.audioCtx = audioCtx;
window.sfxShoot = sfxShoot;
window.sfxExplosion = sfxExplosion;
window.sfxHit = sfxHit;
window.sfxPickup = sfxPickup;
window.sfxBossDefeat = sfxBossDefeat;
window.sfxLevelUp = sfxLevelUp;
window.playBGM = playBGM;
window.stopBGM = stopBGM;
window.toggleBGM = toggleBGM;
window.setBGMVolume = setBGMVolume;
window.setMasterVolume = setMasterVolume;
window.preloadAllBGM = preloadAllBGM;
window.getBgmList = getBgmList;
window.getCurrentBgmIndex = getCurrentBgmIndex;
window.isBgmPlayingNow = isBgmPlayingNow;
window.BGM_DISPLAY_NAMES = BGM_DISPLAY_NAMES;

console.log('🎧 音效引擎已載入，BGM 單曲循環模式');
console.log(`📀 共 ${BGM_FILES.length} 首 BGM 可用`);