import fetch from 'node-fetch';
import { AI_SYSTEM_PROMPTS, ROLE_PROVIDER_MAP } from './prompts.js';

export async function queryMultiLLM(role, history) {
    const config = ROLE_PROVIDER_MAP[role] || ROLE_PROVIDER_MAP.security;
    const systemPrompt = AI_SYSTEM_PROMPTS[role] || AI_SYSTEM_PROMPTS.security;

    const cleanHistory = history.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content)
    }));

    switch (config.provider) {
        case 'groq':
            return callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", process.env.GROQ_API_KEY, config.model, systemPrompt, cleanHistory);

        case 'openai':
            return callOpenAICompatible("https://api.openai.com/v1/chat/completions", process.env.OPENAI_API_KEY, config.model, systemPrompt, cleanHistory);

        case 'gemini':
            return callGemini(process.env.GEMINI_API_KEY, config.model, systemPrompt, cleanHistory);

        default:
            throw new Error(`Proveedor no configurado: ${config.provider}`);
    }
}

// Adaptador para Groq y OpenAI (Comparten estándar)
async function callOpenAICompatible(url, apiKey, model, systemPrompt, history) {
    if (!apiKey) throw new Error(`Falta la API Key para el servicio en ${url}`);

    const messages = [{ role: "system", content: systemPrompt }, ...history];
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.8,
            response_format: { type: "json_object" }
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return JSON.parse(data.choices[0].message.content);
}

// Adaptador para Google Gemini
async function callGemini(apiKey, model, systemPrompt, history) {
    if (!apiKey) throw new Error("Falta GEMINI_API_KEY en el archivo .env");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
    }));

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: contents,
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return JSON.parse(data.candidates[0].content.parts[0].text);
}