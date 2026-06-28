"use strict";
// ==================== 實體定義與生成 ====================
// 玩家物件
const player = {
  x:200, y:300, angle:0, speed:3.8, size:32,
  health:3, maxHealth:5,
  invincible:false, invincibleTimer:0,
  speedMultiplier:1, speedBoostTimer:0,
  shieldCount:0, shieldActive:false, shieldTimer:0,
  attackBonus:0
};

// 遊戲物件陣列
let enemies = [];
let bosses = [];
let bullets = [];
let pickups = [];
let particles = [];
let floatingTexts = [];
let bigNotices = [];
let gravityFields = [];
let obstacles = [];
let dustClouds = [];

// 武器與技能狀態（會由 main 管理）
let currentWeapon = 0;
let weaponLevel = 1;
let ultLevel = 1;
let bulletTimer = 0;
let ultCooldown = 0;
let chargeAmount = 0;
let isCharging = false;
let chargeCooldown = 0;

// ==================== 生成函數 ====================
function generateDustClouds(){
  dustClouds = [];
  const theme = STAGE_THEMES[getStageIndex(level)];
  const dominant = theme.dust;
  for(let i=0;i<120;i++){
    let x=rand(0, CONFIG.WORLD_WIDTH), y=rand(0, WORLD_HEIGHT), r=rand(30,150);
    let type = Math.random()<0.8 ? dominant[Math.floor(Math.random()*dominant.length)] : ['blue','purple','cyan','red','orange'][Math.floor(Math.random()*5)];
    dustClouds.push({x,y,r,type});
  }
}

function getSpeedMultiplier(wx,wy){
  for(let gf of gravityFields) if(dist({x:wx,y:wy}, gf) < gf.r) return 0.5;
  for(let d of dustClouds) if(dist({x:wx,y:wy}, {x:d.x,y:d.y}) < d.r){
    if(d.type==='red')return 0.7; if(d.type==='purple')return 0.5;
    if(d.type==='blue')return 0.6; if(d.type==='cyan')return 0.8;
  }
  return 1.0;
}

function generateStageElements(){
  gravityFields = []; obstacles = [];
  if(level >= 31){
    for(let i=0;i<2+Math.floor(level/10);i++){
      gravityFields.push({x:rand(200,CONFIG.WORLD_WIDTH-200), y:rand(100,WORLD_HEIGHT-100), r:rand(80,150)});
    }
  }
  if(level >= 21){
    for(let i=0;i<3+Math.floor(level/5);i++){
      obstacles.push({x:rand(100,CONFIG.WORLD_WIDTH-100), y:rand(50,WORLD_HEIGHT-50), r:rand(20,40), hp:3+Math.floor(level/10)});
    }
  }
}

function spawnEnemy(){
  if(pendingLevelReset||levelIntroTimer>0||enemies.length>=20)return;
  let x=rand(scrollX-50, scrollX+canvas.width+50), y=rand(30, WORLD_HEIGHT-30);
  let type = ENEMY_TYPES[Math.floor(Math.random()*ENEMY_TYPES.length)];
  let emoji = ENEMY_EMOJIS[Math.floor(Math.random()*ENEMY_EMOJIS.length)];
  let drawSize = (15+rand(0,15))*scaleFactor;
  let isElite = false;
  if(level>=11 && Math.random()<0.15){
    isElite = true;
    emoji = ELITE_EMOJIS[Math.floor(Math.random()*ELITE_EMOJIS.length)];
    type = {...type, hp: type.hp*2.5};
    drawSize *= 1.3;
  }
  enemies.push({
    x,y, hp:type.hp, maxHp:type.hp,
    speed: type.speed + level*0.06,
    angle:0, hitFlash:0,
    emoji, drawSize, isElite,
    split: (level>=21 && Math.random()<0.3),
    explode: (level>=41 && Math.random()<0.2),
    teleportTimer: (level>=31) ? rand(60,180) : 0
  });
}

function spawnBosses(){
  const count = Math.min(level, CONFIG.MAX_BOSSES);
  bosses = [];
  for(let i=0;i<count;i++){
    let x=player.x+canvas.width*0.5+i*100, y=rand(80, WORLD_HEIGHT-80);
    let size = (45+level*6)*scaleFactor;
    let emoji = BOSS_EMOJIS[Math.floor(Math.random()*BOSS_EMOJIS.length)];
    let boss = {
      x,y,
      hp:20+level*8, maxHp:20+level*8,
      size, speed:0.5+level*0.08,
      angle:0, shootTimer:0,
      shootInterval:Math.max(25,55-level*2),
      hitFlash:0,
      emoji,
      shield: (level>=11) ? 30+level*2 : 0,
      maxShield: (level>=11) ? 30+level*2 : 0
    };
    bosses.push(boss);
    const taunt = currentLocale.bossTaunts[Math.floor(Math.random()*currentLocale.bossTaunts.length)].replace(/\{name\}/g, playerName);
    floatingTexts.push({x:x, y:y-30, text:taunt, life:120, maxLife:120, vx:rand(-1,1), vy:-1.5});
  }
  updateBossHpBars();
}

function bossShoot(boss){
  let angleToPlayer = Math.atan2(player.y-boss.y, player.x-boss.x);
  let count = 3+Math.floor(level/5);
  let safe = Math.max(0.5, enemyBulletSpeedMultiplier);
  let pattern = 'sniper';
  if(level>=41){
    const hpRatio = boss.hp / boss.maxHp;
    if(hpRatio>0.66) pattern='circle';
    else if(hpRatio>0.33) pattern='spiral';
    else pattern='sniper';
  } else if(level>=31) pattern=['circle','spiral','sniper'][Math.floor(Math.random()*3)];
  else if(level>=21) pattern=['circle','spiral'][Math.floor(Math.random()*2)];
  switch(pattern){
    case 'circle':
      for(let i=0;i<12;i++){ let a=(Math.PI*2/12)*i+boss.angle*0.5; spawnBullet(boss.x,boss.y,a,(2+level*0.2)*safe,1,4,true); }
      break;
    case 'spiral':
      for(let i=0;i<8;i++){ let a=angleToPlayer+i*0.3+boss.angle*0.3; spawnBullet(boss.x,boss.y,a,(2.5+level*0.2)*safe,1,4,true); }
      boss.angle += 0.05;
      break;
    default:
      for(let i=0;i<count;i++){ let a=angleToPlayer+(i-(count-1)/2)*0.15; spawnBullet(boss.x,boss.y,a,(3+level*0.25)*safe,1,5,true); }
      break;
  }
  if(Math.random()<0.2){
    const taunt = currentLocale.bossTaunts[Math.floor(Math.random()*currentLocale.bossTaunts.length)].replace(/\{name\}/g, playerName);
    floatingTexts.push({x:boss.x, y:boss.y-20, text:taunt, life:90, maxLife:90, vx:rand(-0.5,0.5), vy:-1.2});
  }
}

function spawnBullet(x,y,angle,speed,damage,size,fromEnemy=false,homing=false,pierce=false,isUlt=false,isCharged=false){
  bullets.push({x,y,angle,speed,damage,size,fromEnemy,homing,pierce,isUlt,isCharged,birthTime:Date.now()});
  if(bullets.length>300) bullets.splice(0, bullets.length-300);
}

function playerShoot(angle,speed,damage,size,isUlt=false,isCharged=false,homing=false,pierce=false){
  let finalAngle=angle;
  if(currentWeapon===5 && !isUlt && !isCharged) finalAngle += rand(-0.4,0.4);
  const totalDamage = damage + player.attackBonus;
  spawnBullet(
    player.x + Math.cos(finalAngle)*player.size*0.5,
    player.y + Math.sin(finalAngle)*player.size*0.5,
    finalAngle, speed, totalDamage, size*scaleFactor,
    false, homing, pierce, isUlt, isCharged
  );
  sfxShoot();
}

function fireWeapon(){
  levelShots++;
  const lv=weaponLevel;
  const base = WEAPON_TYPES[currentWeapon].baseDamage || 1;
  switch(currentWeapon){
    case 0: for(let i=0;i<2+lv;i++){ let a=player.angle+(i-(1+lv)/2)*0.15; playerShoot(a,8,base,4); } break;
    case 1: for(let i=0;i<5+lv;i++){ let a=player.angle+(i-(4+lv)/2)*0.25; playerShoot(a,6,base,4); } break;
    case 2: for(let i=0;i<1+lv;i++) playerShoot(player.angle,10,base*2,6,false,false,false,true); break;
    case 3: for(let i=0;i<1+lv;i++) playerShoot(player.angle,5,base*1.5,4,false,false,true); break;
    case 4: for(let i=0;i<3;i++){ let a=player.angle+rand(-0.3,0.3); playerShoot(a,6,base,5); } break;
    case 5: for(let i=0;i<2+lv;i++){ let a=player.angle+(i-(1+lv)/2)*0.3; playerShoot(a,7,base*1.2,4); } break;
  }
}

function ultimate(){
  if(ultCooldown>0||pendingLevelReset||levelIntroTimer>0)return;
  ultCooldown = CONFIG.ULT_COOLDOWN_MAX;
  const total=12+ultLevel*4, dmg=2+ultLevel;
  for(let i=0;i<total;i++){ let a=(Math.PI*2/total)*i; playerShoot(a,8,dmg,6,true); }
  shakeTimer=15;
}

function fireCharged(){
  if(chargeAmount<=0)return;
  const dmg=Math.floor(chargeAmount/15)+3, sz=8+chargeAmount/10;
  playerShoot(player.angle,5,dmg,sz,false,true);
  chargeAmount=0; chargeCooldown=30;
  chargeBarContainer.style.display='none';
}

function activateShield(){
  if(player.shieldCount<=0||player.shieldActive)return;
  player.shieldCount--;
  player.shieldActive = true;
  player.shieldTimer = CONFIG.SHIELD_DURATION_FRAMES;
  player.invincible = true;
  player.invincibleTimer = CONFIG.SHIELD_DURATION_FRAMES;
}

function damagePlayer(){
  if(player.invincible||pendingLevelReset||levelIntroTimer>0)return;
  player.health--;
  player.invincible = true;
  player.invincibleTimer = 80;
  addParticles(player.x,player.y,'#ff4444',15);
  comboCount=0;
  shakeTimer=20;
  sfxHit();
  if(player.health<=0){
    gameState=STATE.GAMEOVER;
    saveScore();
    $('gameOverOverlay').style.display='flex';
    $('gameOverTitle').textContent=t('gameOver');
    $('gameOverStats').textContent=`${t('score')}: ${score} | ${t('level')}: ${level}`;
    $('uiLayer').style.display='none';
  }
}

function addParticles(x,y,color,count=5){
  if(particles.length>=500) return;
  for(let i=0;i<count && particles.length<500;i++){
    particles.push({x,y,vx:rand(-3,3),vy:rand(-3,3),life:rand(15,30),color});
  }
}

// ==================== 拾取物生成（EMOJI 重新分配） ====================
function spawnPickup(){
  if(Math.random()<0.025 && pickups.length<5){
    let x=rand(scrollX+20, scrollX+canvas.width-20), y=rand(30, WORLD_HEIGHT-30);
    let r=Math.random(), type, emoji;
    // 重新分配 EMOJI，確保不重複且含義清晰
    if(r<0.14){ type='health'; emoji='💚'; }          // 生命恢復
    else if(r<0.26){ type='ult'; emoji='✨'; }          // 大招升級
    else if(r<0.36){ type='weapon'; emoji='🎲'; }       // 隨機新武器
    else if(r<0.46){ type='weaponUp'; emoji='⬆️'; }     // 武器等級+1
    else if(r<0.56){ type='speedUp'; emoji='🏃'; }      // 加速
    else if(r<0.64){ type='enemySlow'; emoji='🧊'; }    // 敵人緩速
    else if(r<0.72){ type='bulletSlow'; emoji='🕰️'; }   // 子彈減速
    else if(r<0.80){ type='shield'; emoji='🛡️'; }       // 護盾（保留）
    else if(r<0.87){ type='attackUp'; emoji='⚔️'; }     // 攻擊力提升
    else if(r<0.94){ type='magnet'; emoji='🧲'; }        // 磁鐵（保留）
    else { type='extraLife'; emoji='❤️‍🔥'; }             // 額外生命
    pickups.push({x,y,type,emoji,size:30*scaleFactor});
  }
}

function applyPickup(type){
  switch(type){
    case 'health': if(player.health<player.maxHealth) player.health++; break;
    case 'ult': if(ultLevel<5) ultLevel++; break;
    case 'weapon': {
      const unlocked = getUnlockedWeapons();
      if(unlocked.length>1){
        const nw = unlocked[Math.floor(Math.random()*unlocked.length)];
        if(nw!==currentWeapon) currentWeapon=nw;
        else weaponLevel = Math.min(5, weaponLevel+1);
      }
      break;
    }
    case 'weaponUp': weaponLevel = Math.min(5, weaponLevel+1); break;
    case 'speedUp': player.speedBoostTimer=300; player.speedMultiplier=2; break;
    case 'enemySlow': enemySpeedTimer=300; enemySpeedMultiplier=0.5; break;
    case 'bulletSlow': enemyBulletSpeedTimer=300; enemyBulletSpeedMultiplier=0.5; break;
    case 'shield': if(player.shieldCount<3) player.shieldCount++; break;
    case 'attackUp': player.attackBonus += 0.5; break;
    case 'magnet': magnetRange = 300; break;
    case 'extraLife': if(player.health<player.maxHealth) player.health++; break;
  }
  showBigNotice(type);
  sfxPickup();
}