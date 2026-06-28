"use strict";
// ==================== 核心邏輯（更新與繪製） ====================

// 輔助函數：更新拾取物磁吸
function updatePickups(){
  const pullRange = magnetRange || 150;
  for(let p of pickups){
    const d = dist(player, p);
    if(d < pullRange && d > 5){
      const angle = Math.atan2(player.y-p.y, player.x-p.x);
      const speed = 3*scaleFactor;
      p.x += Math.cos(angle)*speed*(1 - d/pullRange);
      p.y += Math.sin(angle)*speed*(1 - d/pullRange);
    }
  }
  for(let i=pickups.length-1;i>=0;i--){
    let p = pickups[i];
    if(dist(player, p) < player.size/2 + p.size/2){
      applyPickup(p.type);
      pickups.splice(i,1);
    }
  }
}

function processCollisions(){
  for(let i=bullets.length-1;i>=0;i--){
    let b = bullets[i];
    if(b.fromEnemy) continue;
    let hitObstacle = false;
    for(let j=obstacles.length-1;j>=0;j--){
      let ob = obstacles[j];
      if(dist(b, ob) < ob.r + b.size){
        ob.hp--;
        if(ob.hp<=0){ addParticles(ob.x, ob.y, '#cc8844', 10); obstacles.splice(j,1); }
        hitObstacle = true;
        break;
      }
    }
    if(hitObstacle){ bullets.splice(i,1); continue; }

    for(let j=enemies.length-1;j>=0;j--){
      let e = enemies[j];
      if(dist(b, e) < e.drawSize/2 + b.size/2){
        e.hp -= b.damage||1;
        e.hitFlash = 6;
        levelHits++;
        if(e.hp <= 0){
          addParticles(e.x, e.y, '#ff6666', 12);
          if(e.split && Math.random()<0.5){
            for(let k=0;k<2;k++){
              let child = Object.assign({}, e);
              child.x += rand(-30,30);
              child.y += rand(-30,30);
              child.hp = e.maxHp/2;
              child.drawSize *= 0.7;
              child.split = false;
              enemies.push(child);
            }
          }
          if(e.explode){
            for(let other of enemies){
              if(other !== e && dist(e, other) < 100) other.hp -= 2;
            }
            addParticles(e.x, e.y, '#ff8800', 20);
          }
          enemies.splice(j,1);
          killsCount++;
          comboCount++;
          comboTimer = CONFIG.COMBO_TIMEOUT;
          score += 100 + Math.floor(comboCount/5)*10;
          sfxHit();
          if(bosses.length===0 && killsCount>=killsNeeded && !pendingLevelReset){
            spawnBosses();
            sfxLevelUp();
          }
        }
        if(!b.pierce){ bullets.splice(i,1); break; }
      }
    }
  }

  for(let i=bullets.length-1;i>=0;i--){
    let b = bullets[i];
    if(b.fromEnemy) continue;
    for(let j=bosses.length-1;j>=0;j--){
      let boss = bosses[j];
      if(dist(b, boss) < boss.size/2 + b.size/2){
        if(boss.shield !== undefined && boss.shield > 0){
          boss.shield -= b.damage||1;
          if(boss.shield < 0) boss.shield = 0;
          const shFill = document.getElementById(`bossShieldFill${j}`);
          if(shFill) shFill.style.width = (boss.shield / boss.maxShield * 100) + '%';
          boss.hitFlash = 6;
          if(!b.pierce){ bullets.splice(i,1); break; }
        } else {
          boss.hp -= b.damage||1;
          boss.hitFlash = 6;
          levelHits++;
          const fill = document.getElementById(`bossFill${j}`);
          if(fill) fill.style.width = (boss.hp / boss.maxHp * 100) + '%';
          if(boss.hp <= 0){
            addParticles(boss.x, boss.y, '#ff44ff', 30);
            comboCount += 3;
            comboTimer = CONFIG.COMBO_TIMEOUT;
            score += 500;
            bosses.splice(j,1);
            shakeTimer = 30;
            sfxBossDefeat();
            if(bosses.length === 0){
              pendingLevelReset = true;
              player.invincible = true;
              player.invincibleTimer = 30;
              // 使用語言包中的通關提示
              if(level < CONFIG.TOTAL_LEVELS){
                bigNotices.push({ text: t('levelComplete'), life: 200, maxLife: 200 });
              } else {
                bigNotices.push({ text: t('gameComplete'), life: 200, maxLife: 200 });
              }
            }
          }
          if(!b.pierce){ bullets.splice(i,1); break; }
        }
      }
    }
  }

  for(let i=bullets.length-1;i>=0;i--){
    let b = bullets[i];
    if(b.fromEnemy && dist(player, b) < player.size/2 + b.size/2){
      bullets.splice(i,1);
      damagePlayer();
    }
  }

  if(!player.invincible){
    for(let i=enemies.length-1;i>=0;i--){
      if(dist(player, enemies[i]) < player.size/2 + enemies[i].drawSize/2){
        enemies.splice(i,1);
        damagePlayer();
        break;
      }
    }
    for(let boss of bosses){
      if(dist(player, boss) < player.size/2 + boss.size/2) damagePlayer();
    }
    for(let ob of obstacles){
      if(dist(player, ob) < player.size/2 + ob.r){ damagePlayer(); break; }
    }
  }
}

function updateBullets(){
  bullets = bullets.filter(b => {
    if(b.homing && !b.fromEnemy){
      if(Date.now() - b.birthTime > 5000) b.homing = false;
      else if(enemies.length > 0){
        let t = enemies.reduce((a,c) => dist(b, a) < dist(b, c) ? a : c);
        let ta = Math.atan2(t.y - b.y, t.x - b.x);
        let d = ta - b.angle;
        while(d>Math.PI) d-=Math.PI*2;
        while(d<-Math.PI) d+=Math.PI*2;
        b.angle += d*0.1;
      }
    }
    for(let gf of gravityFields) if(dist(b, gf) < gf.r) b.speed *= 0.98;
    b.x += Math.cos(b.angle)*b.speed;
    b.y += Math.sin(b.angle)*b.speed;
    return b.x>0 && b.x<CONFIG.WORLD_WIDTH && b.y>0 && b.y<WORLD_HEIGHT;
  });
}

function updateEnemies(){
  for(let e of enemies){
    let dx = player.x - e.x, dy = player.y - e.y;
    e.angle = Math.atan2(dy, dx);
    const safe = Math.max(0.1, enemySpeedMultiplier);
    if(e.teleportTimer !== undefined && e.teleportTimer > 0){
      e.teleportTimer--;
      if(e.teleportTimer <= 0){
        e.x = rand(scrollX+50, scrollX+canvas.width-50);
        e.y = rand(50, WORLD_HEIGHT-50);
        e.teleportTimer = rand(60,180);
      }
    }
    let grav = 1;
    for(let gf of gravityFields) if(dist(e, gf) < gf.r) grav = 0.5;
    e.x += Math.cos(e.angle) * e.speed * safe * grav;
    e.y += Math.sin(e.angle) * e.speed * safe * grav;
  }
}

function updateBosses(){
  for(let boss of bosses){
    let dx = player.x - boss.x, dy = player.y - boss.y;
    boss.angle = Math.atan2(dy, dx);
    const safe = Math.max(0.1, enemySpeedMultiplier);
    boss.x += Math.cos(boss.angle) * boss.speed * safe;
    boss.y += Math.sin(boss.angle) * boss.speed * safe;
    boss.x = clamp(boss.x, boss.size*0.3, CONFIG.WORLD_WIDTH - boss.size*0.3);
    boss.y = clamp(boss.y, boss.size*0.3, WORLD_HEIGHT - boss.size*0.3);
    boss.shootTimer++;
    if(boss.shootTimer >= boss.shootInterval){
      boss.shootTimer = 0;
      bossShoot(boss);
    }
  }
}

function updatePlayerMovement(){
  let mx=0, my=0;
  if(keys.w || keys.ArrowUp) my-=1;
  if(keys.s || keys.ArrowDown) my+=1;
  if(keys.a || keys.ArrowLeft) mx-=1;
  if(keys.d || keys.ArrowRight) mx+=1;
  if(joystickActive){
    const mag = Math.sqrt(joystickX*joystickX + joystickY*joystickY);
    if(mag > 0.15){
      const norm = Math.min(1, mag);
      mx += (joystickX/mag)*norm;
      my += (joystickY/mag)*norm;
    }
  }
  let dustMult = getSpeedMultiplier(player.x, player.y);
  let totalMult = player.speedMultiplier * dustMult;
  if(mx!==0 || my!==0){
    let a = Math.atan2(my, mx);
    player.x += Math.cos(a) * player.speed * totalMult;
    player.y += Math.sin(a) * player.speed * totalMult;
  }
  for(let ob of obstacles){
    if(dist(player, ob) < player.size/2 + ob.r){
      let ang = Math.atan2(player.y - ob.y, player.x - ob.x);
      player.x += Math.cos(ang)*3;
      player.y += Math.sin(ang)*3;
    }
  }
  player.x = clamp(player.x, 30, CONFIG.WORLD_WIDTH - 30);
  player.y = clamp(player.y, 30, WORLD_HEIGHT - 30);
}

function updatePlayerAim(){
  if(autoAim && enemies.length > 0){
    let nearest = enemies.reduce((a,c) => dist(player, a) < dist(player, c) ? a : c);
    let targetAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    let diff = targetAngle - player.angle;
    while(diff>Math.PI) diff-=Math.PI*2;
    while(diff<-Math.PI) diff+=Math.PI*2;
    player.angle += diff * 0.15;
  } else {
    let worldMouseX = mouseX + scrollX;
    let worldMouseY = mouseY;
    let targetAngle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
    let diff = targetAngle - player.angle;
    while(diff>Math.PI) diff-=Math.PI*2;
    while(diff<-Math.PI) diff+=Math.PI*2;
    player.angle += diff * sensitivity;
  }
}

// ==================== 關卡重置與遊戲重啟 ====================
function performLevelReset(){
  level++;
  if(level > CONFIG.TOTAL_LEVELS){
    gameState = STATE.ENDING;
    endingSequence = true;
    $('endingText').textContent = currentLocale.ending || '👸 公主獲救！\n\n— 未完待續 —';
    $('endingOverlay').style.display = 'flex';
    $('uiLayer').style.display = 'none';
    return;
  }

  // 產生章節名稱
  const chapterIndex = Math.floor((level - 1) / 10);
  const section = ((level - 1) % 10) + 1;
  const chapterData = CONFIG.CHAPTERS[chapterIndex] || CONFIG.CHAPTERS[0];
  const chTitle = t(chapterData.titleKey) || '未知章節';
  const chDesc = t(chapterData.descKey) || '';
  const chapterNum = chapterIndex + 1;
  levelIntroText = `第 ${chapterNum}-${section} 章 · ${chTitle}\n${chDesc}`;
  levelIntroTimer = 150;

  killsNeeded = 6 + Math.floor(level/3);
  killsCount = 0;
  enemies = []; bullets = []; pickups = []; bosses = [];
  floatingTexts = []; bigNotices = bigNotices.filter(n => n.life > 100);
  player.invincible = false; player.invincibleTimer = 0;
  player.shieldActive = false; player.shieldTimer = 0;
  ultCooldown = 0; chargeAmount = 0; isCharging = false; chargeCooldown = 0; bulletTimer = 0;
  player.speedMultiplier = 1; player.speedBoostTimer = 0;
  enemySpeedMultiplier = 1; enemySpeedTimer = 0;
  enemyBulletSpeedMultiplier = 1; enemyBulletSpeedTimer = 0;
  levelStartTime = Date.now(); levelShots = 0; levelHits = 0;
  scrollX = 0; targetScrollX = 0;
  player.x = 200; player.y = canvas.height/2;
  comboCount = 0; comboTimer = 0;
  magnetRange = 150;
  generateDustClouds();
  generateStageElements();
  bossHpContainer.innerHTML = '';
  pendingLevelReset = false;
  const unlocked = getUnlockedWeapons();
  if(!unlocked.includes(currentWeapon)) currentWeapon = unlocked[0] || 0;
  updateUI();
}

function resetGame(){
  resizeGame();
  level = 0; score = 0; player.health = 3; player.shieldCount = 0;
  player.shieldActive = false; player.shieldTimer = 0;
  weaponLevel = 1; ultLevel = 1; currentWeapon = 0; player.attackBonus = 0;
  magnetRange = 150; autoAim = autoAim;
  player.x = 200; player.y = canvas.height/2;
  endingSequence = false;
  gameState = STATE.PLAYING;
  performLevelReset();
  $('uiLayer').style.display = 'flex';
  $('gameOverOverlay').style.display = 'none';
  $('pauseOverlay').style.display = 'none';
  $('endingOverlay').style.display = 'none';
  updateUI();
}

// ==================== 繪圖函數 ====================
function drawStars(){
  const idx = getStageIndex(level);
  for(let i=0;i<50;i++){
    let sx = (i*137 + Date.now()*0.01) % canvas.width;
    let sy = (i*97) % canvas.height;
    ctx.fillStyle = `rgba(255,255,200,${0.3+Math.sin(Date.now()*0.005+i)*0.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5 + idx*0.2, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawDustClouds(){
  for(let d of dustClouds){
    let sx = d.x - scrollX, sy = d.y;
    if(sx > canvas.width + d.r || sx + d.r < -d.r) continue;
    let grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, d.r);
    const colors = {
      'blue':'rgba(50,50,200,0.25)','purple':'rgba(150,50,200,0.25)',
      'cyan':'rgba(50,200,200,0.25)','red':'rgba(200,50,50,0.25)',
      'orange':'rgba(200,150,50,0.25)','green':'rgba(50,200,50,0.25)'
    };
    grad.addColorStop(0, colors[d.type] || 'rgba(100,100,200,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, d.r, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawGravityFields(){
  if(level < 31) return;
  for(let gf of gravityFields){
    let sx = gf.x - scrollX, sy = gf.y;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(sx, sy, gf.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(68,136,255,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(68,136,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawObstacles(){
  if(level < 21) return;
  for(let ob of obstacles){
    let sx = ob.x - scrollX, sy = ob.y;
    ctx.save();
    ctx.shadowColor = '#cc8844';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(sx, sy, ob.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(150,100,50,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#886633';
    ctx.lineWidth = 2;
    ctx.stroke();
    for(let i=0;i<3;i++){
      let a = rand(0, Math.PI*2);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a)*ob.r*0.8, sy + Math.sin(a)*ob.r*0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPickups(){
  for(let p of pickups){
    let sx = p.x - scrollX, sy = p.y;
    drawEmoji(sx, sy, p.emoji, p.size, 0, false, true);
  }
}

function drawBullets(){
  for(let b of bullets){
    let sx = b.x - scrollX, sy = b.y;
    ctx.fillStyle = b.fromEnemy ? '#ff6666' : (b.isUlt ? '#ffaa00' : (b.isCharged ? '#88ccff' : WEAPON_TYPES[currentWeapon].color));
    ctx.beginPath();
    ctx.arc(sx, sy, b.size, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawEnemies(){
  for(let e of enemies){
    let sx = e.x - scrollX, sy = e.y;
    if(e.isElite){
      ctx.save();
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(sx, sy, e.drawSize*0.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,220,68,0.2)';
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(sx, sy, e.drawSize*0.9, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,200,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    drawEmoji(sx, sy, e.emoji, e.drawSize, e.angle, e.hitFlash > 0);
  }
}

// ===== BOSS 受擊效果（紅光縮放，無白色閃白） =====
function drawBosses(){
  for(let b of bosses){
    let sx = b.x - scrollX, sy = b.y;
    const hpRatio = b.hp / b.maxHp;
    let glowColor = '#ff44ff';
    if(hpRatio < 0.33) glowColor = '#ff0000';
    else if(hpRatio < 0.66) glowColor = '#ff8800';

    ctx.save();
    if(b.hitFlash > 0){
      const scale = 1 + (b.hitFlash / 20) * 0.25;
      ctx.translate(sx, sy);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(0, 0, b.size*0.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.fill();
      drawEmoji(0, 0, b.emoji, b.size, b.angle + Math.PI, false);
      ctx.restore();
      b.hitFlash--;
      continue;
    }
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(sx, sy, b.size*0.6, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,68,255,0.1)';
    ctx.fill();
    ctx.restore();
    drawEmoji(sx, sy, b.emoji, b.size, b.angle + Math.PI, false);
  }
}

function drawFloatingTexts(){
  for(let ft of floatingTexts){
    let sx = ft.x - scrollX, sy = ft.y;
    let p = 1 - (ft.life / ft.maxLife), scale = 0.5 + p*1.0, alpha = Math.min(1, ft.life/30);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    ctx.font = 'bold 16px "Hei", sans-serif';
    ctx.fillStyle = `rgba(255,100,255,${alpha})`;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }
}

function drawBigNotices(){
  for(let n of bigNotices){
    let alpha = n.life / n.maxLife;
    ctx.fillStyle = `rgba(255,215,0,${alpha})`;
    ctx.font = 'bold 3rem "Hei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.text, canvas.width/2, canvas.height/2 - 50 + (1-alpha)*20);
  }
}

function drawProgressBar(){
  if(bosses.length === 0 && killsNeeded > 0){
    let prog = killsCount / killsNeeded;
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width - 210, 45, 200, 16);
    ctx.fillStyle = '#4a7cff';
    ctx.fillRect(canvas.width - 210, 45, 200 * prog, 16);
    ctx.strokeStyle = '#aaccff';
    ctx.strokeRect(canvas.width - 210, 45, 200, 16);
    ctx.font = '12px "Hei", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${t('progressText')}: ${killsCount}/${killsNeeded}`, canvas.width - 110, 58);
  }
}

function drawCombo(){
  if(comboCount > 1){
    ctx.font = 'bold 24px "Hei", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(`${t('comboText')} x${comboCount}`, canvas.width/2, 120);
    ctx.shadowBlur = 0;
  }
}

function drawLevelIntro(){
  if(levelIntroTimer > 0){
    const alpha = Math.min(1, levelIntroTimer / 60);
    const scale = 0.8 + (1 - levelIntroTimer / 150) * 0.5;
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(scale, scale);
    const lines = levelIntroText.split('\n');
    lines.forEach((line, i) => {
      const size = i === 0 ? 1.4 : (i === 1 ? 1.0 : 0.8);
      ctx.font = `bold ${size * 2.8}rem "Hei", sans-serif`;
      ctx.fillStyle = `rgba(255,215,0,${alpha})`;
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(line, 0, i * 60);
    });
    ctx.restore();
  }
}

function drawPlayer(){
  if(gameState === STATE.PLAYING && levelIntroTimer <= 0 && !pendingLevelReset){
    let sx = player.x - scrollX, sy = player.y;
    if(!player.invincible || Math.floor(Date.now()/80)%2 === 0){
      if(player.shieldActive){
        ctx.save();
        ctx.translate(sx, sy);
        ctx.shadowColor = '#44ddff';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(0, 0, player.size*0.8, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(100,220,255,0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }
      drawEmoji(sx, sy, '🚀', player.size, player.angle + Math.PI/4, false);
    }
  }
}

function drawParticles(){
  for(let p of particles){
    let sx = p.x - scrollX;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, p.y, 2, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawMinimap(){
  const w=200, h=140;
  minimapCtx.clearRect(0,0,w,h);
  minimapCtx.fillStyle='rgba(0,0,0,0.7)';
  minimapCtx.fillRect(0,0,w,h);
  minimapCtx.strokeStyle='#88aacc';
  minimapCtx.lineWidth=1;
  minimapCtx.strokeRect(0,0,w,h);

  const wtm = (wx,wy) => ({ mx: (wx/CONFIG.WORLD_WIDTH)*w, my: (wy/WORLD_HEIGHT)*h });
  const pPos = wtm(player.x, player.y);
  minimapCtx.fillStyle='#4a7cff';
  minimapCtx.beginPath();
  minimapCtx.arc(pPos.mx, pPos.my, 3, 0, Math.PI*2);
  minimapCtx.fill();

  if(level>=31){
    for(let gf of gravityFields){
      let pos = wtm(gf.x, gf.y);
      minimapCtx.beginPath();
      minimapCtx.arc(pos.mx, pos.my, (gf.r/CONFIG.WORLD_WIDTH)*w, 0, Math.PI*2);
      minimapCtx.fillStyle = 'rgba(68,136,255,0.2)';
      minimapCtx.fill();
    }
  }

  for(let e of enemies){
    let pos = wtm(e.x, e.y);
    if(pos.mx>=0 && pos.mx<=w && pos.my>=0 && pos.my<=h){
      minimapCtx.fillStyle = e.isElite ? '#ffdd44' : '#ff6666';
      minimapCtx.fillRect(pos.mx-1.5, pos.my-1.5, 3, 3);
    }
  }
  for(let b of bosses){
    let pos = wtm(b.x, b.y);
    minimapCtx.fillStyle='#ff44ff';
    minimapCtx.beginPath();
    minimapCtx.arc(pos.mx, pos.my, 4, 0, Math.PI*2);
    minimapCtx.fill();
  }
  for(let p of pickups){
    let pos = wtm(p.x, p.y);
    minimapCtx.fillStyle='#ffff44';
    minimapCtx.fillRect(pos.mx-1.5, pos.my-1.5, 3, 3);
  }
  minimapCtx.strokeStyle='rgba(255,215,0,0.3)';
  minimapCtx.lineWidth=1;
  minimapCtx.strokeRect(2,2,w-4,h-4);
}

// ==================== 主遊戲更新與繪製 ====================
function gameUpdate(){
  if(gameState === STATE.ENDING) return;
  if(gameState !== STATE.PLAYING) return;

  if(pendingLevelReset){ performLevelReset(); return; }
  if(levelIntroTimer > 0) levelIntroTimer--;
  if(shakeTimer > 0) shakeTimer--;
  if(comboTimer > 0){ comboTimer--; if(comboTimer <= 0) comboCount = 0; }

  if(player.shieldActive){
    player.shieldTimer--;
    if(player.shieldTimer <= 0){
      player.shieldActive = false;
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }

  for(let e of enemies) if(e.hitFlash > 0) e.hitFlash--;
  for(let b of bosses) if(b.hitFlash > 0) b.hitFlash--;

  if(player.speedBoostTimer > 0){ player.speedBoostTimer--; if(player.speedBoostTimer <= 0) player.speedMultiplier = 1; }
  if(enemySpeedTimer > 0){ enemySpeedTimer--; if(enemySpeedTimer <= 0) enemySpeedMultiplier = 1; }
  if(enemyBulletSpeedTimer > 0){ enemyBulletSpeedTimer--; if(enemyBulletSpeedTimer <= 0) enemyBulletSpeedMultiplier = 1; }

  targetScrollX = player.x - canvas.width * 0.3;
  scrollX += (targetScrollX - scrollX) * 0.1;

  updatePlayerMovement();
  updatePlayerAim();

  if(player.invincible && !player.shieldActive){
    player.invincibleTimer--;
    if(player.invincibleTimer <= 0) player.invincible = false;
  }

  if(levelIntroTimer <= 0){
    if(isCharging && chargeCooldown <= 0){
      chargeAmount = Math.min(CONFIG.MAX_CHARGE, chargeAmount + 1.2);
      chargeBarContainer.style.display = 'block';
      chargeFill.style.width = (chargeAmount / CONFIG.MAX_CHARGE * 100) + '%';
    } else if(!isCharging && chargeAmount > 0 && chargeCooldown <= 0){
      fireCharged();
    }
    if(chargeCooldown > 0){
      chargeCooldown--;
      if(chargeCooldown <= 0) chargeBarContainer.style.display = 'none';
    }
    if(mouseLeft && !isCharging){
      if(bulletTimer <= 0){
        fireWeapon();
        bulletTimer = Math.max(5, 14 - weaponLevel);
      }
    }
    if(bulletTimer > 0) bulletTimer--;
  }
  if(ultCooldown > 0) ultCooldown--;

  floatingTexts = floatingTexts.filter(ft => { ft.x += ft.vx; ft.y += ft.vy; ft.life--; return ft.life > 0; });
  bigNotices = bigNotices.filter(n => { n.life--; return n.life > 0; });

  updateBullets();
  if(bosses.length === 0){
    if(enemies.length < 6 + Math.floor(level/3) && killsCount < killsNeeded && Math.random() < 0.04) spawnEnemy();
    updateEnemies();
  } else {
    updateBosses();
  }

  processCollisions();
  updatePickups();
  spawnPickup();
  updateUI();
}

function gameDraw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  const theme = STAGE_THEMES[getStageIndex(level)];
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(shakeTimer > 0){
    let sx = rand(-6,6)*(shakeTimer/30);
    let sy = rand(-6,6)*(shakeTimer/30);
    ctx.translate(sx, sy);
  }

  drawStars();
  drawDustClouds();
  drawGravityFields();
  drawObstacles();
  drawPickups();
  drawBullets();
  drawEnemies();
  drawBosses();
  drawFloatingTexts();
  drawBigNotices();
  drawProgressBar();
  drawCombo();
  drawLevelIntro();
  drawPlayer();
  drawParticles();

  ctx.restore();
  drawMinimap();
}

function gameLoop(){
  gameUpdate();
  gameDraw();
  requestAnimationFrame(gameLoop);
}