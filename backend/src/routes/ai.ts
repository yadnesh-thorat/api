import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

// Mock generation using Gemini or Groq
// Helper to generate using Gemini
async function generateWithGemini(apiKey: string, prompt: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
    const { type, method, path, summary, description, fieldNames, schemaContext, projectId, contentType = 'application/json' } = req.body;

    let dbSchema = null;
    if (projectId) {
        const projResult = await query('SELECT db_schema FROM projects WHERE id = $1', [projectId]);
        dbSchema = projResult.rows[0]?.db_schema;
    }

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
${description ? `Context/Description: ${description}` : ''}
Relevant Fields: ${fieldNames}

${dbSchema ? `PROJECT DATABASE SCHEMA (USE AS DATA CONTEXT):
${dbSchema}` : ''}

${schemaContext ? `FOLLOW THIS STRUCTURE/SCHEMA EXACTLY BUT POPULATE WITH REALISTIC DATA:
${JSON.stringify(schemaContext, null, 2)}` : ''}

Requirements:
1. Return ONLY the completed ${contentType} data.
2. If the Context/Description specifies a subset of fields (e.g. 'limit to...', 'only include...'), you MUST respect that and ignore other columns in the schema.
3. If the Context contains a list of column names, ensure EVERY requested column is included in the output.
4. If the Summary implies a list (e.g. "List", "Get all"), return an ARRAY of objects.
5. No explanation, no markdown code blocks (no \`\`\`).
6. Use realistic, high-quality data (avoid generic "string1", "123").
7. If a structure/schema was provided above (schemaContext), you MUST return data that fits that exact schema.
8. If provided, use the PROJECT DATABASE SCHEMA as reference for table/field names, but prioritize instructions in the Context/Description.
9. If it's a response, make it look like a professional production API response.`;

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

router.post('/generate-endpoint', authenticate, async (req: AuthRequest, res: Response) => {
    const { prompt: userPrompt, projectId } = req.body;

    let dbSchema = null;
    if (projectId) {
        const projResult = await query('SELECT db_schema FROM projects WHERE id = $1', [projectId]);
        dbSchema = projResult.rows[0]?.db_schema;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
        return res.status(400).json({ 
            error: 'AI API Keys not configured.' 
        });
    }

    const systemPrompt = `Act as an expert API Architect. Based on the user's prompt, design a complete REST API endpoint.
Return ONLY valid JSON with no markdown formatting.
JSON Structure:
{
    "path": "/api/v1/...",
    "method": "GET|POST|PUT|DELETE|PATCH",
    "summary": "Short title",
    "description": "Longer explanation with markdown support",
    "headers": [{"name": "Key", "value": "Value", "required": boolean}],
    "query_params": [{"name": "Key", "type": "string|number|boolean", "required": boolean, "description": "text"}],
    "path_params": [{"name": "Key", "type": "string|number", "description": "text"}],
    "request_body": { ...json schema mock... or null },
    "response_schema": { ...json schema mock... },
    "auth_type": "None|Bearer|API Key|Basic"
}

${dbSchema ? `PROJECT DATABASE SCHEMA (REFERENCE ONLY - use as table/field context):
${dbSchema}` : ''}

User's Request: ${userPrompt}
IMPORTANT: If the user provides specific field details or requirements in their request or description, prioritise those over the global project database schema.`;

    let resultText = '';
    let success = false;
    let errors: string[] = [];

    if (groqKey) {
        try {
            resultText = await generateWithGroq(groqKey, systemPrompt);
            success = true;
        } catch (e: any) {
            errors.push(e.message);
        }
    }

    if (!success && geminiKey) {
        try {
            resultText = await generateWithGemini(geminiKey, systemPrompt);
            success = true;
        } catch (e: any) {
            errors.push(e.message);
        }
    }

    if (!success) return res.status(500).json({ error: 'AI failed', details: errors });

    try {
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const blueprint = JSON.parse(resultText);
        res.json({ blueprint });
    } catch (e) {
        res.status(500).json({ error: 'AI returned invalid JSON blueprints', raw: resultText });
    }
});

export default router;
