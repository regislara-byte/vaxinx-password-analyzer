let showPass = false;

let attackMode = false;

function toggleAttackMode() {
  attackMode = !attackMode;

  const panel = document.getElementById('attackPanel');
  const btn = document.getElementById('attackModeBtn');

  panel.style.display = attackMode ? 'block' : 'none';
  btn.textContent = attackMode ? '🛡 DEFENSE MODE' : '⚔ ATTACK MODE';

  analyzePassword();
}

function updateAttackLog(password, checks, crack, threat) {
  const attackLog = document.getElementById('attackLog');
  if (!attackLog) return;

  if (!attackMode) return;

  if (!password) {
    attackLog.innerHTML = '<li style="color:var(--muted)">Awaiting credential input...</li>';
    return;
  }

  const attackSteps = [];

  const lower = password.toLowerCase();

  if (['admin','password','qwerty','welcome','letmein','123456'].some(w => lower.includes(w))) {
    attackSteps.push('⚔ Dictionary attack: common weak word detected');
  }

  if (password.length < 8) {
    attackSteps.push('⚔ Brute force path: short credential length');
  }

  if (/\d{4}$/.test(password)) {
    attackSteps.push('⚔ Pattern attack: ends with 4-digit year/number');
  }

  if (/^[A-Za-z]+\d+$/.test(password)) {
    attackSteps.push('⚔ Rule-based guess: word + numbers structure');
  }

  if (/(.)\1{2,}/.test(password)) {
    attackSteps.push('⚔ Repetition attack: repeated characters reduce strength');
  }

  attackSteps.push(`⚔ Estimated crack time: ${crack}`);
  attackSteps.push(`⚔ Threat class observed: ${threat}`);
  attackSteps.push('🛡 Defense action: use a long unique passphrase and store it in a password manager');

  attackLog.innerHTML = attackSteps.map((item, i) =>
    `<li style="animation-delay:${i*0.04}s"><span style="color:var(--red);font-weight:bold">›</span>${item}</li>`
  ).join('');
}


// ── PERSONAL IDENTIFIER ENGINE ───────────────────────────────────────────
let personalIdentifiers = [];

function togglePID() {
  const body = document.getElementById('pidBody');
  const btn  = document.getElementById('pidToggleBtn');
  const open = body.classList.toggle('open');
  btn.textContent = open ? '▲ COLLAPSE' : '▼ CONFIGURE';
}

function normalizeLeet(str) {
  // Reverse leet-speak so "R3g1s" still matches "regis"
  return str.toLowerCase()
    .replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's')
    .replace(/@/g, 'a').replace(/\+/g, 't').replace(/7/g, 't');
}

function addPID() {
  const input = document.getElementById('pidInput');
  const raw = input.value.trim().toLowerCase();
  if (!raw || raw.length < 2) return;
  // Avoid duplicates
  if (personalIdentifiers.includes(raw)) {
    input.value = '';
    return;
  }
  personalIdentifiers.push(raw);
  input.value = '';
  renderPIDTags();
  analyzePassword(); // re-run live
}

function removePID(word) {
  personalIdentifiers = personalIdentifiers.filter(p => p !== word);
  renderPIDTags();
  analyzePassword();
}

function renderPIDTags() {
  const container = document.getElementById('pidTags');
  if (personalIdentifiers.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = personalIdentifiers.map(p =>
    `<span class="pid-tag">${p}<span class="pid-tag-x" onclick="removePID('${p}')">✕</span></span>`
  ).join('');
}

function runPIDCheck(password) {
  const resultEl = document.getElementById('pidResult');
  if (personalIdentifiers.length === 0) {
    resultEl.textContent = '— add identifiers above to scan —';
    resultEl.className = 'pid-result';
    return { flagged: false, hits: [] };
  }
  if (!password) {
    resultEl.textContent = '— awaiting credential input —';
    resultEl.className = 'pid-result';
    return { flagged: false, hits: [] };
  }

  const normalizedPass = normalizeLeet(password);
  const hits = personalIdentifiers.filter(id =>
    normalizedPass.includes(id) || normalizeLeet(password).includes(id)
  );

  if (hits.length > 0) {
    resultEl.textContent = `🚨 IDENTIFIER MATCH: "${hits.join('", "')}" — high targeted attack risk`;
    resultEl.className = 'pid-result flagged';
    return { flagged: true, hits };
  } else {
    resultEl.textContent = `✔ CLEAN — none of your ${personalIdentifiers.length} identifier(s) detected`;
    resultEl.className = 'pid-result clean';
    return { flagged: false, hits: [] };
  }
}


function toggleVisibility() {
  const input = document.getElementById('password');
  const btn = document.getElementById('toggleBtn');
  showPass = !showPass;
  input.type = showPass ? 'text' : 'password';
  btn.textContent = showPass ? 'HIDE' : 'SHOW';
}

function calcEntropy(password) {
  if (!password) return 0;
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  return Math.round(password.length * Math.log2(pool || 1));
}

function estimateCrackTime(password) {
  if (!password) return '—';
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  const guesses = Math.pow(pool || 1, password.length);
  const aps = 1e10; // 10 billion/s (GPU cracking)
  const s = guesses / aps;
  if (s < 1) return '< 1 sec';
  if (s < 60) return s.toFixed(0) + ' sec';
  if (s < 3600) return (s/60).toFixed(0) + ' min';
  if (s < 86400) return (s/3600).toFixed(1) + ' hrs';
  if (s < 31536000) return (s/86400).toFixed(0) + ' days';
  if (s < 31536000*1000) return (s/31536000).toFixed(0) + ' yrs';
  if (s < 31536000*1e9) return (s/31536000/1000).toFixed(0) + 'K yrs';
  return 'Centuries+';
}

function analyzePassword() {
  const password = document.getElementById('password').value;
  const bar = document.getElementById('bar');
  const statusText = document.getElementById('statusText');
  const statusVerdict = document.getElementById('statusVerdict');
  const statusIcon = document.getElementById('statusIcon');
  const statusRow = document.getElementById('statusRow');
  const results = document.getElementById('results');
  const entropyEl = document.getElementById('entropy');
  const entropyBar = document.getElementById('entropyBar');
  const crackTime = document.getElementById('crackTime');
  const threatClass = document.getElementById('threatClass');
  const advice = document.getElementById('advice');
  const pct = document.getElementById('pct');
  const patternStatus = document.getElementById('patternStatus');

  let score = 0;
  let checks = [];

  if (!password) {
    bar.style.width = '0%';
    bar.style.background = 'transparent';
    statusText.textContent = 'AWAITING INPUT';
    statusText.className = 'status-text';
    statusIcon.textContent = '⬛';
    statusVerdict.textContent = '— no credential detected —';
    statusRow.style.setProperty('--status-glow', 'transparent');
    entropyEl.textContent = '0 bits';
    entropyBar.style.width = '0%';
    crackTime.textContent = '—';
    threatClass.textContent = 'NONE';
    advice.textContent = 'Start typing';
    pct.textContent = '0%';
    patternStatus.textContent = '— awaiting input —';
    patternStatus.style.color = 'var(--muted)';
    const breachStatus = document.getElementById('breachStatus');
    if (breachStatus) { breachStatus.textContent = 'Manual check only — no password is sent'; breachStatus.style.color = 'var(--muted)'; }
    updateScoreBreakdown([]);
    runPIDCheck('');
    results.innerHTML = '<li style="color:var(--muted)">Waiting for input...</li>';
    return;
  }

  // Length
  if (password.length >= 16) {
    score += 2;
    checks.push({ ok: true, msg: 'Length elite: 16+ characters' });
  } else if (password.length >= 12) {
    score++;
    checks.push({ ok: true, msg: 'Length check passed: 12+ characters' });
  } else if (password.length >= 8) {
    checks.push({ ok: null, msg: 'Length marginal: use 12+ characters' });
  } else {
    checks.push({ ok: false, msg: 'Length critical: too short (<8)' });
  }

  // Uppercase
  if (/[A-Z]/.test(password)) {
    score++;
    checks.push({ ok: true, msg: 'Uppercase letters present' });
  } else {
    checks.push({ ok: false, msg: 'No uppercase letters detected' });
  }

  // Lowercase
  if (/[a-z]/.test(password)) {
    score++;
    checks.push({ ok: true, msg: 'Lowercase letters present' });
  } else {
    checks.push({ ok: false, msg: 'No lowercase letters detected' });
  }

  // Numbers
  if (/[0-9]/.test(password)) {
    score++;
    checks.push({ ok: true, msg: 'Numeric characters present' });
  } else {
    checks.push({ ok: false, msg: 'No numeric characters detected' });
  }

  // Specials
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
    checks.push({ ok: true, msg: 'Special characters present' });
  } else {
    checks.push({ ok: false, msg: 'No special characters detected' });
  }

  // Repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score--;
    checks.push({ ok: false, msg: 'Repeated character sequences detected' });
  }

  // Sequential
  if (/(?:012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(password)) {
    score--;
    checks.push({ ok: false, msg: 'Sequential pattern detected' });
  }

  // Dictionary words
  const weakWords = ['password','admin','qwerty','welcome','letmein','123456','iloveyou','monkey','dragon','master'];
  if (weakWords.some(w => password.toLowerCase().includes(w))) {
    score -= 2;
    checks.push({ ok: false, msg: '🚨 Dictionary attack vulnerability found' });
  }

  // ── PATTERN AWARENESS ENGINE ──────────────────────────────────────────
  const weakPatterns = [
    { r: /\d{4}$/,           label: 'ends with 4-digit year'      },
    { r: /(19|20)\d{2}/,     label: 'year embedded in credential' },
    { r: /^[A-Za-z]+@\d+$/,  label: 'word@numbers structure'      },
    { r: /^[A-Za-z]+\d+$/,   label: 'word+numbers only'           },
    { r: /(.)\1{1,}/,        label: 'keyboard walk / repetition'  },
  ];
  const triggeredPatterns = weakPatterns.filter(p => p.r.test(password));
  if (triggeredPatterns.length > 0) {
    score -= 1;
    triggeredPatterns.forEach(p => {
      checks.push({ ok: false, msg: `△ Pattern engine: ${p.label}` });
    });
  } else {
    checks.push({ ok: true, msg: 'Pattern engine: no predictable structures found' });
  }

  // ── HUMAN PHRASE DETECTION ────────────────────────────────────────────
  // Detects natural language phrases like "MyDogSpot" or "ILovePizza"
  const phrasePattern = /^[A-Z][a-z]+([A-Z][a-z]+)+/;
  if (phrasePattern.test(password) && !/[^A-Za-z]/.test(password)) {
    score -= 1;
    checks.push({ ok: false, msg: '🧠 Human phrase detected — add symbols & numbers' });
  } else if (phrasePattern.test(password)) {
    checks.push({ ok: null, msg: '🧠 Human phrase base detected — good start, enhance it' });
  }

  // ── PERSONAL IDENTIFIER ENGINE ────────────────────────────────────────
  const pidResult = runPIDCheck(password);
  if (pidResult.flagged) {
    score -= 2;
    pidResult.hits.forEach(h => {
      checks.push({ ok: false, msg: `🎯 Personal identifier detected: "${h}" — spear attack vector` });
    });
    // Extra hard-hit entry for visibility
    checks.push({ ok: false, msg: `🚨 Credential linkable to your identity — change immediately` });
  }

  const percent = Math.max(0, Math.min(100, Math.round(score / 9 * 100)));
  bar.style.width = percent + '%';
  pct.textContent = percent + '%';

  updateScoreBreakdown(buildScoreBreakdown(password, checks, pidResult, triggeredPatterns, phrasePattern.test(password)));

  // Update pattern status box — PID match overrides everything with red alert
  const patternIssues = triggeredPatterns.map(p => p.label);
  const phraseCheck = phrasePattern.test(password);
  if (pidResult.flagged) {
    const matchList = pidResult.hits.map(h => `"${h}"`).join(', ');
    patternStatus.textContent = `⚠ Personal match: ${matchList} — identity-linked credential`;
    patternStatus.style.color = 'var(--red)';
  } else if (patternIssues.length === 0 && !phraseCheck) {
    patternStatus.textContent = '✔ Clean — no predictable structures, phrases, or identifiers';
    patternStatus.style.color = 'var(--green)';
  } else {
    const issues = [...patternIssues, ...(phraseCheck ? ['human phrase base'] : [])];
    patternStatus.textContent = '⚠ Flags: ' + issues.join(' · ');
    patternStatus.style.color = 'var(--yellow)';
  }

  const entropyBits = calcEntropy(password);
  entropyEl.textContent = entropyBits + ' bits';
  const entropyPct = Math.min(100, Math.round(entropyBits / 128 * 100));
  entropyBar.style.width = entropyPct + '%';
  crackTime.textContent = estimateCrackTime(password);

  if (pidResult.flagged) {
    // PID match always escalates to CRITICAL — identity-linked credential
    bar.style.background = 'linear-gradient(90deg, #ff0044, #cc0033)';
    statusText.textContent = 'IDENTITY RISK';
    statusText.className = 'status-text c-critical';
    statusIcon.textContent = '🎯';
    statusVerdict.textContent = `PERSONAL DATA IN CREDENTIAL — SPEAR ATTACK VECTOR`;
    statusRow.style.setProperty('--status-glow', '#ff0044');
    threatClass.textContent = 'ID EXPOSURE';
    advice.textContent = 'Remove personal info';
  } else if (score <= 1) {
    bar.style.background = 'linear-gradient(90deg, #ff0044, #ff4466)';
    statusText.textContent = 'CRITICAL';
    statusText.className = 'status-text c-critical';
    statusIcon.textContent = '🔴';
    statusVerdict.textContent = 'CREDENTIAL EXPOSED — REPLACE IMMEDIATELY';
    statusRow.style.setProperty('--status-glow', '#ff0044');
    threatClass.textContent = 'CRIT EXPOSURE';
    advice.textContent = 'Replace now';
  } else if (score === 2) {
    bar.style.background = 'linear-gradient(90deg, #f97316, #fb923c)';
    statusText.textContent = 'WEAK';
    statusText.className = 'status-text c-weak';
    statusIcon.textContent = '🟠';
    statusVerdict.textContent = 'HIGH BRUTE FORCE RISK DETECTED';
    statusRow.style.setProperty('--status-glow', '#f97316');
    threatClass.textContent = 'BRUTE FORCE';
    advice.textContent = 'Increase length';
  } else if (score <= 4) {
    bar.style.background = 'linear-gradient(90deg, #ffe600, #fbbf24)';
    statusText.textContent = 'MODERATE';
    statusText.className = 'status-text c-medium';
    statusIcon.textContent = '🟡';
    statusVerdict.textContent = 'PARTIAL DEFENSE — IMPROVEMENT ADVISED';
    statusRow.style.setProperty('--status-glow', '#ffe600');
    threatClass.textContent = 'PARTIAL DEF';
    advice.textContent = 'Use passphrase';
  } else {
    bar.style.background = 'linear-gradient(90deg, #00ff88, #22c55e)';
    statusText.textContent = 'STRONG';
    statusText.className = 'status-text c-strong';
    statusIcon.textContent = '🟢';
    statusVerdict.textContent = 'HARDENED CREDENTIAL — STORE IN VAULT';
    statusRow.style.setProperty('--status-glow', '#00ff88');
    threatClass.textContent = 'HARDENED';
    advice.textContent = 'Store in manager';
  }

  results.innerHTML = checks.map((c, i) => {
    const icon = c.ok === true ? '✔' : c.ok === false ? '✖' : '△';
    const color = c.ok === true ? 'var(--green)' : c.ok === false ? 'var(--red)' : 'var(--yellow)';
    return `<li style="animation-delay:${i*0.04}s"><span style="color:${color};font-weight:bold">${icon}</span>${c.msg}</li>`;
  }).join('');

  updateAttackLog(password, checks, crackTime.textContent, threatClass.textContent);
}


function buildScoreBreakdown(password, checks, pidResult, triggeredPatterns, phraseDetected) {
  if (!password) return [];
  const items = [];
  const lengthPoints = password.length >= 16 ? 2 : password.length >= 12 ? 1 : password.length >= 8 ? 0 : -1;
  items.push({ label: 'Length', points: lengthPoints, max: 2 });

  let diversity = 0;
  if (/[A-Z]/.test(password)) diversity++;
  if (/[a-z]/.test(password)) diversity++;
  if (/[0-9]/.test(password)) diversity++;
  if (/[^A-Za-z0-9]/.test(password)) diversity++;
  items.push({ label: 'Diversity', points: diversity, max: 4 });

  let patternPenalty = 0;
  if (/(.)\1{2,}/.test(password)) patternPenalty--;
  if (/(?:012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(password)) patternPenalty--;
  patternPenalty -= triggeredPatterns.length > 0 ? 1 : 0;
  patternPenalty -= phraseDetected ? 1 : 0;
  items.push({ label: 'Patterns', points: patternPenalty, max: 0 });

  const weakWords = ['password','admin','qwerty','welcome','letmein','123456','iloveyou','monkey','dragon','master'];
  const dictionaryPenalty = weakWords.some(w => password.toLowerCase().includes(w)) ? -2 : 0;
  items.push({ label: 'Dictionary', points: dictionaryPenalty, max: 0 });

  const identityPenalty = pidResult.flagged ? -2 : 0;
  items.push({ label: 'Identity', points: identityPenalty, max: 0 });
  return items;
}

function updateScoreBreakdown(items) {
  const el = document.getElementById('scoreBreakdown');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="score-item"><span>Awaiting</span><div class="score-track"><div class="score-fill" style="width:0%"></div></div><span class="score-points warn">0</span></div>';
    return;
  }
  el.innerHTML = items.map(item => {
    const good = item.points > 0;
    const bad = item.points < 0;
    const cls = good ? 'good' : bad ? 'bad' : 'warn';
    const width = item.max > 0 ? Math.max(0, Math.min(100, Math.round((item.points / item.max) * 100))) : (bad ? Math.min(100, Math.abs(item.points) * 45) : 8);
    const bg = good ? 'var(--green)' : bad ? 'var(--red)' : 'var(--yellow)';
    const sign = item.points > 0 ? '+' : '';
    return `<div class="score-item"><span>${item.label}</span><div class="score-track"><div class="score-fill" style="width:${width}%;background:${bg}"></div></div><span class="score-points ${cls}">${sign}${item.points}</span></div>`;
  }).join('');
}

async function sha1Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function checkBreach() {
  const password = document.getElementById('password').value;
  const el = document.getElementById('breachStatus');
  if (!el) return;
  if (!password) {
    el.textContent = 'Enter a sample password first';
    el.style.color = 'var(--yellow)';
    return;
  }
  el.textContent = 'Hashing locally...';
  el.style.color = 'var(--cyan)';
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    el.textContent = 'Checking k-anonymous range...';
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) throw new Error('Breach API unavailable');
    const text = await res.text();
    const line = text.split('\n').find(row => row.split(':')[0].trim().toUpperCase() === suffix);
    if (line) {
      const count = line.split(':')[1].trim();
      el.textContent = `🚨 Found in breach corpus ${Number(count).toLocaleString()} time(s) — replace immediately`;
      el.style.color = 'var(--red)';
    } else {
      el.textContent = '✔ Not found in HIBP range response — still use unique passwords';
      el.style.color = 'var(--green)';
    }
  } catch (err) {
    el.textContent = 'Breach check unavailable — offline/CORS/network issue';
    el.style.color = 'var(--yellow)';
  }
}

function generatePassphrase() {
  const words = ["Dragon","Galaxy","Shield","Coffee","Nova","Tiger","Vault","Cipher","Storm","Nexus","Blade","Phantom"];
  const symbols = ["!","@","#","$","%","^","&"];
  const picked = words.sort(() => 0.5 - Math.random()).slice(0, 4).join("-");
  const number = Math.floor(Math.random() * 9000) + 1000;
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const pass = picked + symbol + number;
  document.getElementById('password').value = pass;
  document.getElementById('password').type = 'text';
  document.getElementById('toggleBtn').textContent = 'HIDE';
  showPass = true;
  const rev = document.getElementById('passReveal');
  document.getElementById('passText').textContent = pass;
  rev.classList.add('visible');
  analyzePassword();
}

function copyPass() {
  const pass = document.getElementById('passText').textContent;
  navigator.clipboard.writeText(pass).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'COPIED';
    setTimeout(() => btn.textContent = 'COPY', 2000);
  });
}

function clearAll() {
  document.getElementById('password').value = '';
  document.getElementById('passReveal').classList.remove('visible');
  document.getElementById('password').type = 'password';
  document.getElementById('toggleBtn').textContent = 'SHOW';
  showPass = false;
  if (attackMode) {
  document.getElementById('attackLog').innerHTML =
    '<li style="color:var(--muted)">Awaiting credential input...</li>';
  }
  analyzePassword();
}