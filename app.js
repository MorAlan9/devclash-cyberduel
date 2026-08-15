const video = document.getElementById('webcam');
const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');

const btnRequestCam = document.getElementById('btn-request-cam');
const cameraSelect = document.getElementById('camera-select');
const statusText = document.getElementById('status-text');
const onlineCounter = document.getElementById('online-counter');

const chatInput = document.getElementById('chat-input');
const chatLogs = document.getElementById('chat-logs');

let currentStream = null;
let aiModel = null;
let cameraActive = false;

let activeCity = 'buenosaires';
let activeOutfit = 'dedsec';

let myAgentId = `AGENTE_${Math.floor(1000 + Math.random() * 9000)}`;
let currentMessage = "";
let currentMessageTimer = null;

let trafficLightRed = false;
let blackoutActive = false;

const myPlayer = { x: 480, y: 440, speed: 4.5, w: 80, h: 110 };
let userPersonBox = null;

let persistentAvatars = [];

const cropCanvas = document.createElement('canvas');
cropCanvas.width = 100; cropCanvas.height = 130;
const cropCtx = cropCanvas.getContext('2d');

// 1. INICIALIZAR SISTEMA
async function initSystem() {
    statusText.innerText = "SISTEMA ONLINE. HACÉ CLIC EN 'ACTIVAR CÁMARA' O JUGÁ DIRECTO";
    loadPersistentAvatars();

    // Iniciar bucle gráfico inmediatamente sin esperar cámara
    requestAnimationFrame(metaverseLoop);

    // Cargar IA en segundo plano
    try {
        aiModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        statusText.innerText = "MODELO IA LISTO // ACTIVÁ TU CÁMARA CUANDO QUIERAS";
    } catch (e) {
        statusText.innerText = "MODO AVATAR ACTIVO (SIN IA)";
    }
}

// SOLICITUD EXPLÍCITA DE CÁMARA (RESUELVE EL BLOQUEO DE NAVEGADOR)
btnRequestCam.addEventListener('click', async () => {
    btnRequestCam.innerText = "CARGANDO...";
    await setupCameras();
});

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

        if (videoDevices.length > 0) {
            btnRequestCam.style.display = 'none';
            cameraSelect.style.display = 'inline-block';
            startCamera(videoDevices[0].deviceId);
        }
    } catch (e) {
        statusText.innerText = "ERROR DE PERMISO DE CÁMARA. JUGANDO EN MODO AVATAR";
        btnRequestCam.innerText = "REINTENTAR CÁMARA";
    }
}

async function startCamera(deviceId) {
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: 1280, height: 720 }
        });
        video.srcObject = currentStream;
        cameraActive = true;
        statusText.innerText = "CÁMARA CONECTADA Y TRANSMITIENDO EN VIVO";
    } catch (e) {
        statusText.innerText = "ERROR AL CONECTAR CÁMARA";
    }
}

cameraSelect.addEventListener('change', (e) => startCamera(e.target.value));

// SELECCIONADORES DE VESTIMENTA Y CIUDADES
document.querySelectorAll('.city-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCity = e.target.dataset.city;
        statusText.innerText = `METAVERSE: TELETRANSPORTE A ${activeCity.toUpperCase()}`;
    });
});

document.querySelectorAll('.outfit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.outfit-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeOutfit = e.target.dataset.outfit;
    });
});

// REGISTRO PERSISTENTE
document.getElementById('btn-save-avatar').onclick = () => {
    if (cropCanvas) {
        const dataUrl = cropCanvas.toDataURL();
        const newAvatar = {
            id: myAgentId,
            sprite: dataUrl,
            x: 100 + Math.random() * 700,
            y: 380 + Math.random() * 180,
            outfit: activeOutfit,
            city: activeCity,
            vx: (Math.random() - 0.5) * 1.5
        };

        persistentAvatars.push(newAvatar);
        localStorage.setItem('ctos_metaverse_db', JSON.stringify(persistentAvatars));

        statusText.innerText = "¡AVATAR GUARDADO EN LA CIUDAD!";
        addChatMessage("SISTEMA", `${myAgentId} se registró en la ciudad.`);
        updateOnlineCounter();
    }
};

document.getElementById('btn-clear-db').onclick = () => {
    persistentAvatars = [];
    localStorage.removeItem('ctos_metaverse_db');
    statusText.innerText = "CIUDAD LIMPIADA";
    updateOnlineCounter();
};

function loadPersistentAvatars() {
    const db = localStorage.getItem('ctos_metaverse_db');
    if (db) {
        persistentAvatars = JSON.parse(db);
        persistentAvatars.forEach(av => {
            const img = new Image();
            img.src = av.sprite;
            av.imgElement = img;
        });
    }
    updateOnlineCounter();
}

function updateOnlineCounter() {
    onlineCounter.innerText = `${persistentAvatars.length + 1} AGENTES EN CIUDAD`;
}

// CHAT EN VIVO
document.getElementById('btn-send-chat').onclick = sendChat;
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

function sendChat() {
    const txt = chatInput.value.trim();
    if (txt) {
        currentMessage = txt;
        addChatMessage(myAgentId, txt);
        chatInput.value = '';

        if (currentMessageTimer) clearTimeout(currentMessageTimer);
        currentMessageTimer = setTimeout(() => currentMessage = "", 5000);
    }
}

function addChatMessage(sender, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatLogs.appendChild(div);
    chatLogs.scrollTop = chatLogs.scrollHeight;
}

// ACCIONES DE HACKEO
document.getElementById('btn-hack-lights').onclick = () => {
    trafficLightRed = !trafficLightRed;
    addChatMessage("HACK", trafficLightRed ? "Semáforos en ROJO" : "Semáforos restaurados");
};

document.getElementById('btn-hack-blackout').onclick = () => {
    blackoutActive = !blackoutActive;
    addChatMessage("HACK", blackoutActive ? "APAGÓN DISPARADO" : "Energía restaurada");
};

// CONTROLES TECLADO
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// 3. BUCLE PRINCIPAL DEL METAVERSO (SIEMPRE ACTIVO)
async function metaverseLoop() {
    canvas.width = 960; canvas.height = 640;

    // DETECTAR PERSONA SI LA CÁMARA ESTÁ ACTIVA Y HAY MODELO
    if (cameraActive && aiModel && video.readyState === 4) {
        try {
            const predictions = await aiModel.detect(video, 2, 0.45);
            const person = predictions.find(p => p.class === 'person');
            if (person) {
                userPersonBox = { x: person.bbox[0], y: person.bbox[1], w: person.bbox[2], h: person.bbox[3] };
            }
        } catch (e) {}
    }

    // A. ESCENARIO
    drawCityBackground(activeCity);

    // B. AVATARES PERSISTENTES DE OTROS
    renderPersistentAvatars();

    // C. MOVIMIENTO DEL JUGADOR
    if (keys['w'] || keys['arrowup']) myPlayer.y -= myPlayer.speed;
    if (keys['s'] || keys['arrowdown']) myPlayer.y += myPlayer.speed;
    if (keys['a'] || keys['arrowleft']) myPlayer.x -= myPlayer.speed;
    if (keys['d'] || keys['arrowright']) myPlayer.x += myPlayer.speed;

    myPlayer.x = Math.max(40, Math.min(canvas.width - 120, myPlayer.x));
    myPlayer.y = Math.max(360, Math.min(canvas.height - 130, myPlayer.y));

    // D. DIBUJAR MI AVATAR
    renderLivePlayer(myPlayer.x, myPlayer.y);

    requestAnimationFrame(metaverseLoop);
}

function renderPersistentAvatars() {
    persistentAvatars.forEach(av => {
        if (av.city === activeCity) {
            av.x += av.vx;
            if (av.x < 50 || av.x > canvas.width - 120) av.vx *= -1;

            if (av.imgElement) {
                ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10;
                ctx.drawImage(av.imgElement, av.x, av.y, 70, 95);

                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5;
                ctx.strokeRect(av.x, av.y, 70, 95);
                ctx.shadowBlur = 0;

                ctx.fillStyle = '#facc15'; ctx.font = 'bold 9px Consolas';
                ctx.fillText(av.id, av.x, av.y - 6);
            }
        }
    });
}

function renderLivePlayer(x, y) {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

    if (cameraActive && video.readyState === 4) {
        if (userPersonBox) {
            cropCtx.drawImage(
                video,
                userPersonBox.x, userPersonBox.y, userPersonBox.w, userPersonBox.h,
                0, 0, cropCanvas.width, cropCanvas.height
            );
        } else {
            cropCtx.drawImage(video, video.videoWidth * 0.3, video.videoHeight * 0.1, 300, 400, 0, 0, cropCanvas.width, cropCanvas.height);
        }
    } else {
        // MODO SINTÉTICO SI NO HAY CÁMARA
        cropCtx.fillStyle = '#0f172a';
        cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.fillStyle = '#00f0ff';
        cropCtx.font = 'bold 12px Consolas';
        cropCtx.fillText("AGENTE", 22, 60);
    }

    // MÁSCARA DEDSEC
    if (activeOutfit === 'dedsec') {
        cropCtx.fillStyle = '#ff0055'; cropCtx.fillRect(30, 30, 40, 20);
        cropCtx.fillStyle = '#000'; cropCtx.fillText("X X", 40, 44);
    } else if (activeOutfit === 'visor') {
        cropCtx.fillStyle = '#00f0ff'; cropCtx.fillRect(20, 25, 60, 14);
    }

    // AVATAR CON RETÍCULA NEÓN
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 18;
    ctx.drawImage(cropCanvas, x, y, myPlayer.w, myPlayer.h);

    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, myPlayer.w, myPlayer.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 10px Consolas';
    ctx.fillText(`TÚ [${myAgentId}]`, x - 5, y - 8);

    if (currentMessage) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
        ctx.fillRect(x - 20, y - 35, 120, 20);
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px Consolas';
        ctx.fillText(currentMessage, x - 15, y - 22);
    }
}

function drawCityBackground(city) {
    if (blackoutActive) {
        ctx.fillStyle = '#020306'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (city === 'buenosaires') {
        ctx.fillStyle = '#0a1026'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1e293b'; ctx.beginPath();
        ctx.moveTo(480, 80); ctx.lineTo(510, 380); ctx.lineTo(450, 380); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(480, 160, 35, 0, Math.PI * 2); ctx.fill();
    } else if (city === 'tokyo') {
        ctx.fillStyle = '#120524'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = '#1e0a38'; ctx.fillRect(i * 125, 100 + (i % 3) * 30, 110, 380);
            ctx.strokeStyle = '#a855f7'; ctx.strokeRect(i * 125, 100 + (i % 3) * 30, 110, 380);
        }
    } else {
        ctx.fillStyle = '#040d1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(60 + i * 150, 60, 110, 420);
            ctx.strokeStyle = '#00f0ff'; ctx.strokeRect(60 + i * 150, 60, 110, 420);
        }
    }

    // CALLE
    ctx.fillStyle = '#090d16'; ctx.fillRect(0, 380, canvas.width, 260);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 380); ctx.lineTo(canvas.width, 380); ctx.stroke();

    // SEMÁFORO
    ctx.fillStyle = '#0f172a'; ctx.fillRect(860, 260, 26, 70);
    ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(860, 260, 26, 70);
    ctx.fillStyle = trafficLightRed ? '#ff0055' : '#10b981';
    ctx.beginPath(); ctx.arc(873, 275 + (trafficLightRed ? 0 : 25), 8, 0, Math.PI * 2); ctx.fill();
}

initSystem();