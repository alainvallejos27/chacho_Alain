import { Dice } from './logic/Dice';

let gameMode: 'individual' | 'parejas' = 'individual';
type SpecialMark = 'mano' | 'huevo';
type ScoreOption = { label: string; pts: number | string; mark?: SpecialMark; alsoGrande?: number };
type PlayerState = {
  name: string;
  teamName: string;
  teamId: number;
  retired: boolean;
  scores: Record<string, number | string | null>;
  grandes: (number | string)[];
  marks: Record<string, SpecialMark | null>;
};

let players: PlayerState[] = [];
let currentPlayerIdx = 0;
let viewedPlayerIdx = 0;

let diceState: { dice: Dice; isSelected: boolean; pos: { x: number; y: number; r: number } }[] = [];
let rollsDone = 0;
let flipsDone = 0;
let isFlipMode = false;
let gameFinished = false;
let pendingOver: {
  playerIdx: number;
  values: number[];
  rolls: number;
  flips: number;
  partnerIdx?: number;
  partnerValues?: number[];
  partnerRolls?: number;
  partnerFlips?: number;
} | null = null;
const savedGameKey = 'cacho-boliviano-saved-game';

let audioContext: AudioContext | null = null;
let soundEnabled = localStorage.getItem('cacho-sound-enabled') !== 'false';

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

function playDiceSound(): void {
  const context = getAudioContext();
  if (!context || !soundEnabled) return;
  void context.resume();
  const buffer = context.createBuffer(1, context.sampleRate * 0.16, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * decay;
  }
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  noise.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1450;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
  noise.connect(filter).connect(gain).connect(context.destination);
  noise.start();

  [0, 85, 155].forEach((delay, index) => {
    window.setTimeout(() => {
      if (!soundEnabled) return;
      const click = context.createOscillator();
      const clickGain = context.createGain();
      click.type = 'triangle';
      click.frequency.value = 680 + index * 115;
      clickGain.gain.setValueAtTime(0.0001, context.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.005);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075);
      click.connect(clickGain).connect(context.destination);
      click.start();
      click.stop(context.currentTime + 0.08);
    }, delay);
  });
}

const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;

function updateSoundUI(): void {
  soundToggle.classList.toggle('is-muted', !soundEnabled);
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.title = soundEnabled ? 'Silenciar sonido' : 'Activar sonido';
  const icon = soundToggle.querySelector('.sound-icon');
  if (icon) icon.textContent = soundEnabled ? '🔊' : '🔇';
}

soundToggle.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('cacho-sound-enabled', String(soundEnabled));
  updateSoundUI();
};
updateSoundUI();

// Inicialización de dados
for (let i = 0; i < 5; i++) {
  diceState.push({
    dice: new Dice(),
    isSelected: false,
    pos: { x: 15 + i * 16, y: 40, r: 0 }
  });
}

// Elementos DOM
const cachoCup = document.getElementById('cacho-cup')!;
const diceLayer = document.getElementById('dice-layer')!;
const tablePrompt = document.querySelector('.table-prompt') as HTMLElement;
const txtRollStatus = document.getElementById('txt-roll-status')!;
const txtPlayerTurn = document.getElementById('txt-player-turn')!;

function saveGameState(): void {
  if (!players.length) return;
  localStorage.setItem(savedGameKey, JSON.stringify({
    gameMode,
    players,
    currentPlayerIdx,
    viewedPlayerIdx,
    rollsDone,
    flipsDone,
    isFlipMode,
    gameFinished,
    pendingOver,
    dice: diceState.map(item => ({ value: item.dice.value, isSelected: item.isSelected, pos: item.pos }))
  }));
}

function clearSavedGame(): void {
  localStorage.removeItem(savedGameKey);
}

function isGameComplete(): boolean {
  const scoreKeys = ['balas', 'tontos', 'tricas', 'cuadras', 'quinas', 'senas', 'escalera', 'full', 'poker', 'grande1', 'grande2'];
  const activeTeams = [...new Set(players.filter(player => !player.retired).map(player => player.teamId))];
  return activeTeams.length > 0 && activeTeams.every(teamId => {
    const player = players.find(candidate => candidate.teamId === teamId && !candidate.retired);
    return Boolean(player && scoreKeys.every(key => player.scores[key] !== null && player.scores[key] !== undefined));
  });
}

function showWinner(): void {
  const ranking = [...new Map(players.filter(player => !player.retired).map(player => [player.teamId, player])).values()]
    .map(player => ({ name: player.teamName, score: Object.values(player.scores).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const rankingHtml = ranking.map((entry, index) => `<li><strong>${index + 1}°</strong> ${entry.name} <span>${entry.score} puntos</span></li>`).join('');
  const existingModal = document.getElementById('game-over-modal');
  const modal = existingModal || document.createElement('div');
  modal.id = 'game-over-modal';
  modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-[#14363a] border border-amber-400/40 rounded-3xl p-7 max-w-sm w-full text-center text-white shadow-2xl">
      <div class="text-4xl mb-3">🏆</div>
      <h2 class="text-xl font-extrabold text-amber-300 mb-2">¡Partida terminada!</h2>
      <p class="text-sm text-stone-200 mb-2">Clasificación final</p>
      <ol class="ranking-list text-left text-sm mb-5">${rankingHtml}</ol>
      <div class="flex gap-2">
        <button id="btn-replay-individual" class="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-900 font-extrabold py-3 rounded-xl">Individual</button>
        <button id="btn-replay-parejas" class="flex-1 bg-orange-700 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl">Parejas</button>
      </div>
    </div>`;
  if (!existingModal) document.body.appendChild(modal);
  const openSetup = (mode: 'individual' | 'parejas') => {
    gameMode = mode;
    selectCount.value = mode === 'individual' ? '2' : '2';
    renderNameInputs();
    modal.classList.add('hidden');
    setupModal.classList.remove('hidden');
  };
  document.getElementById('btn-replay-individual')!.onclick = () => openSetup('individual');
  document.getElementById('btn-replay-parejas')!.onclick = () => openSetup('parejas');
}

function restoreSavedGame(): void {
  const rawState = localStorage.getItem(savedGameKey);
  if (!rawState) return;
  try {
    const saved = JSON.parse(rawState);
    if (!Array.isArray(saved.players) || !saved.players.length) return;
    gameMode = saved.gameMode === 'parejas' ? 'parejas' : 'individual';
    players = saved.players;
    const restoredBoards = new Map<number, { scores: Record<string, number | string | null>; marks: Record<string, SpecialMark | null> }>();
    players.forEach(player => {
      player.teamName ??= player.name;
      player.teamId ??= players.indexOf(player);
      player.retired ??= false;
      player.marks ??= { escalera: null, full: null, poker: null };
      player.scores.grande1 ??= null;
      player.scores.grande2 ??= null;
      const board = restoredBoards.get(player.teamId) ?? { scores: player.scores, marks: player.marks };
      restoredBoards.set(player.teamId, board);
      player.scores = board.scores;
      player.marks = board.marks;
    });
    currentPlayerIdx = saved.currentPlayerIdx ?? 0;
    viewedPlayerIdx = saved.viewedPlayerIdx ?? currentPlayerIdx;
    rollsDone = saved.rollsDone ?? 0;
    flipsDone = saved.flipsDone ?? 0;
    isFlipMode = Boolean(saved.isFlipMode);
    gameFinished = Boolean(saved.gameFinished);
    pendingOver = saved.pendingOver ?? null;
    saved.dice?.forEach((savedDie: { value: number; isSelected: boolean; pos: { x: number; y: number; r: number } }, index: number) => {
      if (!diceState[index]) return;
      diceState[index].dice.value = savedDie.value;
      diceState[index].isSelected = savedDie.isSelected;
      diceState[index].pos = savedDie.pos;
    });
    setupModal.classList.add('hidden');
    txtPlayerTurn.textContent = players[currentPlayerIdx].name;
    txtRollStatus.textContent = rollsDone === 0 ? 'Tiro 1 (De Mano)' : rollsDone === 1 ? 'Tiro 2 (De Huevo)' : 'Límite de tiros alcanzado';
    if (rollsDone > 0) {
      tablePrompt.classList.add('is-hidden');
      cachoCup.className = 'corner';
      renderDice();
    }
    renderTabs();
    updateScoresUI();
    updateFlipButtonUI();
    updateSobreUI();
    if (gameFinished) showWinner();
  } catch {
    clearSavedGame();
  }
}

// Crear Modal de Opciones de Anote
let scoreModal = document.getElementById('score-choice-modal');
if (!scoreModal) {
  scoreModal = document.createElement('div');
  scoreModal.id = 'score-choice-modal';
  scoreModal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden';
  scoreModal.innerHTML = `
    <div class="bg-[#1c120c] border-2 border-amber-800/60 rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl text-amber-100">
      <h3 id="score-modal-title" class="text-sm font-bold uppercase tracking-wider text-amber-400 mb-1">Opciones de Anote</h3>
      <p id="score-modal-desc" class="text-xs text-stone-300 mb-4">Elige qué deseas registrar en esta casilla:</p>
      <div id="score-modal-options" class="flex flex-col gap-2 mb-3"></div>
      <button id="btn-cancel-score" class="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2 rounded-xl text-xs transition-colors">Cancelar</button>
    </div>
  `;
  document.body.appendChild(scoreModal);
}

// Botón Volcar
let btnFlip = document.getElementById('btn-flip') as HTMLButtonElement;
if (!btnFlip) {
  btnFlip = document.createElement('button');
  btnFlip.id = 'btn-flip';
  btnFlip.className = 'transition-all active:scale-95';
  document.querySelector('.table-actions')?.appendChild(btnFlip);
}

const btnSobre = document.createElement('button');
btnSobre.id = 'btn-sobre';
btnSobre.type = 'button';
btnSobre.className = 'hidden rounded-xl bg-orange-700 px-3 py-2 text-xs font-extrabold text-white shadow-lg';
btnSobre.textContent = 'SOBRE';
btnSobre.title = 'Dejar que tu compañero juegue sobre este tiro';
document.querySelector('.table-actions')?.appendChild(btnSobre);

const btnFinishPair = document.createElement('button');
btnFinishPair.id = 'btn-finish-pair';
btnFinishPair.type = 'button';
btnFinishPair.className = 'hidden rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white shadow-lg';
btnFinishPair.textContent = 'TERMINAR ANOTACIÓN';
btnFinishPair.title = 'Confirmar las anotaciones de la pareja y pasar al siguiente equipo';
document.querySelector('.table-actions')?.appendChild(btnFinishPair);

// Modal Configuración
const setupModal = document.getElementById('setup-modal')!;
const selectCount = document.getElementById('select-count') as HTMLSelectElement;
const namesContainer = document.getElementById('names-container')!;
const modeInd = document.getElementById('mode-ind')!;
const modePar = document.getElementById('mode-par')!;

function renderNameInputs() {
  namesContainer.innerHTML = '';
  const count = parseInt(selectCount.value);
  const totalPlayers = gameMode === 'parejas' ? count * 2 : count;
  for (let i = 1; i <= totalPlayers; i++) {
    const pairNumber = Math.ceil(i / 2);
    const memberNumber = ((i - 1) % 2) + 1;
    const label = gameMode === 'parejas' ? `Pareja ${pairNumber} - Jugador ${memberNumber}` : `Jugador ${i}`;
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" class="player-input w-full bg-[#0f0805] border border-[#381f12] text-amber-100 rounded-xl p-2 text-xs" value="${label}">
    `;
    namesContainer.appendChild(div);
  }
}

function updateCountOptions(): void {
  Array.from(selectCount.options).forEach(option => {
    option.disabled = gameMode === 'parejas' && Number(option.value) > 4;
  });
  if (gameMode === 'parejas' && Number(selectCount.value) > 4) selectCount.value = '4';
}

modeInd.onclick = () => { gameMode = 'individual'; updateCountOptions(); renderNameInputs(); };
modePar.onclick = () => { gameMode = 'parejas'; updateCountOptions(); renderNameInputs(); };
selectCount.onchange = renderNameInputs;
updateCountOptions();
renderNameInputs();

document.getElementById('btn-start')!.onclick = () => {
  const inputs = document.querySelectorAll('.player-input') as NodeListOf<HTMLInputElement>;
  const sharedBoards = new Map<number, { scores: Record<string, number | string | null>; marks: Record<string, SpecialMark | null> }>();
  players = Array.from(inputs).map((inp, idx) => {
    const teamId = gameMode === 'parejas' ? Math.floor(idx / 2) : idx;
    const teamName = gameMode === 'parejas' ? `Pareja ${teamId + 1}` : inp.value.trim() || `Jugador ${idx + 1}`;
    const board = sharedBoards.get(teamId) ?? {
      scores: { balas: null, tontos: null, tricas: null, cuadras: null, quinas: null, senas: null, escalera: null, full: null, poker: null, grande1: null, grande2: null },
      marks: { escalera: null, full: null, poker: null }
    };
    sharedBoards.set(teamId, board);
    return {
      name: inp.value.trim() || `Jugador ${idx + 1}`,
      teamName,
      teamId,
      retired: false,
      scores: board.scores,
      grandes: [],
      marks: board.marks
    };
  });

  clearSavedGame();
  currentPlayerIdx = 0;
  viewedPlayerIdx = 0;
  gameFinished = false;
  pendingOver = null;
  setupModal.classList.add('hidden');
  startTurn();
};

document.getElementById('btn-new-game')!.onclick = () => setupModal.classList.remove('hidden');

function updateFlipButtonUI() {
  const remainingFlips = 2 - flipsDone;
  btnFlip.innerHTML = `<span class="flip-die-face"><span class="flip-arrow">↻</span></span><span class="flip-count">${remainingFlips}</span>`;
  btnFlip.setAttribute('aria-label', `Voltear dado. Quedan ${remainingFlips}`);
  btnFlip.title = `Voltear dado (${remainingFlips} disponibles)`;
  if (flipsDone >= 2 || rollsDone === 0) {
    btnFlip.disabled = true;
    btnFlip.classList.add('opacity-50', 'cursor-not-allowed');
    isFlipMode = false;
    btnFlip.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-600');
  } else {
    btnFlip.disabled = false;
    btnFlip.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  if (isFlipMode) {
    btnFlip.classList.add('ring-4', 'ring-amber-400', 'bg-amber-600');
  } else {
    btnFlip.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-600');
  }
}

function updateSobreUI(): void {
  const activePlayer = players[currentPlayerIdx];
  const firstTeamPlayer = activePlayer && players.findIndex(player => player.teamId === activePlayer.teamId && !player.retired) === currentPlayerIdx;
  const isPartnerRound = pendingOver && pendingOver.partnerIdx === currentPlayerIdx;
  const canUseSobre = gameMode === 'parejas' && rollsDone === 2 && !pendingOver && !activePlayer?.retired && firstTeamPlayer;
  btnSobre.classList.toggle('hidden', !canUseSobre);
  btnFinishPair.classList.toggle('hidden', !isPartnerRound || rollsDone < 2);
}

function startTurn() {
  if (!players.length || players.every(player => player.retired)) return;
  let guard = 0;
  while (players[currentPlayerIdx]?.retired && guard < players.length) {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    guard++;
  }
  rollsDone = 0;
  flipsDone = 0;
  isFlipMode = false;
  viewedPlayerIdx = currentPlayerIdx;
  tablePrompt.classList.remove('is-hidden');
  txtPlayerTurn.textContent = players[currentPlayerIdx].name;
  txtRollStatus.textContent = "Tiro 1 (De Mano)";
  
  diceState.forEach(d => d.isSelected = false);
  cachoCup.className = 'center';
  diceLayer.innerHTML = '';
  renderTabs();
  updateScoresUI();
  updateFlipButtonUI();
  updateSobreUI();
  saveGameState();
}

btnFlip.onclick = () => {
  if (flipsDone < 2 && rollsDone > 0) {
    isFlipMode = !isFlipMode;
    updateFlipButtonUI();
  }
};

btnSobre.onclick = () => {
  if (gameMode !== 'parejas' || rollsDone !== 2 || pendingOver) return;
  const partnerTeamId = players[currentPlayerIdx].teamId;
  const partnerIdx = players.findIndex((player, index) => index !== currentPlayerIdx && player.teamId === partnerTeamId && !player.retired);
  if (partnerIdx < 0) return;
  pendingOver = {
    playerIdx: currentPlayerIdx,
    values: diceState.map(item => item.dice.value),
    rolls: rollsDone,
    flips: flipsDone,
    partnerIdx,
  };
  currentPlayerIdx = partnerIdx;
  startTurn();
};

function advanceToNextTeam(): void {
  const activeTeam = players[currentPlayerIdx]?.teamId;
  if (gameMode === 'individual') {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
  } else {
    for (let offset = 1; offset <= players.length; offset++) {
      const candidateIdx = (currentPlayerIdx + offset) % players.length;
      const candidate = players[candidateIdx];
      if (!candidate.retired && candidate.teamId !== activeTeam) {
        currentPlayerIdx = candidateIdx;
        break;
      }
    }
  }
  pendingOver = null;
  startTurn();
}

btnFinishPair.onclick = () => {
  if (!pendingOver?.partnerValues || rollsDone < 2) return;
  advanceToNextTeam();
};

function checkCollision(p1: { x: number; y: number }, p2: { x: number; y: number }): boolean {
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  return dist < 18;
}

function generateSpreadPositions(count: number, reservedPositions: { x: number; y: number }[] = []): { x: number; y: number; r: number }[] {
  const positions: { x: number; y: number; r: number }[] = [];

  for (let i = 0; i < count; i++) {
    let validPos = false;
    let newX = 0;
    let newY = 0;
    let attempts = 0;

    while (!validPos && attempts < 200) {
      attempts++;
      newX = Math.floor(Math.random() * 60) + 12;
      newY = Math.floor(Math.random() * 45) + 12;

      const collisionWithNew = positions.some(p => checkCollision(p, { x: newX, y: newY }));
      const collisionWithReserved = reservedPositions.some(p => checkCollision(p, { x: newX, y: newY }));

      validPos = !collisionWithNew && !collisionWithReserved;
    }

    positions.push({
      x: newX,
      y: newY,
      r: Math.floor(Math.random() * 80) - 40
    });
  }

  return positions;
}

function roll() {
  if (rollsDone >= 2) return;

  playDiceSound();
  isFlipMode = false;
  tablePrompt.classList.add('is-hidden');
  const dieElements = document.querySelectorAll('.real-die');
  dieElements.forEach((el, idx) => {
    if (rollsDone === 0 || diceState[idx].isSelected) {
      el.classList.add('in-cup');
    }
  });

  cachoCup.className = 'center';

  setTimeout(() => {
    let savedPositions: { x: number; y: number }[] = [];

    if (rollsDone === 1) {
      let savedIdx = 0;
      diceState.forEach(d => {
        if (!d.isSelected) {
          savedPositions.push({ x: 8 + savedIdx * 14, y: 80 });
          savedIdx++;
        }
      });
    }

    const diceToRollCount = rollsDone === 0 ? 5 : diceState.filter(d => d.isSelected).length;
    let newSpreadPositions = generateSpreadPositions(diceToRollCount, savedPositions);

    let hasOverlap = false;
    for (let i = 0; i < newSpreadPositions.length; i++) {
      for (let j = i + 1; j < newSpreadPositions.length; j++) {
        if (checkCollision(newSpreadPositions[i], newSpreadPositions[j])) {
          hasOverlap = true;
          break;
        }
      }
    }

    if (hasOverlap) {
      roll();
      return;
    }

    rollsDone++;
    let rollIndex = 0;
    let savedCount = 0;

    diceState.forEach((d) => {
      if (rollsDone === 1) {
        d.dice.roll();
        d.isSelected = false;
        d.pos = newSpreadPositions[rollIndex++];
      } else {
        if (d.isSelected) {
          d.dice.roll();
          d.isSelected = false;
          d.pos = newSpreadPositions[rollIndex++];
        } else {
          d.pos = {
            x: 8 + savedCount * 14,
            y: 80,
            r: 0
          };
          savedCount++;
        }
      }
    });

    cachoCup.className = 'corner';
    renderDice();
    updateFlipButtonUI();
    if (pendingOver?.partnerIdx === currentPlayerIdx && rollsDone === 2) {
      pendingOver.partnerValues = diceState.map(item => item.dice.value);
      pendingOver.partnerRolls = rollsDone;
      pendingOver.partnerFlips = flipsDone;
    }
    updateSobreUI();
    updateScoresUI();

    if (rollsDone === 1) {
      txtRollStatus.textContent = "Tiro 2 (De Huevo)";
    } else {
      txtRollStatus.textContent = "Límite de tiros alcanzado";
    }
    saveGameState();
  }, 400);
}

cachoCup.onclick = roll;

function renderDice() {
  diceLayer.innerHTML = '';
  const pipLayouts: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };

  diceState.forEach((item) => {
    const el = document.createElement('div');
    el.className = `real-die ${item.isSelected ? 'selected' : ''}`;
    el.style.left = `${item.pos.x}%`;
    el.style.top = `${item.pos.y}%`;
    el.style.transform = `rotate(${item.pos.r}deg)`;

    const val = item.dice.value;
    const layout = pipLayouts[val] || [];
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('div');
      if (layout.includes(i)) {
        pip.className = 'pip';
        if (val === 1 && i === 4) pip.classList.add('pip-red');
      }
      el.appendChild(pip);
    }

    el.onclick = () => {
      if (isFlipMode && flipsDone < 2) {
        item.dice.value = 7 - item.dice.value;
        flipsDone++;
        isFlipMode = false;
        renderDice();
        updateFlipButtonUI();
        updateScoresUI();
        saveGameState();
      } else if (rollsDone === 1) {
        item.isSelected = !item.isSelected;
        renderDice();
        saveGameState();
      }
    };

    diceLayer.appendChild(el);
  });
}

function renderTabs() {
  const tabs = document.getElementById('player-tabs')!;
  tabs.innerHTML = '';
  players.forEach((p, idx) => {
    const tab = document.createElement('div');
    tab.className = 'flex items-center gap-1 shrink-0';
    const btn = document.createElement('button');
    const isCurrent = idx === currentPlayerIdx;
    const isViewed = idx === viewedPlayerIdx;

    btn.className = `px-3 py-1 rounded-lg text-xs font-bold transition-all ${
      isViewed 
        ? 'bg-amber-600 text-white shadow-md' 
        : 'bg-stone-300 text-stone-700 hover:bg-stone-400'
    } ${isCurrent ? 'ring-2 ring-amber-400' : ''}`;
    
    btn.textContent = `${p.name}${isCurrent ? ' (Turno)' : ''}${p.retired ? ' (Retirado)' : ''}`;
    btn.onclick = () => {
      viewedPlayerIdx = idx;
      renderTabs();
      updateScoresUI();
    };
    tab.appendChild(btn);
    if (!p.retired) {
      const retireButton = document.createElement('button');
      retireButton.type = 'button';
      retireButton.className = 'text-red-700 hover:text-red-900 text-xs font-black';
      retireButton.textContent = '×';
      retireButton.title = `Retirar a ${p.name}`;
      retireButton.onclick = (event) => {
        event.stopPropagation();
        if (!confirm(`¿Retirar a ${p.name} de la partida?`)) return;
        p.retired = true;
        if (currentPlayerIdx === idx) currentPlayerIdx = (idx + 1) % players.length;
        renderTabs();
        startTurn();
        saveGameState();
      };
      tab.appendChild(retireButton);
    }
    tabs.appendChild(tab);
  });
}

// Solo ofrece jugadas que coinciden con los dados visibles y las reglas de la hoja.
function getAvailableOptionsForCell(cellKey: string, sourceValues = diceState.map(d => d.dice.value), sourceRolls = rollsDone, sourceFlips = flipsDone): ScoreOption[] {
  if (sourceRolls === 0) return [];
  const values = sourceValues;
  const isMano = (sourceRolls === 1 && sourceFlips === 0);

  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countArray = Object.values(counts).sort((a, b) => b - a);

  const numMap: Record<string, number> = {
    balas: 1, tontos: 2, tricas: 3, cuadras: 4, quinas: 5, senas: 6
  };

  const options: ScoreOption[] = [];

  if (numMap[cellKey]) {
    const num = numMap[cellKey];
    const matchCount = counts[num] || 0;
    const calculatedPts = matchCount * num;

    if (calculatedPts > 0) options.push({ label: `Anotar ${calculatedPts} puntos (${matchCount} dado${matchCount === 1 ? '' : 's'})`, pts: calculatedPts });
    options.push({ label: 'Tachar (0 / X)', pts: 0 });
    return options;
  }

  if (cellKey === 'escalera') {
    const isEsc1 = [1, 2, 3, 4, 5].every(n => values.includes(n));
    const isEsc2 = [2, 3, 4, 5, 6].every(n => values.includes(n));
    const isEsc7 = [1, 3, 4, 5, 6].every(n => values.includes(n));
    if (isEsc1 || isEsc2 || isEsc7) {
      const pts = isMano ? 25 : 20;
      options.push({ label: `Escalera: ${pts} puntos ${isMano ? '✓ De mano' : '○ De huevo'}`, pts, mark: isMano ? 'mano' : 'huevo' });
    }
    options.push({ label: 'Tachar (0 / X)', pts: 0 });
    return options;
  }

  if (cellKey === 'full') {
    if (countArray[0] === 3 && countArray[1] === 2) {
      const pts = isMano ? 35 : 30;
      options.push({ label: `Full: ${pts} puntos ${isMano ? '✓ De mano' : '○ De huevo'}`, pts, mark: isMano ? 'mano' : 'huevo' });
    }
    options.push({ label: 'Tachar (0 / X)', pts: 0 });
    return options;
  }

  if (cellKey === 'poker') {
    if (countArray[0] >= 4) {
      const pts = isMano ? 45 : 40;
      const hasGrande = countArray[0] === 5 && !isMano;
      options.push({
        label: `Póker: ${pts} puntos ${isMano ? '✓ De mano' : '○ De huevo'}${hasGrande ? ' + Grande: 50 puntos' : ''}`,
        pts,
        mark: isMano ? 'mano' : 'huevo',
        alsoGrande: hasGrande ? 50 : undefined
      });
    }
    options.push({ label: 'Tachar (0 / X)', pts: 0 });
    return options;
  }

  const isGrande = countArray[0] === 5;
  if (cellKey === 'grande1' && isGrande && !isMano) {
    options.push({ label: 'Grande: 50 puntos (✓ Segundo tiro)', pts: 50 });
  }
  if (cellKey === 'grande2' && isGrande && isMano) {
    options.push({ label: 'Dormida: 50 puntos (✓ De mano)', pts: 50 });
  }

  options.push({ label: 'Tachar (0 / X)', pts: 0 });
  return options;
}

function getPartnerOverOptions(cellKey: string): ScoreOption[] {
  if (!pendingOver?.partnerValues || pendingOver.partnerIdx !== currentPlayerIdx) return [];
  const firstPlayer = players[pendingOver.playerIdx];
  const partner = players[pendingOver.partnerIdx];
  const firstOptions = getAvailableOptionsForCell(cellKey, pendingOver.values, pendingOver.rolls, pendingOver.flips)
    .filter(option => Number(option.pts) > 0)
    .map(option => ({ ...option, label: `${firstPlayer.name}: ${option.label}` }));
  const partnerOptions = getAvailableOptionsForCell(cellKey, pendingOver.partnerValues, pendingOver.partnerRolls, pendingOver.partnerFlips)
    .filter(option => Number(option.pts) > 0)
    .map(option => ({ ...option, label: `${partner.name}: ${option.label}` }));
  const choices = [...firstOptions, ...partnerOptions];
  return choices.length ? choices : [{ label: 'Tachar (0 / X)', pts: 0 }];
}

function updateScoresUI() {
  const viewedPlayer = players[viewedPlayerIdx];
  if (!viewedPlayer) return;
  let total = 0;

  const teamTotals = [...new Map(players.filter(player => !player.retired).map(player => [player.teamId, player])).values()]
    .map(player => ({ teamId: player.teamId, name: player.teamName, score: Object.values(player.scores).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const standingsPanel = document.getElementById('standings-panel');
  if (standingsPanel) {
    standingsPanel.innerHTML = `<h3>Posiciones</h3>${teamTotals.map((entry, index) => `
      <div class="standing-row ${entry.teamId === viewedPlayer.teamId ? 'is-current' : ''}">
        <span>${index + 1}°</span><span>${entry.name}</span><span class="standing-score">${entry.score} pts</span>
      </div>`).join('')}`;
  }

  // Hacer que TODAS las casillas siempre sean clicables y editables
  document.querySelectorAll('.score-slot').forEach(cell => {
    cell.classList.add('hover:bg-amber-100/50', 'cursor-pointer');
  });

  Object.entries(viewedPlayer.scores).forEach(([k, val]) => {
    const cell = document.querySelector(`[data-cell="${k}"]`);
    if (!cell) return;

    const el = cell.querySelector('.cell-txt');

    if (val !== null && val !== undefined) {
      const mark = viewedPlayer.marks?.[k];
      const markText = mark === 'mano' ? ' ✓' : mark === 'huevo' ? ' ○' : '';
      if (el) el.textContent = val === 0 || val === 'X' ? 'X' : `${val}${markText}`;
      if (typeof val === 'number') total += val;
    } else {
      if (el) el.textContent = '-';
    }
  });

  document.getElementById('txt-total-score')!.textContent = total.toString();
  document.getElementById('lbl-current-team')!.textContent = viewedPlayer.teamName;
}

// MOSTRAR EL MODAL O PERMITIR EDICIÓN LIBRE EN CUALQUIER MOMENTO
document.querySelectorAll('.score-slot').forEach(cell => {
  cell.addEventListener('click', () => {
    const key = cell.getAttribute('data-cell')!;
    const viewedPlayer = players[viewedPlayerIdx];
    if (!viewedPlayer) return;
    if (viewedPlayer.scores[key] !== null && viewedPlayer.scores[key] !== undefined) return;

    const pendingPlayer = pendingOver ? players[pendingOver.playerIdx] : null;
    const isPartnerOver = Boolean(pendingPlayer && pendingPlayer.teamId === viewedPlayer.teamId && pendingOver?.partnerValues);
    const options = isPartnerOver ? getPartnerOverOptions(key) : getAvailableOptionsForCell(key);
    if (!options.length) return;
    const optsContainer = document.getElementById('score-modal-options')!;
    optsContainer.innerHTML = '';

    // Opciones automáticas del tiro actual
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors shadow-md text-left flex justify-between items-center';
      btn.innerHTML = `<span>${opt.label}</span>`;
      btn.onclick = () => {
        viewedPlayer.scores[key] = opt.pts;
        if (key in viewedPlayer.marks) viewedPlayer.marks[key] = opt.mark ?? null;
        if (opt.alsoGrande && viewedPlayer.scores.grande1 === null) viewedPlayer.scores.grande1 = opt.alsoGrande;
        document.getElementById('score-choice-modal')!.classList.add('hidden');
        if (isGameComplete()) {
          gameFinished = true;
          saveGameState();
          showWinner();
          return;
        }

        if (isPartnerOver) {
          updateScoresUI();
          saveGameState();
          return;
        }

        if (viewedPlayerIdx === currentPlayerIdx && rollsDone > 0) {
          if (gameMode === 'parejas') advanceToNextTeam();
          else {
            currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
            startTurn();
          }
        } else {
          updateScoresUI();
          saveGameState();
        }
      };
      optsContainer.appendChild(btn);
    });

    document.getElementById('score-choice-modal')!.classList.remove('hidden');
  });
});

document.getElementById('btn-cancel-score')!.onclick = () => {
  document.getElementById('score-choice-modal')!.classList.add('hidden');
};

// NAVEGACIÓN Y ADAPTACIÓN A DISPOSITIVOS MÓVILES
const secTapete = document.getElementById('sec-tapete')!;
const secAnotador = document.getElementById('sec-anotador')!;
const navTapete = document.getElementById('nav-btn-tapete')!;
const navAnotador = document.getElementById('nav-btn-anotador')!;

navTapete.onclick = () => {
  secTapete.classList.remove('hidden');
  secTapete.classList.add('flex');
  secAnotador.classList.add('hidden');
  secAnotador.classList.remove('flex');

  navTapete.className = 'text-amber-500 bg-[#26160e] flex items-center justify-center gap-1';
  navAnotador.className = 'text-stone-400 flex items-center justify-center gap-1';
};

navAnotador.onclick = () => {
  secAnotador.classList.remove('hidden');
  secAnotador.classList.add('flex');
  secTapete.classList.add('hidden');
  secTapete.classList.remove('flex');

  navAnotador.className = 'text-amber-500 bg-[#26160e] flex items-center justify-center gap-1';
  navTapete.className = 'text-stone-400 flex items-center justify-center gap-1';
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGameState();
});
window.addEventListener('pagehide', saveGameState);
window.addEventListener('beforeunload', saveGameState);

restoreSavedGame();