"use strict";
// ==================== UI 更新 ====================

function updateBossHpBars(){
  bossHpContainer.innerHTML = '';
  bosses.forEach((b,i)=>{
    const div=document.createElement('div');
    div.style.display='flex'; div.style.flexDirection='column'; div.style.gap='2px'; div.style.alignItems='center';
    const hp=document.createElement('div'); hp.className='boss-hp-bar';
    hp.innerHTML=`<div class="boss-hp-fill" id="bossFill${i}" style="width:100%"></div>`;
    div.appendChild(hp);
    if(b.shield!==undefined && b.shield>0){
      const sh=document.createElement('div'); sh.className='boss-shield-bar';
      sh.innerHTML=`<div class="boss-shield-fill" id="bossShieldFill${i}" style="width:100%"></div>`;
      div.appendChild(sh);
    }
    bossHpContainer.appendChild(div);
  });
}

function showBigNotice(type){
  const text = currentLocale.bigNotices[type] || type;
  bigNotices.push({text, life:90, maxLife:90});
}

function updateUI(){
  // 所有顯示文字皆透過 t() 取得翻譯，支援即時切換語言
  scoreText.textContent = `${t('score')} ${score}`;
  healthText.textContent = `${t('health')} x${player.health}`;
  shieldText.textContent = `🛡️ x${player.shieldCount}`;
  weaponLvText.textContent = `${WEAPON_TYPES[currentWeapon].icon} Lv${weaponLevel}`;
  ultLvText.textContent = `${t('ult')} Lv${ultLevel}`;
  speedText.textContent = `⚡${player.speedMultiplier}x`;
  timerText.textContent = `${t('time')} ${Math.floor((Date.now()-levelStartTime)/1000)}s`;
  weaponText.textContent = `${WEAPON_TYPES[currentWeapon].icon} ${t('weaponNames')[currentWeapon]} [${currentWeapon+1}]`;
  
  // 關卡名稱：使用 getStageName(level) 取得新的章節標題（待 utils.js 修改）
  const stage = getStageName(level);
  stageText.textContent = stage;
  autoAimText.style.display = autoAim ? 'inline' : 'none';
}