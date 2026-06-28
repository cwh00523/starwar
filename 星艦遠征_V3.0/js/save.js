"use strict";
// ==================== 存檔管理 ====================

function saveScore(){
  try {
    const records = JSON.parse(localStorage.getItem('starVesselRecords') || '[]');
    records.push({ name: playerName, score, level, date: Date.now() });
    records.sort((a,b) => b.score - a.score);
    localStorage.setItem('starVesselRecords', JSON.stringify(records.slice(0,10)));
  } catch(e){}
}

function showLeaderboard(){
  const records = JSON.parse(localStorage.getItem('starVesselRecords') || '[]');
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  if(records.length === 0){
    list.innerHTML = `<p class="leaderboard-entry">${t('noRecords')}</p>`;
  } else {
    records.forEach((r,i) => {
      const div = document.createElement('div');
      div.className = 'leaderboard-entry';
      // 使用 t('score') 和 t('level') 支援多語言
      div.innerHTML = `<span>#${i+1}</span> ${r.name} - ${t('score')} ${r.score} (${t('level')} ${r.level})`;
      list.appendChild(div);
    });
  }
  document.getElementById('leaderboardOverlay').style.display = 'flex';
}

function exportSave(){
  try {
    const data = {
      playerName, level, score,
      health: player.health, shieldCount: player.shieldCount,
      weaponLevel, ultLevel, currentWeapon,
      x: player.x, y: player.y,
      attackBonus: player.attackBonus,
      magnetRange, autoAim,
      records: localStorage.getItem('starVesselRecords') || '[]'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starship_save_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e){ alert('匯出失敗: '+e.message); }
}

function importSave(file){
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      playerName = data.playerName || '艦長';
      level = data.level || 1;
      score = data.score || 0;
      player.health = data.health || 3;
      player.shieldCount = data.shieldCount || 0;
      weaponLevel = data.weaponLevel || 1;
      ultLevel = data.ultLevel || 1;
      currentWeapon = data.currentWeapon || 0;
      player.x = data.x || 200;
      player.y = data.y || 300;
      player.attackBonus = data.attackBonus || 0;
      magnetRange = data.magnetRange || 150;
      autoAim = data.autoAim || false;
      if(data.records) localStorage.setItem('starVesselRecords', data.records);
      
      gameState = STATE.PLAYING;
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('pauseOverlay').style.display = 'none';
      document.getElementById('uiLayer').style.display = 'flex';
      
      generateStageElements();
      generateDustClouds();
      bosses = []; pendingLevelReset = false;
      killsNeeded = 6 + Math.floor(level/3);
      killsCount = 0; enemies = []; bullets = []; pickups = [];
      
      // 刷新 UI 文字（若 applyLanguage 存在）
      if (typeof applyLanguage === 'function') applyLanguage();
      updateUI();
      alert('存檔匯入成功！');
    } catch(e){ alert('匯入失敗: '+e.message); }
  };
  reader.readAsText(file);
}