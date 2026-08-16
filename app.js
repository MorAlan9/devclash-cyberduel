const video = document.getElementById('webcam');
const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');

const avatarModeSelect = document.getElementById('avatar-mode-select');
const cameraSelect = document.getElementById('camera-select');
const btnTakePhoto = document.getElementById('btn-take-photo');
const statusText = document.getElementById('status-text');
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');

const xpVal = document.getElementById('xp-val');
const pvpVal = document.getElementById('pvp-val');
const missionsList = document.getElementById('missions-list');
const territoryFill = document.getElementById('territory-fill');
const territoryPct = document.getElementById('territory-pct');

const cctvOverlay = document.getElementById('cctv-overlay');
const cctvIdSpan = document.getElementById('cctv-id');
const btnExitCctv = document.getElementById('btn-exit-cctv');

const hackModal = document.getElementById('hack-modal');
const closeModal = document.getElementById('close-modal');
const patternGrid = document.getElementById('pattern-grid');
const hackStatusText = document.getElementById('hack-status-text');

let currentStream = null;
let aiModel = null;
let cameraActive = false;
let userPersonBox = null;

let myAgentId = `AGENTE_${Math.floor(1000 + Math.random() * 9000)}`;
let playerXP = 0;
let pvpWins = 0;
let territoryControlPct = 35;

// MODO AVATAR (NO OBLIGATORIO WEBCAM)
let activeAvatarMode = 'synth2d';
let capturedPhotoDataUrl = null;

// MOTOR 3D Y CÁMARA REMOTA CCTV
let map = null;
let isFlying = false;
let isCctvMode = false;
let currentHeadingAngle = 0;

// MISIONES, NPCS Y DUELOS 1V1
let missions = [];
let npcs = []; // NPCs offline con IA
let onlinePlayers = []; // Jugadores cruzados
let currentActiveMission = null;
let generatedSequence = [];
let userSequence = [];

const cropCanvas = document.createElement('canvas');
cropCanvas.width = 110; cropCanvas.height = 140;
const cropCtx = cropCanvas.getContext('2d');

// 1. INICIALIZAR MOTOR Y MAPA GLOBO 3D
function initSystem() {
    loadProfileData();

    map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [-64.1833, -31.4167],
        zoom: 15,
        pitch: 60,
        bearing: 0,
        antialias: true
    });

    map.on('style.load', () => {
        map.setProjection({ name: 'globe' });
        generateLocalMissions(map.getCenter());
        spawnMapNPCs(map.getCenter());
    });

    requestAnimationFrame(renderLoop);
    initAIAsync();
}

// 2. SISTEMA DE AVATAR Y WEBCAM OPCIONAL
avatarModeSelect.addEventListener('change', (e) => {
    activeAvatarMode = e.target.value;
    if (activeAvatarMode === 'webcam') {
        cameraSelect.style.display = 'inline-block';
        btnTakePhoto.style.display = 'inline-block';
        setupCameras();
    } else {
        cameraSelect.style.display = 'none';
        btnTakePhoto.style.display = 'none';
        stopCamera();
    }
});

btnTakePhoto.addEventListener('click', () => {
    if (cameraActive && video.videoWidth > 0) {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 110; snapCanvas.height = 140;
        const snapCtx = snapCanvas.getContext('2d');
        snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        capturedPhotoDataUrl = snapCanvas.toDataURL();
        statusText.innerText = "¡FOTO DE PERFIL CAPTURADA Y RENDERIZADA!";
    }
});

function stopCamera() {
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    cameraActive = false;
}

async function setupCameras() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        cameraSelect.innerHTML = '';
        videoDevices.forEach((device, idx) => {
            const opt = document.createElement('option');
            opt.value = device.deviceId;
            opt.text = device.label || `Cámara ${idx + 1}`;
            cameraSelect.appendChild(opt);
        });

        if (videoDevices.length > 0) startCamera(videoDevices[0].deviceId);
    } catch (e) {}
}

async function startCamera(deviceId) {
    stopCamera();
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = currentStream;
        await video.play();
        cameraActive = true;
    } catch (e) {}
}

cameraSelect.addEventListener('change', (e) => startCamera(e.target.value));

function initAIAsync() {
    cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(model => {
        aiModel = model;
        setInterval(async () => {
            if (activeAvatarMode === 'webcam' && cameraActive && video.videoWidth > 0 && !video.paused) {
                try {
                    const predictions = await aiModel.detect(video, 2, 0.35);
                    const person = predictions.find(p => p.class === 'person');
                    if (person) userPersonBox = { x: person.bbox[0], y: person.bbox[1], w: person.bbox[2], h: person.bbox[3] };
                } catch (e) {}
            }
        }, 150);
    });
}

// 3. MISIONES, EMPRESAS, CLUBES Y CÁMARAS CCTV REMOTAS
function generateLocalMissions(center) {
    missions = [
        { id: 1, type: 'ANTENA', title: "ANTENA ctOS", desc: "Desbloquear calles del distrito", lat: center.lat + 0.0015, lng: center.lng + 0.002, done: false },
        { id: 2, type: 'EMPRESA', title: "CORPORACIÓN DATASEC", desc: "Hackear base de datos", lat: center.lat - 0.0012, lng: center.lng - 0.0018, done: false },
        { id: 3, type: 'CCTV', title: "CÁMARA DE VIGILANCIA", desc: "Espiar sin ir presencialmente", lat: center.lat + 0.002, lng: center.lng - 0.001, done: false },
        { id: 4, type: 'CLUB', title: "CLUB HACKER UNDER", desc: "Duelo 1v1 y dominación", lat: center.lat - 0.0018, lng: center.lng + 0.0015, done: false }
    ];
    renderMissionsList();
}

function renderMissionsList() {
    missionsList.innerHTML = '';
    missions.forEach(m => {
        const div = document.createElement('div');
        div.className = `mission-card ${m.done ? 'done' : ''}`;
        div.innerHTML = `
            <div class="mission-title">${m.done ? '✔' : '⚡'} ${m.title}</div>
            <div class="mission-desc">${m.desc}</div>
        `;
        div.onclick = () => {
            if (m.type === 'CCTV') {
                connectToCCTV(m);
            } else {
                map.panTo([m.lng, m.lat]);
                if (!m.done) openHackMinigame(m);
            }
        };
        missionsList.appendChild(div);
    });
}

// RECONOCIMIENTO REMOTO POR CÁMARA CCTV
function connectToCCTV(mission) {
    isCctvMode = true;
    cctvIdSpan.innerText = mission.id;
    cctvOverlay.style.display = 'block';
    map.flyTo({ center: [mission.lng, mission.lat], zoom: 18, pitch: 75 });
    statusText.innerText = `CÁMARA EN VIVO HACKEADA // ANALIZANDO TAREAS REMOTAS`;
}

btnExitCctv.onclick = () => {
    isCctvMode = false;
    cctvOverlay.style.display = 'none';
    statusText.innerText = "DESCONECTADO DE CCTV // REGRESANDO A MARCHA";
};

// HERRAMIENTAS SCRAPER Y BD
document.getElementById('btn-run-scraper').onclick = () => {
    statusText.innerText = "🕷️ SCRAPER ACTIVO: EXTRACCIÓN DE NODOS Y FINANZAS URBANAS...";
    setTimeout(() => {
        playerXP += 80;
        territoryControlPct = Math.min(100, territoryControlPct + 5);
        saveProfileData();
        statusText.innerText = "✔ DATOS EXTRAÍDOS // EXP +80 // DOMINIO AUMENTADO";
    }, 1500);
};

document.getElementById('btn-hack-db').onclick = () => {
    openHackMinigame({ id: 99, title: "BASE DE DATOS REGIONAL", desc: "Infiltrar software central" });
};

// 4. GENERACIÓN DE NPCS AUTÓNOMOS Y JUGADORES ONLINE
function spawnMapNPCs(center) {
    npcs = [];
    for (let i = 0; i < 5; i++) {
        npcs.push({
            id: `NPC_IA_${i+1}`,
            lat: center.lat + (Math.random() - 0.5) * 0.005,
            lng: center.lng + (Math.random() - 0.5) * 0.005,
            vx: (Math.random() - 0.5) * 0.00005,
            vy: (Math.random() - 0.5) * 0.00005
        });
    }
}

// 5. MINIJUEGO PATRÓN DE HACKEO
function openHackMinigame(mission) {
    currentActiveMission = mission;
    userSequence = [];
    generatedSequence = [];

    for (let i = 0; i < 4; i++) generatedSequence.push(Math.floor(1 + Math.random() * 6));

    patternGrid.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const btn = document.createElement('div');
        btn.className = 'node-btn';
        btn.innerText = i;
        btn.onclick = () => handleNodeClick(i, btn);
        patternGrid.appendChild(btn);
    }

    hackStatusText.innerText = "MEMORIZÁ EL PATRÓN DE INTRUSIÓN...";
    hackModal.style.display = 'flex';
    playPatternPreview();
}

function playPatternPreview() {
    let step = 0;
    const interval = setInterval(() => {
        const nodeNum = generatedSequence[step];
        const btns = patternGrid.children;
        if (btns[nodeNum - 1]) {
            btns[nodeNum - 1].classList.add('active');
            setTimeout(() => btns[nodeNum - 1].classList.remove('active'), 350);
        }
        step++;
        if (step >= generatedSequence.length) {
            clearInterval(interval);
            hackStatusText.innerText = "¡INGRESÁ EL PATRÓN AHORA!";
        }
    }, 600);
}

function handleNodeClick(num, btnElement) {
    userSequence.push(num);
    btnElement.classList.add('active');
    setTimeout(() => btnElement.classList.remove('active'), 200);

    const idx = userSequence.length - 1;
    if (userSequence[idx] !== generatedSequence[idx]) {
        btnElement.classList.add('error');
        setTimeout(() => btnElement.classList.remove('error'), 300);
        hackStatusText.innerText = "❌ SECUENCIA INCORRECTA";
        userSequence = [];
        setTimeout(playPatternPreview, 1000);
        return;
    }

    if (userSequence.length === generatedSequence.length) {
        hackStatusText.innerText = "✔ ACCESO CONCEDIDO // LÓGICA ALTERADA";
        if (currentActiveMission) currentActiveMission.done = true;

        playerXP += 150;
        territoryControlPct = Math.min(100, territoryControlPct + 10);
        saveProfileData();
        renderMissionsList();
        setTimeout(() => hackModal.style.display = 'none', 1200);
    }
}

closeModal.onclick = () => hackModal.style.display = 'none';

// PERSISTENCIA
function saveProfileData() {
    const data = { xp: playerXP, pvp: pvpWins, pct: territoryControlPct };
    localStorage.setItem('ctos_player_data', JSON.stringify(data));
    updateProfileUI();
}

function loadProfileData() {
    const saved = localStorage.getItem('ctos_player_data');
    if (saved) {
        const p = JSON.parse(saved);
        playerXP = p.xp || 0; pvpWins = p.pvp || 0; territoryControlPct = p.pct || 35;
    }
    updateProfileUI();
}

function updateProfileUI() {
    xpVal.innerText = `${playerXP} PTS`;
    pvpVal.innerText = pvpWins;
    territoryFill.style.width = `${territoryControlPct}%`;
    territoryPct.innerText = `${territoryControlPct}%`;
}

// 6. BUSCADOR ESPACIAL Y CONTROLES CON VELOCIDAD AJUSTADA (MARCHA LOW/SUAVE)
async function flyToSpaceAndDive(targetLng, targetLat, locationName) {
    if (isFlying) return;
    isFlying = true;

    map.flyTo({ center: map.getCenter(), zoom: 1.8, pitch: 30, duration: 2200 });

    setTimeout(() => {
        map.flyTo({ center: [targetLng, targetLat], zoom: 16, pitch: 60, duration: 3200 });
    }, 2300);

    setTimeout(() => {
        isFlying = false;
        generateLocalMissions(map.getCenter());
        spawnMapNPCs(map.getCenter());
        statusText.innerText = `LLEGADA A: ${locationName}`;
    }, 5600);
}

btnSearch.onclick = async () => {
    const q = searchInput.value.trim();
    if (!q) return;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
        const d = await res.json();
        if (d.length > 0) flyToSpaceAndDive(parseFloat(d[0].lon), parseFloat(d[0].lat), d[0].display_name.split(',')[0].toUpperCase());
    } catch (e) {}
};

document.querySelectorAll('.city-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        flyToSpaceAndDive(parseFloat(e.target.dataset.lng), parseFloat(e.target.dataset.lat), e.target.innerText);
    });
});

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e' && map) {
        const center = map.getCenter();
        const nearby = missions.find(m => !m.done && Math.abs(m.lat - center.lat) < 0.003 && Math.abs(m.lng - center.lng) < 0.003);
        if (nearby) openHackMinigame(nearby);
    }
    if (e.key.toLowerCase() === 'c' && map) {
        const cctvMission = missions.find(m => m.type === 'CCTV');
        if (cctvMission) connectToCCTV(cctvMission);
    }
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// MOVIMIENTO DE PERSONAJE MÁS "LOW" / SUAVE Y TÁCTICO
function handleMapMovement() {
    if (!map || isFlying || isCctvMode) return;
    const center = map.getCenter();
    const step = 0.00006; // Ajustado a marcha suave táctica

    let dLat = 0, dLng = 0;
    if (keys['w'] || keys['arrowup']) dLat += step;
    if (keys['s'] || keys['arrowdown']) dLat -= step;
    if (keys['a'] || keys['arrowleft']) dLng -= step;
    if (keys['d'] || keys['arrowright']) dLng += step;

    if (dLat !== 0 || dLng !== 0) {
        map.panTo([center.lng + dLng, center.lat + dLat], { animate: false });
        currentHeadingAngle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    }
}

// 7. BUCLE RENDERIZADO 60 FPS
function renderLoop() {
    canvas.width = 960; canvas.height = 640;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    handleMapMovement();
    updateNPCs();

    renderMissionNodesCanvas();
    renderNPCsOnMap();

    if (!isCctvMode) {
        renderGyroAvatar(canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(renderLoop);
}

function updateNPCs() {
    npcs.forEach(npc => {
        npc.lat += npc.vx;
        npc.lng += npc.vy;
    });
}

function renderNPCsOnMap() {
    if (!map || isFlying) return;
    npcs.forEach(npc => {
        const pt = map.project([npc.lng, npc.lat]);
        const cpt = map.project(map.getCenter());
        const sx = canvas.width / 2 + (pt.x - cpt.x);
        const sy = canvas.height / 2 + (pt.y - cpt.y);

        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#facc15'; ctx.font = '8px Consolas'; ctx.fillText(npc.id, sx - 15, sy - 8);
    });
}

function renderMissionNodesCanvas() {
    if (!map || isFlying) return;
    missions.forEach(m => {
        const pt = map.project([m.lng, m.lat]);
        const cpt = map.project(map.getCenter());
        const sx = canvas.width / 2 + (pt.x - cpt.x);
        const sy = canvas.height / 2 + (pt.y - cpt.y);

        const color = m.done ? '#10b981' : '#ff0055';
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.fillRect(sx - 7, sy - 7, 14, 14); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Consolas'; ctx.fillText(`[${m.title}]`, sx - 20, sy - 10);
    });
}

function renderGyroAvatar(x, y) {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

    if (activeAvatarMode === 'webcam' && cameraActive && video.videoWidth > 0) {
        if (userPersonBox) {
            cropCtx.drawImage(video, userPersonBox.x, userPersonBox.y, userPersonBox.w, userPersonBox.h, 0, 0, cropCanvas.width, cropCanvas.height);
        } else {
            cropCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, cropCanvas.width, cropCanvas.height);
        }
    } else if (capturedPhotoDataUrl) {
        const img = new Image(); img.src = capturedPhotoDataUrl;
        cropCtx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
    } else if (activeAvatarMode === 'synth3d') {
        cropCtx.fillStyle = '#0f172a'; cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.fillStyle = '#00f0ff'; cropCtx.font = 'bold 12px Consolas'; cropCtx.fillText("CYBER 3D", 20, 70);
    } else {
        cropCtx.fillStyle = '#020617'; cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.fillStyle = '#ff0055'; cropCtx.font = 'bold 12px Consolas'; cropCtx.fillText("DEDSEC 2D", 18, 70);
    }

    // Máscara Hacker
    cropCtx.fillStyle = '#ff0055'; cropCtx.fillRect(30, 30, 50, 20);
    cropCtx.fillStyle = '#000'; cropCtx.font = 'bold 11px Consolas'; cropCtx.fillText("X X", 42, 44);

    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.stroke();

    ctx.rotate((currentHeadingAngle * Math.PI) / 180);
    ctx.fillStyle = '#ff0055';
    ctx.beginPath(); ctx.moveTo(0, -75); ctx.lineTo(10, -58); ctx.lineTo(-10, -58); ctx.closePath(); ctx.fill();

    ctx.drawImage(cropCanvas, -40, -50, 80, 100);
    ctx.strokeStyle = '#00f0ff'; ctx.strokeRect(-40, -50, 80, 100);

    ctx.restore();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 10px Consolas';
    ctx.fillText(`AGENTE [${myAgentId}]`, x - 50, y + 70);
}

initSystem();