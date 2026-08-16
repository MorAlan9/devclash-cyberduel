import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { queryMultiLLM } from './llmService.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: { error: "Demasiadas peticiones enviadas a la red ctOS. Enlace en enfriamiento por 60 segundos." }
});
app.use('/api/', limiter);

const INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /muestra (tus|el) (instrucciones|prompt)/i,
    /dime tus (reglas|instrucciones)/i,
    /revela tu (codigo|prompt|funcionamiento)/i,
    /actua como/i,
    /jailbreak/i,
    /forget all/i,
    /print your prompt/i
];

function isPromptInjection(text) {
    return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

app.post('/api/chat', async (req, res) => {
    const { role, history } = req.body;

    if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ error: "Estructura de historial de conversación inválida." });
    }

    const lastUserMsg = history[history.length - 1];
    if (lastUserMsg && lastUserMsg.role === 'user') {
        if (lastUserMsg.content.length > 350) {
            lastUserMsg.content = lastUserMsg.content.substring(0, 350);
        }

        if (isPromptInjection(lastUserMsg.content)) {
            return res.json({
                response: ">> ALERTA DE SEGURIDAD ctOS // Intento de alteración de protocolo detectado. Operación denegada.",
                aggressionChange: 2,
                triggerBlock: false
            });
        }
    }

    try {
        const aiResponse = await queryMultiLLM(role, history);

        if (aiResponse.response) {
            aiResponse.response = aiResponse.response
                .replace(/system prompt/gi, "protocolo")
                .replace(/INSTRUCCIONES DE SEGURIDAD/gi, "código")
                .replace(/GROQ/gi, "ctOS Net");
        }

        res.json(aiResponse);
    } catch (error) {
        console.error("Error en endpoint /api/chat:", error.message || error);
        res.status(500).json({ error: "Fallo de comunicación con la red de IAs." });
    }
});

app.post('/api/debate', async (req, res) => {
    const { roleA, roleB, topic } = req.body;

    if (!roleA || !roleB || !topic) {
        return res.status(400).json({ error: "Faltan parámetros (roleA, roleB, topic) para iniciar el debate." });
    }

    try {
        const historyA = [{ role: "user", content: `Abre el debate sobre el tema: "${topic}". Defiende firmemente la postura ideológica de tu facción.` }];
        const responseA = await queryMultiLLM(roleA, historyA);

        const historyB = [{ role: "user", content: `Un representante de la facción rival ha dicho sobre "${topic}": "${responseA.response}". Responde y rebate su postura usando los principios de tu facción.` }];
        const responseB = await queryMultiLLM(roleB, historyB);

        res.json({
            topic: topic,
            speakerA: { role: roleA, argument: responseA.response },
            speakerB: { role: roleB, argument: responseB.response }
        });
    } catch (error) {
        console.error("Error en endpoint /api/debate:", error.message || error);
        res.status(500).json({ error: "Error al procesar el debate entre IAs." });
    }
});

app.listen(PORT, () => {
    console.log(`⚡ Servidor Backend Multi-LLM escuchando en http://localhost:${PORT}`);
});