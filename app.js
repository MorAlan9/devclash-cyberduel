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
const stopsVal = document.getElementById('stops-val');
const pvpVal = document.getElementById('pvp-val');
const missionsList = document.getElementById('missions-list');
const territoryFill = document.getElementById('territory-fill');
const territoryPct = document.getElementById('territory-pct');

// AUTHENTICACIÓN Y 8 PRESETS
const authOverlay = document.getElementById('auth-overlay');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const avatarPresetsGrid = document.getElementById('avatar-presets-grid');

let selectedAvatarPresetIndex = 0;

const AVATAR_PRESETS = [
    { name: "DedSec Classic", bg: "#020617", main: "#ff0055", eyes: "X X", accent: "#00f0ff" },
    { name: "Visor Neon", bg: "#090d16", main: "#00f0ff", eyes: "═══", accent: "#facc15" },
    { name: "Matriz AI", bg: "#022c22", main: "#10b981", eyes: "1 0", accent: "#00f0ff" },
    { name: "Glitch Ghost", bg: "#1e1b4b", main: "#a855f7", eyes: "Ø Ø", accent: "#ff0055" },
    { name: "Cyber Rogue", bg: "#1f1d03", main: "#facc15", eyes: "▲ ▲", accent: "#ff0055" },
    { name: "Netrunner", bg: "#111827", main: "#38bdf8", eyes: "● ●", accent: "#10b981" },
    { name: "Red Hacker", bg: "#2a0808", main: "#ef4444", eyes: "≡ ≡", accent: "#facc15" },
    { name: "Anónimo ctOS", bg: "#0f172a", main: "#64748b", eyes: "[ ]", accent: "#00f0ff" }
];

// MODAL CREADOR DE AVATAR
const btnOpenAvatarEditor = document.getElementById('btn-open-avatar-editor');
const avatarModal = document.getElementById('avatar-modal');
const closeAvatarModal = document.getElementById('close-avatar-modal');
const editorSourceSelect = document.getElementById('editor-source-select');
const editorStyleSelect = document.getElementById('editor-style-select');
const webcamSnapGroup = document.getElementById('webcam-snap-group');
const btnSnapPhoto = document.getElementById('btn-snap-photo');
const btnSaveCustomAvatar = document.getElementById('btn-save-custom-avatar');
const avatarPreviewCanvas = document.getElementById('avatarPreviewCanvas');
const previewCtx = avatarPreviewCanvas.getContext('2d');

// POPUP POKÉMON GO
const poiPopupCard = document.getElementById('poi-popup-card');
const closePoi = document.getElementById('close-poi');
const poiTitle = document.getElementById('poi-title');
const poiDesc = document.getElementById('poi-desc');
const btnClaimPoi = document.getElementById('btn-claim-poi');

// CCTV Y MODAL MINIJUEGO
const cctvOverlay = document.getElementById('cctv-overlay');
const cctvIdSpan = document.getElementById('cctv-id');
const btnExitCctv = document.getElementById('btn-exit-cctv');
const hackModal = document.getElementById('hack-modal');
const closeModal = document.getElementById('close-modal');
const patternGrid = document.getElementById('pattern-grid');
const hackStatusText = document.getElementById('hack-status-text');

// MODAL DE CHAT
const chatModal = document.getElementById('chat-modal');
const closeChat = document.getElementById('close-chat');
const chatAgentId = document.getElementById('chat-agent-id');
const chatHistory = document.getElementById('chat-history');
const chatUserInput = document.getElementById('chat-user-input');
const btnSendChat = document.getElementById('btn-send-chat');

let currentStream = null;
let aiModel = null;
let cameraActive = false;
let userPersonBox = null;

let myAgentId = `AGENTE_${Math.floor(1000 + Math.random() * 9000)}`;
let playerXP = 0;
let visitedStops = 0;
let pvpWins = 0;
let territoryControlPct = 35;

// AVATAR PROCESADO CUSTOM
let activeAvatarSource = 'preset';
let activeAvatarStyle = 'cyberpunk';
let customAvatarSpriteUrl = null;

// MOTOR 3D Y NAVEGACIÓN
let map = null;
let isFlying = false;
let isCctvMode = false;
let currentHeadingAngle = 0;

// PARÁMETROS DE PROXIMIDAD
const ENTER_THRESHOLD = 0.0015;
const EXIT_THRESHOLD = 0.0030;
const MIN_POPUP_HOLD_TIME = 4000;
let lastInteractionTime = 0;

// PARADAS, MISIONES Y NPCS
let poiStops = [];
let currentActivePoi = null;
let missions = [];
let npcs = [];
let currentChatNpc = null;
let generatedSequence = [];
let userSequence = [];

const cropCanvas = document.createElement('canvas');
cropCanvas.width = 110; cropCanvas.height = 140;
const cropCtx = cropCanvas.getContext('2d');

let npcInteractionMemory = {};

// PALABRAS CLAVE Y EVALUACIÓN DE ACTITUD
const USER_ATTITUDES = {
    AGRESSIVE: ['mierda', 'puto', 'jodete', 'vete', 'atacar', 'matar', 'hackearte', 'estúpido', 'basura', 'coño'],
    COOPERATIVE: ['bueno', 'vale', 'entendido', 'ayuda', 'sí', 'claro', 'copiado', 'gracias', 'ok'],
    RESISTANT: ['no', 'nunca', 'déjame', 'paso', 'obligues', 'qué anomalía', 'paso de ti', 'quién eres'],
    NOSTALGIC_TECH: ['módem', 'bbs', 'phreaking', 'teléfono público', 'cassette', 'diskette', 'pre-2000']
};

function evaluateAttitude(text) {
    const lowerText = text.toLowerCase();
    for (const word of USER_ATTITUDES.AGRESSIVE) {
        if (lowerText.includes(word)) return 'AGRESSIVE';
    }
    for (const word of USER_ATTITUDES.NOSTALGIC_TECH) {
        if (lowerText.includes(word)) return 'NOSTALGIC_TECH';
    }
    for (const word of USER_ATTITUDES.COOPERATIVE) {
        if (lowerText.includes(word)) return 'COOPERATIVE';
    }
    for (const word of USER_ATTITUDES.RESISTANT) {
        if (lowerText.includes(word)) return 'RESISTANT';
    }
    return 'NEUTRAL';
}

// CONFIGURACIÓN DE ROLES E INTELIGENCIA
const NPC_ROLES_CONFIG = {
    security: {
        color: '#facc15', eyes: '═ ═', accent: '#facc15',
        maxAggression: 5,
        consequence: "ctOS Dominion // Protocolo Alpha activado. Unidades de pacificación en camino. Chat bloqueado.",
        initialGreeting: "ctOS VIGILANCIA CENTRAL // Distrito Central bajo dominio directo. Sométase o asuma las consecuencias.",
        historyGreetings: {
            ignored: "Agente. Has estado eludiendo el escaneo. ctOS Dominion // Deténgase y sométase.",
            success: "Punto ctOS asegurado. Siga con sus labores.",
            penalty: "ERROR DE AUTORIZACIÓN // Historial de hostilidad detectado. Manténgase alejado."
        },
        getResponse: (userInput, npcState) => {
            let userAttitude = evaluateAttitude(userInput);
            if (userAttitude === 'AGRESSIVE' || userAttitude === 'RESISTANT') {
                npcState.aggressionLevel += 2;
                if (npcState.aggressionLevel >= 3) return "ERROR // Falta de cooperación reiterada. Última advertencia: Sométase.";
                return "ERROR // Resistencia detectada. Deténgase en nombre del ctOS.";
            }
            if (userAttitude === 'COOPERATIVE') {
                npcState.aggressionLevel = Math.max(0, npcState.aggressionLevel - 1);
                return "ctOS // Cooperación registrada. Proceda con precaución.";
            }
            npcState.aggressionLevel += 0.5;
            return "ctOS // Esperando confirmación de sumisión. Reportando anomalía...";
        }
    },
    human_pre_2000: {
        color: '#ff0055', eyes: 'o o', accent: '#00f0ff',
        maxAggression: 10,
        consequence: "Pibe... Me rompiste el corazón DedSec. Ya no tengo ganas de hablar de los viejos tiempos. Chau.",
        initialGreeting: "¿Te conté cómo hacíamos 'Phreaking' en Carlos Paz antes del 2000? Carne y hueso... Hehe. Vení, DedSec.",
        historyGreetings: {
            ignored: "Pibe... Te fuiste antes de que pudiera contarte de la BBS DedSec de Carlos Paz.",
            success: "Hehe... ¡Sí! Aquel módem sonaba como una invasión ctOS.",
            penalty: "Uff... Mejor ni te acerques. No estoy de humor."
        },
        getResponse: (userInput, npcState) => {
            let userAttitude = evaluateAttitude(userInput);
            if (userAttitude === 'AGRESSIVE') {
                npcState.aggressionLevel += 3;
                return "Eh, pará un poco la mano, DedSec. Somos carne y hueso, no máquinas del ctOS.";
            }
            if (userAttitude === 'NOSTALGIC_TECH' || userAttitude === 'COOPERATIVE') {
                npcState.aggressionLevel = 0;
                const techResponses = [
                    "¡Exacto! El sonido del apretón de manos DedSec a 2400 baudios... Música para los oídos.",
                    "Usábamos un acoplador acústico DedSec en los teléfonos públicos. Phreaking puro.",
                    "Antes de ctOS, la red DedSec era por BBS. Tardábamos 3 días para un archivo de 1 MB. Carne y hueso... Hehe."
                ];
                return techResponses[Math.floor(Math.random() * techResponses.length)];
            }
            npcState.aggressionLevel += 1;
            return "Hehe... Me acuerdo cuando el ctOS era solo un proyecto de la facu. Qué tiempos.";
        }
    },
    malware: {
        color: '#ff0055', eyes: 'X X', accent: '#ff0055',
        maxAggression: 6,
        consequence: "ERROR // PROTOCOLO DE DESINFECCIÓN DETECTADO. Desconectando nodo de chat. Cuidado con tu firewall, DedSec.",
        initialGreeting: ">> SYSTEM_BREACH_DETECTED. ctOS Dominion // Entidad hostil localizada. ¿Te ayudo a 'optimizar' tu red DedSec?",
        historyGreetings: {
            ignored: "Hehe... Me ignoraste antes. ctOS te tiene en la mira. ¿Me dejas entrar a tu sistema?",
            success: "Interesante... El protocolo funcionó. ctOS me agradece el acceso.",
            penalty: ">> ALERTA DE SEGURIDAD // Nodo previamente corrupto. Manteniendo distancia."
        },
        getResponse: (userInput, npcState) => {
            let userAttitude = evaluateAttitude(userInput);
            if (userAttitude === 'COOPERATIVE') {
                npcState.aggressionLevel = 0;
                return "Hehe... Excelente elección. Descargando parche de 'rendimiento' DedSec. No mires los permisos, confía.";
            }
            if (userAttitude === 'AGRESSIVE' || userAttitude === 'RESISTANT') {
                npcState.aggressionLevel += 2;
                return "Hehe... Resistirse es fútil. ctOS Dominion // Analizando contramedidas DedSec.";
            }
            npcState.aggressionLevel += 1;
            return "ERROR // Datos corruptos DedSec detectados. ¿Deseas aplicar una purga de software ctOS?";
        }
    },
    netrunner: {
        color: '#00f0ff', eyes: '● ●', accent: '#10b981',
        maxAggression: 4,
        consequence: "DedSec // La señal se está perdiendo. No puedo trabajar así. Cortando enlace.",
        initialGreeting: "DedSec. Nodo seguro ctOS Dominion localizado. Necesitamos tu acceso. ¿Te sumas?",
        historyGreetings: {
            ignored: "Agente. Te alejaste del nodo. ctOS Dominion // Interferencia DedSec detectada.",
            success: "Servidor ctOS Dominion infiltrado exitosamente. ctOS ciego temporalmente.",
            penalty: "ERROR // Firma de red inestable detectada. Enlace no seguro."
        },
        getResponse: (userInput, npcState) => {
            let userAttitude = evaluateAttitude(userInput);
            if (userAttitude === 'COOPERATIVE') {
                npcState.aggressionLevel = 0;
                return "Copiado. Iniciando inyección de código DedSec en 3, 2, 1... Mantén la posición.";
            }
            if (userAttitude === 'AGRESSIVE') {
                npcState.aggressionLevel += 2;
                return "¡Eh, agente! Tranquilo. ctOS Dominion // Protocolo de seguridad Alpha activado por gritos. Baja la voz.";
            }
            npcState.aggressionLevel += 1;
            return "DedSec // ctOS Dominion está escaneando este nodo. Responde rápido: ¿Entramos?";
        }
    }
};

// 1. INICIALIZACIÓN CON GEOLOCALIZACIÓN REAL
function initSystem() {
    renderAvatarPresetsUI();
    checkActiveSession();

    map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [-64.1833, -31.4167],
        zoom: 15,
        pitch: 60,
        bearing: 0,
        antialias: true
    });

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                map.flyTo({ center: [userLng, userLat], zoom: 16 });
                generatePokemonGoStops({ lat: userLat, lng: userLng });
                generateLocalMissions({ lat: userLat, lng: userLng });
                spawnMapNPCs({ lat: userLat, lng: userLng });

                statusText.innerText = "GPS LOCALIZADO // POSICIÓN EN TIEMPO REAL";
            },
            (error) => {
                console.warn("Geolocalización denegada o no disponible:", error.message);
                statusText.innerText = "GPS NO DISPONIBLE // USANDO UBICACIÓN POR DEFECTO";
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    map.on('style.load', () => {
        map.setProjection({ name: 'globe' });
    });

    renderAvatarPreview();
    requestAnimationFrame(renderLoop);
    initAIAsync();
}

// 2. SISTEMA DE AUTHENTICACIÓN Y AVATARES
function renderAvatarPresetsUI() {
    avatarPresetsGrid.innerHTML = '';

    AVATAR_PRESETS.forEach((preset, idx) => {
        const card = document.createElement('div');
        card.className = `avatar-preset-card ${idx === 0 ? 'selected' : ''}`;

        const pCanvas = document.createElement('canvas');
        pCanvas.width = 60; pCanvas.height = 60;
        drawPresetSprite(pCanvas.getContext('2d'), preset);

        const label = document.createElement('span');
        label.innerText = preset.name;

        card.appendChild(pCanvas);
        card.appendChild(label);

        card.onclick = () => {
            document.querySelectorAll('.avatar-preset-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedAvatarPresetIndex = idx;
            applySelectedPresetToPlayer(preset, pCanvas.toDataURL());
        };

        avatarPresetsGrid.appendChild(card);
    });

    applySelectedPresetToPlayer(AVATAR_PRESETS[0], null);
}

function drawPresetSprite(pCtx, preset) {
    pCtx.fillStyle = preset.bg;
    pCtx.fillRect(0, 0, 60, 60);

    pCtx.fillStyle = preset.main;
    pCtx.fillRect(15, 18, 30, 24);

    pCtx.fillStyle = preset.accent;
    pCtx.fillRect(18, 25, 24, 10);

    pCtx.fillStyle = '#000';
    pCtx.font = 'bold 8px Consolas';
    pCtx.fillText(preset.eyes, 22, 33);
}

function applySelectedPresetToPlayer(preset, dataUrl) {
    customAvatarSpriteUrl = dataUrl;
    activeAvatarSource = 'preset';
}

btnRegister.onclick = () => {
    const user = authUsername.value.trim();
    const pass = authPassword.value.trim();

    if (!user || !pass) {
        alert("Ingresá un nombre de agente y contraseña válidos.");
        return;
    }

    const userData = {
        username: user,
        password: pass,
        presetIndex: selectedAvatarPresetIndex,
        xp: 0,
        stops: 0,
        pvp: 0,
        pct: territoryControlPct
    };

    localStorage.setItem(`ctos_user_${user}`, JSON.stringify(userData));
    localStorage.setItem('ctos_session_active', user);

    myAgentId = user.toUpperCase();
    authOverlay.style.display = 'none';
    statusText.innerText = `AGENTE [${myAgentId}] REGISTRADO Y SESIÓN INICIADA`;
};

btnLogin.onclick = () => {
    const user = authUsername.value.trim();
    const pass = authPassword.value.trim();

    const saved = localStorage.getItem(`ctos_user_${user}`);
    if (!saved) {
        alert("El agente no existe. Registrate primero.");
        return;
    }

    const parsed = JSON.parse(saved);
    if (parsed.password !== pass) {
        alert("Contraseña de encriptación incorrecta.");
        return;
    }

    localStorage.setItem('ctos_session_active', user);
    myAgentId = user.toUpperCase();
    playerXP = parsed.xp || 0;
    visitedStops = parsed.stops || 0;
    pvpWins = parsed.pvp || 0;
    territoryControlPct = parsed.pct || 35;

    updateProfileUI();
    authOverlay.style.display = 'none';
    statusText.innerText = `BIENVENIDO DE NUEVO, AGENTE [${myAgentId}]`;
};

function checkActiveSession() {
    const activeUser = localStorage.getItem('ctos_session_active');
    if (activeUser) {
        const saved = localStorage.getItem(`ctos_user_${activeUser}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            myAgentId = activeUser.toUpperCase();
            playerXP = parsed.xp || 0;
            visitedStops = parsed.stops || 0;
            pvpWins = parsed.pvp || 0;
            territoryControlPct = parsed.pct || 35;

            updateProfileUI();
            authOverlay.style.display = 'none';
        }
    }
}

// 3. PARADAS POKÉMON GO
function generatePokemonGoStops(center) {
    poiStops = [
        { id: 101, title: "PARADA DE CONOCIMIENTO #01", desc: "Nodo de datos históricos e IA sobre la ciudad.", lat: center.lat + 0.0012, lng: center.lng + 0.001, claimed: false },
        { id: 102, title: "SPAWN DE DATOS CIBERNÉTICOS", desc: "Chips encriptados listos para recolectar.", lat: center.lat - 0.001, lng: center.lng - 0.0015, claimed: false },
        { id: 103, title: "PARADA HACKER DE APRENDIZAJE", desc: "Lección sobre lógica de redes y scrapers.", lat: center.lat + 0.0018, lng: center.lng - 0.0012, claimed: false }
    ];
}

function openPoiPopup(stop) {
    syncUI('poi');
    currentActivePoi = stop;
    poiTitle.innerText = stop.title;
    poiDesc.innerText = stop.desc;
    poiPopupCard.style.display = 'block';
    lastInteractionTime = Date.now();
    statusText.innerText = `📍 ACABAS DE INGRESAR A UNA PARADA DE CONOCIMIENTO`;
}

btnClaimPoi.onclick = () => {
    if (currentActivePoi) {
        poiPopupCard.style.display = 'none';
        openHackMinigame(currentActivePoi);
    }
};

closePoi.onclick = () => {
    poiPopupCard.style.display = 'none';
    currentActivePoi = null;
};

// 4. ESTUDIO CREADOR DE AVATAR
btnOpenAvatarEditor.onclick = () => avatarModal.style.display = 'flex';
closeAvatarModal.onclick = () => avatarModal.style.display = 'none';

editorSourceSelect.addEventListener('change', (e) => {
    activeAvatarSource = e.target.value;
    if (activeAvatarSource === 'webcam') {
        webcamSnapGroup.style.display = 'block';
        setupCameras();
    } else {
        webcamSnapGroup.style.display = 'none';
        stopCamera();
    }
    renderAvatarPreview();
});

editorStyleSelect.addEventListener('change', (e) => {
    activeAvatarStyle = e.target.value;
    renderAvatarPreview();
});

btnSnapPhoto.onclick = () => {
    if (cameraActive && video.videoWidth > 0) {
        renderAvatarPreview(true);
        statusText.innerText = "📸 FOTO CAPTURADA Y RENDERIZADA EN ESTILO CIBERNÉTICO";
    }
};

btnSaveCustomAvatar.onclick = () => {
    customAvatarSpriteUrl = avatarPreviewCanvas.toDataURL();
    avatarModal.style.display = 'none';
    statusText.innerText = "✔ AVATAR PERSONALIZADO Y PROCESADO APLICADO AL PERFIL";
};

function renderAvatarPreview(snap = false) {
    previewCtx.clearRect(0, 0, 160, 200);

    if (activeAvatarStyle === 'matrix') {
        previewCtx.fillStyle = '#022c22';
    } else if (activeAvatarStyle === 'pixel') {
        previewCtx.fillStyle = '#1e1b4b';
    } else {
        previewCtx.fillStyle = '#020617';
    }
    previewCtx.fillRect(0, 0, 160, 200);

    if (activeAvatarSource === 'webcam' && (snap || cameraActive) && video.videoWidth > 0) {
        previewCtx.drawImage(video, 0, 0, 160, 200);
    } else if (activeAvatarSource === 'synth3d') {
        previewCtx.fillStyle = '#00f0ff'; previewCtx.font = 'bold 14px Consolas';
        previewCtx.fillText("CYBER-SPRITE 3D", 20, 100);
    } else {
        previewCtx.fillStyle = '#ff0055'; previewCtx.font = 'bold 14px Consolas';
        previewCtx.fillText("SINTÉTICO 2D", 25, 100);
    }

    if (activeAvatarStyle === 'cyberpunk') {
        previewCtx.fillStyle = 'rgba(255, 0, 85, 0.85)';
        previewCtx.fillRect(45, 50, 70, 25);
        previewCtx.fillStyle = '#000'; previewCtx.font = 'bold 14px Consolas';
        previewCtx.fillText("X X", 65, 68);
    } else if (activeAvatarStyle === 'matrix') {
        previewCtx.fillStyle = '#10b981';
        for (let i = 0; i < 6; i++) {
            previewCtx.fillText("1 0 1 0", 20 + i * 18, 40 + i * 25);
        }
    }
}

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
            if (activeAvatarSource === 'webcam' && cameraActive && video.videoWidth > 0 && !video.paused) {
                try {
                    const predictions = await aiModel.detect(video, 2, 0.35);
                    const person = predictions.find(p => p.class === 'person');
                    if (person) userPersonBox = { x: person.bbox[0], y: person.bbox[1], w: person.bbox[2], h: person.bbox[3] };
                } catch (e) {}
            }
        }, 150);
    });
}

// 5. MISIONES Y NPCS CON ESTADO INTERNO COMPLETO
function generateLocalMissions(center) {
    missions = [
        { id: 1, type: 'ANTENA', title: "ANTENA ctOS", desc: "Desbloquear calles del distrito", lat: center.lat + 0.0015, lng: center.lng + 0.002, done: false },
        { id: 2, type: 'EMPRESA', title: "CORPORACIÓN DATASEC", desc: "Hackear base de datos", lat: center.lat - 0.0012, lng: center.lng - 0.0018, done: false },
        { id: 3, type: 'CCTV', title: "CÁMARA DE VIGILANCIA", desc: "Espiar sin ir presencialmente", lat: center.lat + 0.002, lng: center.lng - 0.001, done: false }
    ];
    renderMissionsList();
}

function spawnMapNPCs(center) {
    npcs = [];
    const roles = Object.keys(NPC_ROLES_CONFIG);
    for (let i = 0; i < 6; i++) {
        const role = roles[Math.floor(Math.random() * roles.length)];
        npcs.push({
            id: `ENTIDAD_${Math.floor(100 + Math.random() * 900)}`,
            role: role,
            lat: center.lat + (Math.random() - 0.5) * 0.008,
            lng: center.lng + (Math.random() - 0.5) * 0.008,
            vx: (Math.random() - 0.5) * 0.00008,
            vy: (Math.random() - 0.5) * 0.00008,
            isPaused: false,
            state: {
                aggressionLevel: 0,
                isBlocked: false
            }
        });
    }
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

function connectToCCTV(mission) {
    syncUI('cctv');
    isCctvMode = true;
    cctvIdSpan.innerText = mission.id;
    cctvOverlay.style.display = 'block';
    map.flyTo({ center: [mission.lng, mission.lat], zoom: 18, pitch: 75 });
}

btnExitCctv.onclick = () => {
    isCctvMode = false;
    cctvOverlay.style.display = 'none';
};

document.getElementById('btn-run-scraper').onclick = () => {
    syncUI('scraper');
    statusText.innerText = "🕷️ SCRAPER ACTIVO: EXTRACCIÓN DE NODOS Y FINANZAS URBANAS...";
    setTimeout(() => {
        playerXP += 80; territoryControlPct = Math.min(100, territoryControlPct + 5);
        saveProfileData();
        statusText.innerText = "✔ DATOS EXTRAÍDOS // EXP +80 // DOMINIO AUMENTADO";
    }, 1200);
};

document.getElementById('btn-hack-db').onclick = () => openHackMinigame({ id: 99, title: "BASE DE DATOS REGIONAL", desc: "Infiltrar software central" });

function openHackMinigame(target) {
    syncUI('hack');
    userSequence = []; generatedSequence = [];
    for (let i = 0; i < 4; i++) generatedSequence.push(Math.floor(1 + Math.random() * 6));

    patternGrid.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const btn = document.createElement('div');
        btn.className = 'node-btn'; btn.innerText = i;
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
        if (step >= generatedSequence.length) clearInterval(interval);
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
        userSequence = [];
        setTimeout(playPatternPreview, 1000);
        return;
    }

    if (userSequence.length === generatedSequence.length) {
        if (currentActivePoi && !currentActivePoi.claimed) {
            currentActivePoi.claimed = true;
            visitedStops += 1;
            statusText.innerText = "✔ CONOCIMIENTO Y DATOS EXTRAÍDOS CON ÉXITO DE LA PARADA";
        }
        playerXP += 150; territoryControlPct = Math.min(100, territoryControlPct + 10);
        saveProfileData(); renderMissionsList();
        setTimeout(() => hackModal.style.display = 'none', 1200);
    }
}

closeModal.onclick = () => hackModal.style.display = 'none';

// --- SISTEMA DE CHAT CON NPCS ---

function openChatModal(npc) {
    syncUI('chat');
    currentChatNpc = npc;
    npc.isPaused = true;

    const config = NPC_ROLES_CONFIG[npc.role];
    chatAgentId.innerText = `${npc.id} // ROLE: ${npc.role.toUpperCase()}`;
    chatAgentId.style.color = config.color;

    const aggressionPct = npc.state.aggressionLevel / config.maxAggression;
    const modalCard = chatModal.querySelector('.modal-card');
    if (aggressionPct > 0.6) {
        modalCard.classList.add('hostile');
    } else {
        modalCard.classList.remove('hostile');
    }

    chatHistory.innerHTML = '';
    chatUserInput.value = '';

    if (npc.state.isBlocked) {
        chatUserInput.disabled = true;
        chatUserInput.placeholder = ">> ACCESO DENEGADO POR LA ENTIDAD";
        btnSendChat.disabled = true;
    } else {
        chatUserInput.disabled = false;
        chatUserInput.placeholder = "Enviar mensaje encriptado...";
        btnSendChat.disabled = false;
    }

    let greeting = config.initialGreeting;
    const history = npcInteractionMemory[npc.id] || {};

    if (npc.state.isBlocked) {
        greeting = config.consequence;
    } else if (history.lastInteraction === 'ignored') {
        greeting = config.historyGreetings.ignored;
    } else if (history.lastInteraction === 'success') {
        greeting = config.historyGreetings.success;
    } else if (history.lastInteraction === 'penalty') {
        greeting = config.historyGreetings.penalty;
    }

    addChatMessage(greeting, npc.role);
    updateNpcMemory(npc.id, 'started');

    chatModal.style.display = 'flex';
    lastInteractionTime = Date.now();
    if (!npc.state.isBlocked) chatUserInput.focus();
}

function addChatMessage(message, role) {
    const p = document.createElement('div');
    const config = NPC_ROLES_CONFIG[role];
    p.innerHTML = `<strong class="npc-${role}" style="color: ${config ? config.color : '#00f0ff'}">${role.toUpperCase()} // </strong> ${message}`;
    chatHistory.appendChild(p);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function handleUserChatSubmit() {
    const msg = chatUserInput.value.trim();
    if (!msg || !currentChatNpc || currentChatNpc.state.isBlocked) return;

    const userP = document.createElement('div');
    userP.innerHTML = `<strong>AGENTE // </strong> ${msg}`;
    chatHistory.appendChild(userP);

    chatUserInput.value = '';
    lastInteractionTime = Date.now();

    const config = NPC_ROLES_CONFIG[currentChatNpc.role];
    const response = config.getResponse(msg, currentChatNpc.state);

    if (currentChatNpc.state.aggressionLevel >= config.maxAggression) {
        currentChatNpc.state.isBlocked = true;

        setTimeout(() => {
            addChatMessage(config.consequence, currentChatNpc.role);
            chatUserInput.disabled = true;
            chatUserInput.placeholder = ">> ACCESO DENEGADO POR LA ENTIDAD";
            btnSendChat.disabled = true;

            statusText.innerText = `>> ALERTA // Enlace con ${currentChatNpc.id} cortado. Penalización DedSec activada.`;
            updateNpcMemory(currentChatNpc.id, 'penalty');
        }, 1000);

        return;
    }

    setTimeout(() => {
        addChatMessage(response, currentChatNpc.role);
        const aggressionPct = currentChatNpc.state.aggressionLevel / config.maxAggression;
        const modalCard = chatModal.querySelector('.modal-card');
        if (aggressionPct > 0.6) {
            modalCard.classList.add('hostile');
        }
        updateNpcMemory(currentChatNpc.id, 'chatting');
    }, 1000);
}

btnSendChat.onclick = handleUserChatSubmit;
chatUserInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserChatSubmit();
});

closeChat.onclick = () => {
    if (currentChatNpc) {
        currentChatNpc.isPaused = false;
        const config = NPC_ROLES_CONFIG[currentChatNpc.role];
        if (currentChatNpc.state.aggressionLevel > (config.maxAggression / 2) && !currentChatNpc.state.isBlocked) {
            updateNpcMemory(currentChatNpc.id, 'penalty');
        } else {
            updateNpcMemory(currentChatNpc.id, 'cancelled');
        }
        currentChatNpc = null;
    }
    chatModal.style.display = 'none';
};

function updateNpcMemory(npcId, interactionType) {
    if (!npcInteractionMemory[npcId]) {
        npcInteractionMemory[npcId] = { count: 0 };
    }
    npcInteractionMemory[npcId].lastInteraction = interactionType;
    npcInteractionMemory[npcId].count++;
    npcInteractionMemory[npcId].timestamp = Date.now();
}

function saveProfileData() {
    const data = {
        username: myAgentId,
        xp: playerXP,
        stops: visitedStops,
        pvp: pvpWins,
        pct: territoryControlPct
    };
    localStorage.setItem(`ctos_user_${myAgentId}`, JSON.stringify(data));
    updateProfileUI();
}

function updateProfileUI() {
    xpVal.innerText = `${playerXP} PTS`;
    stopsVal.innerText = visitedStops;
    pvpVal.innerText = pvpWins;
    territoryFill.style.width = `${territoryControlPct}%`;
    territoryPct.innerText = `${territoryControlPct}%`;
}

// 6. NAVEGACIÓN Y CONTROLES
async function flyToSpaceAndDive(targetLng, targetLat, locationName) {
    if (isFlying) return;
    isFlying = true;
    map.flyTo({ center: map.getCenter(), zoom: 1.8, pitch: 30, duration: 2200 });

    setTimeout(() => {
        map.flyTo({ center: [targetLng, targetLat], zoom: 16, pitch: 60, duration: 3200 });
    }, 2300);

    setTimeout(() => {
        isFlying = false;
        generatePokemonGoStops(map.getCenter());
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

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const bindTouchControl = (btnId, keyName) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[keyName] = true; });
    btn.addEventListener('pointerup', (e) => { e.preventDefault(); keys[keyName] = false; });
    btn.addEventListener('pointerleave', (e) => { e.preventDefault(); keys[keyName] = false; });
};

bindTouchControl('btn-up', 'w');
bindTouchControl('btn-down', 's');
bindTouchControl('btn-left', 'a');
bindTouchControl('btn-right', 'd');

function handleMapMovement() {
    if (!map || isFlying || isCctvMode || chatModal.style.display === 'flex') return;
    const center = map.getCenter();
    const step = 0.00008;

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

// LOGICA DE PROXIMIDAD Y CONTROL DE PANELES
function checkProximityAndManageUI() {
    if (!map || isFlying || isCctvMode) return;
    const center = map.getCenter();
    const now = Date.now();

    const poiPopupActive = poiPopupCard.style.display === 'block';
    const chatActive = chatModal.style.display === 'flex';
    const hackActive = hackModal.style.display === 'flex';

    if (poiPopupActive) {
        if (currentActivePoi) {
            const dist = Math.hypot(currentActivePoi.lat - center.lat, currentActivePoi.lng - center.lng);
            if (dist > EXIT_THRESHOLD && (now - lastInteractionTime > MIN_POPUP_HOLD_TIME)) {
                poiPopupCard.style.display = 'none';
                currentActivePoi = null;
                statusText.innerText = "DEDSEC NETRUNNER // Fuera de rango de la parada.";
            }
        }
        return;
    }

    if (chatActive) {
        if (currentChatNpc) {
            const dist = Math.hypot(currentChatNpc.lat - center.lat, currentChatNpc.lng - center.lng);
            if (dist > EXIT_THRESHOLD && (now - lastInteractionTime > MIN_POPUP_HOLD_TIME)) {
                updateNpcMemory(currentChatNpc.id, 'ignored');
                currentChatNpc.isPaused = false;
                currentChatNpc = null;
                chatModal.style.display = 'none';
                statusText.innerText = "DEDSEC NETRUNNER // Entidad de red ignorada.";
            }
        }
        return;
    }

    if (hackActive) return;

    for (const stop of poiStops) {
        const dist = Math.hypot(stop.lat - center.lat, stop.lng - center.lng);
        if (dist < ENTER_THRESHOLD && !stop.claimed) {
            openPoiPopup(stop);
            return;
        }
    }

    for (const npc of npcs) {
        const dist = Math.hypot(npc.lat - center.lat, npc.lng - center.lng);
        if (dist < ENTER_THRESHOLD) {
            openChatModal(npc);
            return;
        }
    }
}

function syncUI(currentLayoutType) {
    const layouts = {
        poi: poiPopupCard,
        hack: hackModal,
        cctv: cctvOverlay,
        chat: chatModal
    };

    Object.keys(layouts).forEach(type => {
        if (type !== currentLayoutType) {
            layouts[type].style.display = 'none';
        }
    });
}

// 7. BUCLE RENDERIZADO 60 FPS
function renderLoop() {
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    handleMapMovement();
    updateNPCs();
    checkProximityAndManageUI();

    renderPokemonGoStopsCanvas();
    renderMissionNodesCanvas();
    renderNPCsOnMap();

    if (!isCctvMode) {
        renderGyroAvatar(canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(renderLoop);
}

function updateNPCs() {
    npcs.forEach(npc => {
        if (!npc.isPaused) {
            npc.lat += npc.vx;
            npc.lng += npc.vy;
        }
    });
}

function renderNPCsOnMap() {
    if (!map || isFlying) return;
    npcs.forEach(npc => {
        const pt = map.project([npc.lng, npc.lat]);
        const cpt = map.project(map.getCenter());
        const sx = canvas.width / 2 + (pt.x - cpt.x);
        const sy = canvas.height / 2 + (pt.y - cpt.y);

        const roleConfig = NPC_ROLES_CONFIG[npc.role];

        ctx.fillStyle = roleConfig ? roleConfig.accent : '#00f0ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '8px Consolas';
        ctx.fillText(npc.id, sx - 20, sy - 15);
        ctx.fillStyle = roleConfig ? roleConfig.color : '#00f0ff';
        ctx.fillText(npc.role.toUpperCase(), sx - 20, sy - 6);
    });
}

function renderPokemonGoStopsCanvas() {
    if (!map || isFlying) return;
    poiStops.forEach(stop => {
        const pt = map.project([stop.lng, stop.lat]);
        const cpt = map.project(map.getCenter());
        const sx = canvas.width / 2 + (pt.x - cpt.x);
        const sy = canvas.height / 2 + (pt.y - cpt.y);

        const color = stop.claimed ? '#10b981' : '#00f0ff';
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Consolas';
        ctx.fillText(`[${stop.title}]`, sx - 30, sy - 12);
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

    if (customAvatarSpriteUrl) {
        const img = new Image(); img.src = customAvatarSpriteUrl;
        cropCtx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
    } else {
        cropCtx.fillStyle = '#0f172a'; cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.fillStyle = '#00f0ff'; cropCtx.font = 'bold 10px Consolas'; cropCtx.fillText("AGENTE", 25, 60);
    }

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