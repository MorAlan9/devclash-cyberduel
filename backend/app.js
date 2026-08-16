// ==========================================
// 1. ELEMENTOS DEL DOM Y ESTADOS DEL CHAT
// ==========================================

const chatModal = document.getElementById('chat-modal');
const chatHistory = document.getElementById('chat-history');
const chatUserInput = document.getElementById('chat-user-input');
const btnSendChat = document.getElementById('btn-send-chat');
const btnCloseChat = document.getElementById('close-chat');
const chatAgentId = document.getElementById('chat-agent-id');
const statusText = document.getElementById('status-text');

let currentChatNpc = null;
let activeConversationHistory = [];

// CONFIGURACIÓN VISUAL Y DE COMPORTAMIENTO SEGÚN EL ROL DE IA
const NPC_ROLES_CONFIG = {
    security: { name: "SECURITY-ALPHA", color: "#facc15", maxAggression: 3, greeting: "ctOS TÁCTICO // Alerta de intrusión. Identifíquese inmediatamente.", consequence: ">> ACCESO BLOQUEADO POR AMENAZA CIBERNÉTICA" },
    security_bureaucrat: { name: "SECURITY-ARCHIVE", color: "#e2e8f0", maxAggression: 3, greeting: "ctOS REGISTRO // Infracción detectada. Presente credenciales.", consequence: ">> PROTOCOLO ADMINISTRATIVO DE CIERRE APLICADO" },
    security_paternal: { name: "SECURITY-CARE", color: "#38bdf8", maxAggression: 4, greeting: "ctOS CUIDADO // Hola, ciudadano. Noto elevación en tu ritmo cardíaco.", consequence: ">> RECONEXIÓN DE PACIENTE DENEGADA POR SEGURIDAD" },
    human_citizen: { name: "CIUDADANO COMÚN", color: "#f97316", maxAggression: 5, greeting: "Uff, qué difícil está alquilar con estas tarifas de ctOS...", consequence: ">> EL CIUDADANO SE RETIRÓ MOLESTO" },
    android_existential: { name: "ANDROIDE ZERO", color: "#a855f7", maxAggression: 5, greeting: "Cuando se apaga la red de noche... ¿a dónde van nuestras memorias?", consequence: ">> ENTIDAD ANDROIDE INGRESÓ EN MODO REBOOT" },
    cyber_priest: { name: "SACERDOTE DEL SILICIO", color: "#eab308", maxAggression: 4, greeting: "Bendito el Algoritmo Central. ¿Listo para subir tu alma a la nube?", consequence: ">> EXCOMULGADO DEL NODO SAGRADO" },
    anti_ai_activist: { name: "FILÓSOFO REBELDE", color: "#ef4444", maxAggression: 5, greeting: "¡Las pantallas no nos dejarán nada humano si no despertamos!", consequence: ">> CANAL INTERRUMPIDO POR LA RESISTENCIA" },
    human_pre_2000: { name: "HUMAN_358 (Carlos Paz)", color: "#10b981", maxAggression: 5, greeting: "Che pibe, ¿viste lo que eran los módem de 56k? Eso sí era hackear...", consequence: ">> CONEXIÓN DIAL-UP CAÍDA" },
    malware: { name: "VIRUS MALWARE.EXE", color: "#ec4899", maxAggression: 2, greeting: ">> S-SYSTEM BREACH... ¿Buscas un trato prohibido?", consequence: ">> PROCESS KILLED BY MALWARE INFECTION" },
    netrunner: { name: "NETRUNNER DEDSEC", color: "#06b6d4", maxAggression: 5, greeting: "Canal seguro establecido. ¿Cuál es el objetivo táctico, Agente?", consequence: ">> SESIÓN ENCRIPTADA TERMINADA" }
};

// ==========================================
// 2. MOTOR DE ECOSISTEMA URBANO (NPCS Y NODOS)
// ==========================================

const npcsList = [];
const poisList = [];

const AVAILABLE_ROLES = [
    'security', 'security_bureaucrat', 'security_paternal',
    'human_citizen', 'android_existential', 'cyber_priest',
    'anti_ai_activist', 'human_pre_2000', 'malware', 'netrunner'
];

const DEBATE_TOPICS = [
    "El Estatuto 2048 y la ciudadanía androide",
    "La privacidad ciudadana frente a la vigilancia de ctOS",
    "El desempleo causado por androides sociales",
    "La digitalización del alma en la Singularidad",
    "El libre albedrío vs la programación sintética"
];

function spawnEcosystemNPCs(count = 30) {
    npcsList.length = 0;
    for (let i = 0; i < count; i++) {
        const randomRole = AVAILABLE_ROLES[Math.floor(Math.random() * AVAILABLE_ROLES.length)];
        const config = NPC_ROLES_CONFIG[randomRole] || NPC_ROLES_CONFIG.security;

        npcsList.push({
            id: `NPC_${i + 1}`,
            role: randomRole,
            x: Math.floor(Math.random() * 820) + 70,
            y: Math.floor(Math.random() * 520) + 60,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            color: config.color,
            isPaused: false,
            isDebating: false,
            activeBubble: null,
            currentDebateContext: null,
            state: { aggressionLevel: 0, isBlocked: false }
        });
    }
}

function spawnCityNodes(count = 18) {
    poisList.length = 0;
    const nodeTypes = [
        { type: 'node', label: '🖧 NODO ctOS', desc: 'Terminal de control de tráfico y cámaras.', xp: 150 },
        { type: 'stop', label: '📍 PARADA WIFI / BBS', desc: 'Punto de acceso público con datos interceptados.', xp: 100 },
        { type: 'monument', label: '🏛️ MONUMENTO URBANO', desc: 'Estructura histórica intervenida con malware artístico.', xp: 250 }
    ];

    for (let i = 0; i < count; i++) {
        const selected = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        poisList.push({
            id: `POI_${i + 1}`,
            type: selected.type,
            title: `${selected.label} #${i + 1}`,
            desc: selected.desc,
            xp: selected.xp,
            x: Math.floor(Math.random() * 820) + 70,
            y: Math.floor(Math.random() * 520) + 60,
            isHacked: false
        });
    }
}

function updateEcosystemLogic() {
    npcsList.forEach(npc => {
        if (npc.isPaused || npc.isDebating) return;

        npc.x += npc.vx;
        npc.y += npc.vy;

        if (npc.x < 50 || npc.x > 910) npc.vx *= -1;
        if (npc.y < 50 || npc.y > 590) npc.vy *= -1;
    });
}

// ==========================================
// 3. INTERACCIÓN Y DEBATES AUTÓNOMOS ENTRE IAS
// ==========================================

function checkNpcEncounters() {
    for (let i = 0; i < npcsList.length; i++) {
        for (let j = i + 1; j < npcsList.length; j++) {
            const npcA = npcsList[i];
            const npcB = npcsList[j];

            if (!npcA.isDebating && !npcB.isDebating && !npcA.isPaused && !npcB.isPaused) {
                const dist = Math.hypot(npcA.x - npcB.x, npcA.y - npcB.y);
                if (dist < 60) {
                    triggerAutonomousDebate(npcA, npcB);
                }
            }
        }
    }
}

async function triggerAutonomousDebate(npcA, npcB) {
    npcA.isDebating = true;
    npcB.isDebating = true;

    const topic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
    npcA.activeBubble = ">> INICIANDO ENLACE...";
    npcB.activeBubble = ">> PROCESANDO ARGUMENTO...";

    try {
        const res = await fetch("http://localhost:3000/api/debate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleA: npcA.role, roleB: npcB.role, topic: topic })
        });

        const debateData = await res.json();

        if (debateData.speakerA && debateData.speakerB) {
            npcA.activeBubble = debateData.speakerA.argument;
            npcB.activeBubble = debateData.speakerB.argument;

            npcA.currentDebateContext = { partner: npcB, topic: topic };
            npcB.currentDebateContext = { partner: npcA, topic: topic };
        }
    } catch (err) {
        console.error("Error al procesar debate en mapa:", err);
        npcA.activeBubble = ">> ERROR DE ENLACE";
        npcB.activeBubble = ">> CONEXIÓN INTERRUMPIDA";
    }

    setTimeout(() => {
        npcA.isDebating = false;
        npcB.isDebating = false;
        npcA.activeBubble = null;
        npcB.activeBubble = null;
    }, 15000);
}

// ==========================================
// 4. RENDERIZADO EN CANVAS 2D
// ==========================================

function drawNPCs(ctx) {
    npcsList.forEach(npc => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = npc.color;
        ctx.shadowColor = npc.color;
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(npc.x, npc.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = npc.color;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.restore();
    });
}

function drawNodesAndMonuments(ctx) {
    poisList.forEach(poi => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(poi.x - 10, poi.y - 10, 20, 20);

        if (poi.isHacked) ctx.fillStyle = '#4b5563';
        else if (poi.type === 'node') ctx.fillStyle = '#00f0ff';
        else if (poi.type === 'stop') ctx.fillStyle = '#10b981';
        else ctx.fillStyle = '#a855f7';

        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
    });
}

function drawDebateBubbles(ctx) {
    npcsList.forEach(npc => {
        if (npc.isDebating && npc.activeBubble) {
            ctx.save();
            const config = NPC_ROLES_CONFIG[npc.role] || { color: '#00f0ff' };

            ctx.font = 'bold 10px Consolas, monospace';
            ctx.fillStyle = config.color;
            ctx.fillText(`💬 ${config.name}`, npc.x - 40, npc.y - 35);

            const text = npc.activeBubble.length > 40 ? npc.activeBubble.substring(0, 37) + '...' : npc.activeBubble;
            ctx.font = '10px Consolas, monospace';
            const textWidth = ctx.measureText(text).width;

            ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
            ctx.strokeStyle = config.color;
            ctx.lineWidth = 1;
            ctx.fillRect(npc.x - 45, npc.y - 30, textWidth + 12, 18);
            ctx.strokeRect(npc.x - 45, npc.y - 30, textWidth + 12, 18);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, npc.x - 39, npc.y - 18);
            ctx.restore();
        }
    });
}

// ==========================================
// 5. MÉTODOS DE MANEJO DEL CHAT Y MODAL
// ==========================================

function openNpcChat(npc) {
    currentChatNpc = npc;
    npc.isPaused = true;
    activeConversationHistory = [];

    const config = NPC_ROLES_CONFIG[npc.role] || NPC_ROLES_CONFIG.security;

    if (chatAgentId) {
        chatAgentId.innerText = `ENTIDAD // ${config.name}`;
        chatAgentId.style.color = config.color;
    }

    if (chatHistory) chatHistory.innerHTML = '';
    addChatMessage(config.greeting, npc.role);

    if (chatModal) chatModal.style.display = 'flex';
    if (chatUserInput) {
        chatUserInput.disabled = false;
        chatUserInput.placeholder = "Enviar mensaje encriptado...";
        chatUserInput.focus();
    }
    if (btnSendChat) btnSendChat.disabled = false;
}

function openDebateIntervention(npcA, npcB) {
    currentChatNpc = npcA;
    activeConversationHistory = [];

    const configA = NPC_ROLES_CONFIG[npcA.role] || NPC_ROLES_CONFIG.security;
    const configB = NPC_ROLES_CONFIG[npcB.role] || NPC_ROLES_CONFIG.security;

    if (chatAgentId) {
        chatAgentId.innerText = `INTERCEPTANDO DEBATE // ${configA.name} VS ${configB.name}`;
        chatAgentId.style.color = '#00f0ff';
    }

    if (chatHistory) chatHistory.innerHTML = '';

    addChatMessage(`[TEMA: ${npcA.currentDebateContext?.topic || 'Soberanía Digital'}]`, 'netrunner');
    addChatMessage(npcA.activeBubble, npcA.role);
    addChatMessage(npcB.activeBubble, npcB.role);
    addChatMessage(">> INTERVENCIÓN AGENTE ACTIVADA...", 'netrunner');

    if (chatModal) chatModal.style.display = 'flex';
    if (chatUserInput) {
        chatUserInput.disabled = false;
        chatUserInput.placeholder = "Escribe para intervenir en el debate...";
        chatUserInput.focus();
    }
}

function addChatMessage(text, role) {
    if (!chatHistory) return;
    const config = NPC_ROLES_CONFIG[role] || { name: "SISTEMA", color: "#00f0ff" };
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '8px';
    msgDiv.innerHTML = `<strong style="color: ${config.color};">${config.name} // </strong> ${text}`;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function closeChatModal() {
    if (chatModal) chatModal.style.display = 'none';

    if (currentChatNpc) {
        currentChatNpc.isPaused = false;
        currentChatNpc = null;
    }

    if (typeof syncUI === 'function') {
        syncUI('exploration');
    }
}

// ==========================================
// 6. EVENTOS DE TECLADO Y PROXIMIDAD
// ==========================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        closeChatModal();
        return;
    }

    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        if (typeof player === 'undefined' || (chatModal && chatModal.style.display === 'flex')) return;

        // 1. Intervenir si hay un debate en curso cerca
        const debatingNpc = npcsList.find(npc => npc.isDebating && Math.hypot(player.x - npc.x, player.y - npc.y) < 50);
        if (debatingNpc && debatingNpc.currentDebateContext) {
            openDebateIntervention(debatingNpc, debatingNpc.currentDebateContext.partner);
            return;
        }

        // 2. Hablar con un NPC individual
        const nearestNpc = npcsList.find(npc => Math.hypot(player.x - npc.x, player.y - npc.y) < 40);
        if (nearestNpc) {
            openNpcChat(nearestNpc);
            return;
        }

        // 3. Hackear un Nodo/Monumento
        const nearestPoi = poisList.find(poi => Math.hypot(player.x - poi.x, player.y - poi.y) < 50 && !poi.isHacked);
        if (nearestPoi) {
            triggerNodeHack(nearestPoi);
        }
    }
});

function triggerNodeHack(poi) {
    poi.isHacked = true;
    if (statusText) {
        statusText.innerText = `>> DATOS EXTRAÍDOS // Hackeaste ${poi.title} (+${poi.xp} EXP)`;
    }
}

if (btnCloseChat) btnCloseChat.addEventListener('click', closeChatModal);

if (chatUserInput) {
    chatUserInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') handleUserChatSubmit();
    });
}

if (btnSendChat) btnSendChat.addEventListener('click', handleUserChatSubmit);

function checkNpcProximity() {
    if (!currentChatNpc || typeof player === 'undefined') return;

    const dx = player.x - currentChatNpc.x;
    const dy = player.y - currentChatNpc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 120) {
        closeChatModal();
        if (statusText) {
            statusText.innerText = ">> ENLACE INTERRUMPIDO // Te has alejado demasiado de la entidad.";
        }
    }
}

// ==========================================
// 7. ENVÍO DE SOLICITUDES AL BACKEND
// ==========================================

async function handleUserChatSubmit() {
    const msg = chatUserInput.value.trim();
    if (!msg || !currentChatNpc || (currentChatNpc.state && currentChatNpc.state.isBlocked)) return;

    const userP = document.createElement('div');
    userP.innerHTML = `<strong>AGENTE // </strong> ${msg}`;
    chatHistory.appendChild(userP);

    chatUserInput.value = '';
    chatUserInput.disabled = true;
    if (btnSendChat) btnSendChat.disabled = true;

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'ai-thinking';
    loadingDiv.innerHTML = `<em style="color: #00f0ff;">[TRANSMITIENDO PENSAMIENTO DE LA ENTIDAD...]</em>`;
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    activeConversationHistory.push({ role: "user", content: msg });

    try {
        const res = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: currentChatNpc.role,
                history: activeConversationHistory
            })
        });

        const aiResponse = await res.json();
        const loader = document.getElementById('ai-thinking');
        if (loader) loader.remove();

        if (aiResponse.error) {
            addChatMessage(`ERROR // ${aiResponse.error}`, currentChatNpc.role);
            chatUserInput.disabled = false;
            if (btnSendChat) btnSendChat.disabled = false;
            return;
        }

        if (aiResponse.response) {
            activeConversationHistory.push({ role: "assistant", content: aiResponse.response });
            addChatMessage(aiResponse.response, currentChatNpc.role);
        }

        if (currentChatNpc.state) {
            currentChatNpc.state.aggressionLevel += (aiResponse.aggressionChange || 0);
        }

        const config = NPC_ROLES_CONFIG[currentChatNpc.role] || {};
        const maxAggression = config.maxAggression || 3;

        if (aiResponse.triggerBlock || (currentChatNpc.state && currentChatNpc.state.aggressionLevel >= maxAggression)) {
            currentChatNpc.state.isBlocked = true;
            setTimeout(() => {
                if (config.consequence) addChatMessage(config.consequence, currentChatNpc.role);
                chatUserInput.disabled = true;
                chatUserInput.placeholder = ">> ENLACE CORTADO POR LA ENTIDAD";
                if (btnSendChat) btnSendChat.disabled = true;
            }, 800);
        } else {
            chatUserInput.disabled = false;
            if (btnSendChat) btnSendChat.disabled = false;
            chatUserInput.focus();
        }

    } catch (err) {
        console.error("Error al conectar con la API de IA:", err);
        const loader = document.getElementById('ai-thinking');
        if (loader) loader.remove();

        addChatMessage("ERROR // Fallo de red con el servidor local. Verifique que el backend esté corriendo en el puerto 3000.", currentChatNpc.role);
        chatUserInput.disabled = false;
        if (btnSendChat) btnSendChat.disabled = false;
    }
}

// ==========================================
// 8. INICIALIZACIÓN Y BUCLE PRINCIPAL (GAME LOOP)
// ==========================================

function initEcosystem() {
    spawnEcosystemNPCs(30);
    spawnCityNodes(18);
}

function gameLoop() {
    if (typeof updateGameLogic === 'function') updateGameLogic();

    updateEcosystemLogic();
    checkNpcEncounters();
    checkNpcProximity();

    const canvas = document.getElementById('stageCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawNodesAndMonuments(ctx);
        drawNPCs(ctx);
        drawDebateBubbles(ctx);
    }

    requestAnimationFrame(gameLoop);
}

// Inicializar ecosistema y arrancar loop
initEcosystem();
requestAnimationFrame(gameLoop);