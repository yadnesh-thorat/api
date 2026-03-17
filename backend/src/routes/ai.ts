import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

// Mock generation using Gemini or Groq
// Helper to generate using Gemini
async function generateWithGemini(apiKey: string, prompt: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    
    if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
    
    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content');
    return text;
}

// Helper to generate using Groq
async function generateWithGroq(apiKey: string, prompt: string) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned no content');
    return text;
}

router.post('/generate-mock', authenticate, async (req: AuthRequest, res: Response) => {
    const { type, method, path, summary, fieldNames, requestBody, contentType = 'application/json' } = req.body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
        return res.status(400).json({ 
            error: 'AI API Keys not configured. Please add GEMINI_API_KEY or GROQ_API_KEY to your .env file.' 
        });
    }

    const prompt = `Generate a realistic ${contentType} ${type} sample for an API endpoint.
Endpoint: ${method} ${path}
Summary: ${summary}
Relevant Fields: ${fieldNames}
${requestBody ? `Based on Request Body: ${JSON.stringify(requestBody)}` : ''}

Requirements:
1. Return ONLY the content in ${contentType} format.
2. No explanation, no markdown formatting (no \`\`\`).
3. Use realistic data.
4. If it's a response schema, make it look like a standard successful API response.`;

    let resultText = '';
    let success = false;
    let errors: string[] = [];

    // 1. Try Groq (CONFIRMED WORKING)
    if (groqKey) {
        try {
            console.log('Attempting mock generation with Groq...');
            resultText = await generateWithGroq(groqKey, prompt);
            success = true;
        } catch (e: any) {
            console.error('Groq failed:', e.message);
            errors.push(`Groq: ${e.message}`);
        }
    }

    // 2. Try Gemini (FALLBACK)
    if (!success && geminiKey) {
        try {
            console.log('Attempting mock generation with Gemini (fallback)...');
            resultText = await generateWithGemini(geminiKey, prompt);
            success = true;
        } catch (e: any) {
            console.error('Gemini failed:', e.message);
            errors.push(`Gemini: ${e.message}`);
        }
    }

    if (!success) {
        return res.status(500).json({ 
            error: 'All AI providers failed to generate mock data.',
            details: errors
        });
    }

    // Clean up the response
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Only parse if JSON
    if (contentType.includes('json')) {
        try {
            const mock = JSON.parse(resultText);
            res.json({ mock });
        } catch (parseError) {
            console.error('Parse error:', resultText);
            res.status(500).json({ 
                error: 'AI returned invalid JSON formatting.',
                rawResponse: resultText.substring(0, 200)
            });
        }
    } else {
        // Return raw for XML/Text
        res.json({ mock: resultText });
    }
});

export default router;
