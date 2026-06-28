"use strict";
// ==================== 設定檔 ====================
const CONFIG = {
  TOTAL_LEVELS: 50,
  MAX_BOSSES: 3,
  COMBO_TIMEOUT: 90,
  ULT_COOLDOWN_MAX: 400,
  MAX_CHARGE: 80,
  WORLD_WIDTH: 8000,
  SHIELD_DURATION_FRAMES: 600,
  STAGE_BOUNDARIES: [10, 20, 30, 40, 50],
  WEAPON_UNLOCK_LEVELS: {0:1, 1:1, 2:3, 3:5, 4:7, 5:9},
  
  // ===== 章節定義（每10關一章） =====
  // key 對應 locale.js 中的 ch0, ch0d, ch1, ch1d...
  CHAPTERS: [
    { start: 1,  end: 10, titleKey: 'ch0', descKey: 'ch0d' },
    { start: 11, end: 20, titleKey: 'ch1', descKey: 'ch1d' },
    { start: 21, end: 30, titleKey: 'ch2', descKey: 'ch2d' },
    { start: 31, end: 40, titleKey: 'ch3', descKey: 'ch3d' },
    { start: 41, end: 50, titleKey: 'ch4', descKey: 'ch4d' }
  ],

  // 備用（舊版關卡名稱）
  STAGE_NAMES: ['🌱 拓荒者', '⚔️ 精英突襲', '💥 分裂危機', '🌀 重力場域', '👑 最終決戰']
};

// ===== 全域狀態常量（供所有腳本使用） =====
const STATE = {
  LOGIN: 0,
  PLAYING: 1,
  PAUSED: 2,
  GAMEOVER: 3,
  ENDING: 4
};
window.STATE = STATE;  // 暴露給其他腳本

// ---------- 場景主題 ----------
const STAGE_THEMES = [
  { bg: '#0a1030', dust: ['blue','cyan'] },
  { bg: '#30100a', dust: ['red','orange'] },
  { bg: '#0a2010', dust: ['green','cyan'] },
  { bg: '#1a0a2a', dust: ['purple','blue'] },
  { bg: '#200a0a', dust: ['red','orange','purple'] }
];

// ---------- 敵人類型 ----------
const ENEMY_TYPES = [
  {size:18, speed:1.2, hp:1},
  {size:20, speed:1.0, hp:2},
  {size:16, speed:1.4, hp:1},
  {size:22, speed:0.9, hp:3},
  {size:19, speed:1.1, hp:1},
  {size:20, speed:1.3, hp:2},
  {size:17, speed:1.5, hp:1},
  {size:21, speed:0.8, hp:2},
  {size:18, speed:1.25, hp:2},
  {size:20, speed:1.15, hp:3}
];

// ---------- 表情符號 ----------
const ENEMY_EMOJIS = ['👾','🌀','🪐','☄️','🛸','👽','🤖','👻','💀','🧬','🦑','🐙','🐲','🐉','👹','🎃','🤡','👺','🦇','🐊'];
const BOSS_EMOJIS = ['💀','👿','👹','🎃','🤡','👺','🐦‍🔥','🐉','🐲','👾'];
const ELITE_EMOJIS = ['💎','⭐','🔥','💢'];

// ---------- 武器類型 ----------
const WEAPON_TYPES = [
  {name:'機槍', icon:'🔫', color:'#ffdd55', baseDamage:1},
  {name:'散彈', icon:'💥', color:'#ff8844', baseDamage:1},
  {name:'激光', icon:'⚡', color:'#44aaff', baseDamage:2},
  {name:'追蹤', icon:'🎯', color:'#ff44ff', baseDamage:1.5},
  {name:'火焰', icon:'🔥', color:'#ff6600', baseDamage:1},
  {name:'抖動炮', icon:'💢', color:'#ff8800', baseDamage:1.2}
];