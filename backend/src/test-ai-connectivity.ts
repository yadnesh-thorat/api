import dotenv from 'dotenv';
import path from 'path';

// Force load env from parent if needed, but normally should be in current dir
dotenv.config();

async function testGemini() {
    process.stdout.write('Gemini: ');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.log('MISSING KEY'); return; }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data: any = await response.json();
        if (data.models) {
            const hasFlash = data.models.some((m: any) => m.name.includes('gemini-1.5-flash'));
            if (hasFlash) { console.log('OK (1.5-flash found)'); }
            else { console.log('ERR Flash not found. Available: ' + data.models.slice(0, 3).map((m:any)=>m.name).join(', ')); }
        } else if (data.error) {
            console.log('ERR ' + data.error.code + ' ' + data.error.status);
        } else {
            console.log('Unknown Response');
        }
    } catch (e: any) { console.log('FAIL ' + e.message); }
}

async function testGroq() {
    process.stdout.write('Groq: ');
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) { console.log('MISSING KEY'); return; }
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: "hi" }] })
        });
        const data: any = await response.json();
        if (data.error) { console.log('ERR ' + data.error.code); }
        else { console.log('OK'); }
    } catch (e: any) { console.log('FAIL ' + e.message); }
}

async function runTests() {
    console.log('Environment Check:');
    console.log('CWD:', process.cwd());
    console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
    console.log('');
    
    await testGemini();
    await testGroq();
}

runTests();
