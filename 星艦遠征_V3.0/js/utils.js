"use strict";
// ==================== 工具 ====================
function rand(a,b){return Math.random()*(b-a)+a;}
function dist(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function getStageIndex(lv){ if(lv<=10)return 0; if(lv<=20)return 1; if(lv<=30)return 2; if(lv<=40)return 3; return 4; }
function getStageName(lv){ return CONFIG.STAGE_NAMES[getStageIndex(lv)]; }
function getUnlockedWeapons(){
  const u = [];
  for(let w in CONFIG.WEAPON_UNLOCK_LEVELS){
    if(level >= CONFIG.WEAPON_UNLOCK_LEVELS[w]) u.push(parseInt(w));
  }
  return u;
}

// ==================== Emoji 快取（尺寸對齊優化） ====================
const emojiCache = new Map();
function cacheEmoji(emoji, size){
  const aligned = Math.round(size / 8) * 8 || 8;
  const key = `${emoji}_${aligned}`;
  if(emojiCache.has(key)) return emojiCache.get(key);
  const off = document.createElement('canvas');
  const offCtx = off.getContext('2d');
  const pad = aligned * 0.4;
  const w = aligned + pad*2, h = aligned + pad*2;
  off.width = w; off.height = h;
  offCtx.textAlign = 'center'; offCtx.textBaseline = 'middle';
  offCtx.font = `${aligned}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  offCtx.clearRect(0,0,w,h);
  offCtx.fillText(emoji, w/2, h/2);
  emojiCache.set(key, off);
  return off;
}
function drawEmoji(x, y, emoji, size, angle=0, hitFlash=false, showCircle=false){
  const cached = cacheEmoji(emoji, size);
  if(!cached) return;
  const w = cached.width, h = cached.height;
  ctx.save();
  ctx.translate(x, y);
  if(angle) ctx.rotate(angle);
  if(showCircle){
    ctx.shadowColor = 'rgba(255,215,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0,0, size*0.6, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,215,0,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if(hitFlash){
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.drawImage(cached, -w/2, -h/2);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 15;
    ctx.drawImage(cached, -w/2, -h/2);
  }
  ctx.restore();
}
