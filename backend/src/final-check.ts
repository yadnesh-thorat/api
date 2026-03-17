import dotenv from 'dotenv';
dotenv.config();

async function checkGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.log('Gemini: MISSING KEY'); return; }
    
    try {
        const flashModel = 'models/gemini-2.0-flash';
        console.log('Testing with model:', flashModel);
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${flashModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        const testData: any = await testRes.json();
        if (testData.error) {
            console.log('Gemini Call Error:', testData.error.message);
        } else {
            console.log('Gemini Call: SUCCESS');
        }
    } catch (e: any) {
        console.log('Gemini Request Failed:', e.message);
    }
}

async function checkGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) { console.log('Groq: MISSING KEY'); return; }
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: "hi" }] })
        });
        const data: any = await response.json();
        if (data.error) { console.log('Groq Error:', data.error.message); }
        else { console.log('Groq: SUCCESS'); }
    } catch (e: any) { console.log('Groq Request Failed:', e.message); }
}

async function run() {
    await checkGroq();
    console.log('-------------------');
    await checkGemini();
}

run();
