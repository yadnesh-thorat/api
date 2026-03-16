import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Mock API endpoint
router.all('/:projectSlug/*', async (req, res) => {
    try {
        // Get project by slug
        const project = await query('SELECT id FROM projects WHERE slug = $1', [req.params.projectSlug]);
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Mock project not found' });
        }

        const mockPath = '/' + (req.params as any)[0];
        const method = req.method.toUpperCase();

        // Find matching endpoint
        const endpoint = await query(
            `SELECT e.id, e.response_schema FROM endpoints e
       WHERE e.project_id = $1 AND e.path = $2 AND e.method = $3`,
            [project.rows[0].id, mockPath, method]
        );

        if (endpoint.rows.length === 0) {
            return res.status(404).json({ error: `No mock found for ${method} ${mockPath}` });
        }

        // Get active mock config
        const mockConfig = await query(
            `SELECT * FROM mock_configs WHERE endpoint_id = $1 AND is_active = true LIMIT 1`,
            [endpoint.rows[0].id]
        );

        if (mockConfig.rows.length > 0) {
            const config = mockConfig.rows[0];

            // Add delay if configured
            if (config.delay_ms > 0) {
                await new Promise(resolve => setTimeout(resolve, config.delay_ms));
            }

            return res.status(config.status_code).json(config.response_body);
        }

        // Generate mock from response schema
        if (endpoint.rows[0].response_schema) {
            return res.json(generateMockFromSchema(endpoint.rows[0].response_schema));
        }

        res.json({ message: 'Mock response', method, path: mockPath });
    } catch (error: any) {
        console.error('Mock error:', error);
        res.status(500).json({ error: 'Mock server error' });
    }
});

function generateMockFromSchema(schema: any): any {
    if (!schema) return {};

    if (schema.type === 'object') {
        const obj: any = {};
        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties) as any[]) {
                obj[key] = generateMockFromSchema(prop);
            }
        }
        return obj;
    }

    if (schema.type === 'array') {
        return [generateMockFromSchema(schema.items)];
    }

    switch (schema.type) {
        case 'string':
            if (schema.format === 'email') return 'user@example.com';
            if (schema.format === 'date-time') return new Date().toISOString();
            return 'mock-string';
        case 'number':
        case 'integer':
            return schema.minimum || 1;
        case 'boolean':
            return true;
        default:
            return null;
    }
}

export default router;
