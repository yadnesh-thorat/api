import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Test API endpoint (proxy)
router.post('/test', authenticate, async (req: AuthRequest, res) => {
    try {
        const { url, method, headers: reqHeaders, body } = req.body;

        if (!url || !method) {
            return res.status(400).json({ error: 'URL and method are required' });
        }

        const startTime = Date.now();

        const fetchOptions: RequestInit = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                ...reqHeaders
            },
        };

        if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        const duration = Date.now() - startTime;

        let responseBody;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            responseBody = await response.json();
        } else {
            responseBody = await response.text();
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        res.json({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
            duration,
            size: JSON.stringify(responseBody).length
        });
    } catch (error: any) {
        res.json({
            status: 0,
            statusText: 'Error',
            headers: {},
            body: { error: error.message },
            duration: 0,
            size: 0
        });
    }
});

export default router;
