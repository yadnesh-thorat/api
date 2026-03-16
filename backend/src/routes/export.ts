import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import yaml from 'js-yaml';

const router = Router();

// Export project as OpenAPI spec
router.get('/:projectId/openapi', authenticate, async (req: AuthRequest, res) => {
    try {
        const project = await query('SELECT * FROM projects WHERE id = $1', [req.params.projectId]);
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const p = project.rows[0];
        const endpoints = await query(
            `SELECT e.*, a.name as api_name, a.tag as api_tag
       FROM endpoints e
       JOIN apis a ON a.id = e.api_id
       WHERE e.project_id = $1
       ORDER BY a.sort_order, e.sort_order`,
            [req.params.projectId]
        );

        // Build OpenAPI spec
        const spec: any = {
            openapi: p.openapi_version || '3.1.0',
            info: {
                title: p.name,
                description: p.description || '',
                version: '1.0.0'
            },
            servers: p.base_url ? [{ url: p.base_url }] : [],
            paths: {},
            tags: []
        };

        const tagSet = new Set<string>();

        for (const ep of endpoints.rows) {
            if (!spec.paths[ep.path]) {
                spec.paths[ep.path] = {};
            }

            const operation: any = {
                summary: ep.summary,
                description: ep.description,
                tags: ep.tags || [ep.api_tag],
                parameters: [],
                responses: {}
            };

            // Add tag
            if (ep.api_tag && !tagSet.has(ep.api_tag)) {
                tagSet.add(ep.api_tag);
                spec.tags.push({ name: ep.api_tag, description: ep.api_name });
            }

            // Headers
            if (ep.headers) {
                for (const h of ep.headers) {
                    operation.parameters.push({
                        name: h.name,
                        in: 'header',
                        required: h.required || false,
                        schema: { type: h.type || 'string' }
                    });
                }
            }

            // Query params
            if (ep.query_params) {
                for (const q of ep.query_params) {
                    operation.parameters.push({
                        name: q.name,
                        in: 'query',
                        required: q.required || false,
                        schema: { type: q.type || 'string', default: q.default }
                    });
                }
            }

            // Path params
            if (ep.path_params) {
                for (const pp of ep.path_params) {
                    operation.parameters.push({
                        name: pp.name,
                        in: 'path',
                        required: true,
                        schema: { type: pp.type || 'string' }
                    });
                }
            }

            // Request body
            if (ep.request_body && !['GET', 'HEAD', 'DELETE'].includes(ep.method)) {
                operation.requestBody = {
                    required: true,
                    content: {
                        'application/json': {
                            schema: ep.request_body
                        }
                    }
                };
            }

            // Responses
            if (ep.status_codes && ep.status_codes.length > 0) {
                for (const sc of ep.status_codes) {
                    operation.responses[sc.code.toString()] = {
                        description: sc.description || ''
                    };
                }
            }

            if (ep.response_schema) {
                const successCode = ep.method === 'POST' ? '201' : '200';
                if (!operation.responses[successCode]) {
                    operation.responses[successCode] = { description: 'Success' };
                }
                operation.responses[successCode].content = {
                    'application/json': {
                        schema: ep.response_schema
                    }
                };
            }

            if (Object.keys(operation.responses).length === 0) {
                operation.responses['200'] = { description: 'Success' };
            }

            // Security
            if (ep.auth_type) {
                operation.security = [{ [ep.auth_type]: [] }];
            }

            spec.paths[ep.path][ep.method.toLowerCase()] = operation;
        }

        const format = req.query.format || 'json';
        if (format === 'yaml') {
            res.set('Content-Type', 'text/yaml');
            res.send(yaml.dump(spec, { lineWidth: 120 }));
        } else {
            res.json(spec);
        }
    } catch (error: any) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export OpenAPI spec' });
    }
});

// Import OpenAPI spec
router.post('/:projectId/import', authenticate, async (req: AuthRequest, res) => {
    try {
        let spec = req.body.spec;

        // Parse YAML if string
        if (typeof spec === 'string') {
            try {
                spec = JSON.parse(spec);
            } catch {
                spec = yaml.load(spec) as any;
            }
        }

        if (!spec || !spec.paths) {
            return res.status(400).json({ error: 'Invalid OpenAPI specification' });
        }

        const projectId = req.params.projectId;
        let importedCount = 0;

        // Group endpoints by tag
        const tagGroups: Record<string, any[]> = {};

        for (const [path, methods] of Object.entries(spec.paths) as any[]) {
            for (const [method, operation] of Object.entries(methods) as any[]) {
                const tag = operation.tags?.[0] || 'default';
                if (!tagGroups[tag]) tagGroups[tag] = [];
                tagGroups[tag].push({ path, method: method.toUpperCase(), ...operation });
            }
        }

        // Create API groups and endpoints
        for (const [tag, endpoints] of Object.entries(tagGroups)) {
            const apiResult = await query(
                `INSERT INTO apis (project_id, name, tag, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
                [projectId, tag.charAt(0).toUpperCase() + tag.slice(1), tag, '']
            );

            let apiId = apiResult.rows[0]?.id;
            if (!apiId) {
                const existing = await query('SELECT id FROM apis WHERE project_id = $1 AND tag = $2', [projectId, tag]);
                apiId = existing.rows[0]?.id;
            }

            if (apiId) {
                for (const ep of endpoints) {
                    await query(
                        `INSERT INTO endpoints (api_id, project_id, path, method, summary, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [apiId, projectId, ep.path, ep.method, ep.summary || '', ep.description || '', req.user!.id]
                    );
                    importedCount++;
                }
            }
        }

        res.json({ message: `Imported ${importedCount} endpoints`, count: importedCount });
    } catch (error: any) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import specification' });
    }
});

// Export as Postman collection
router.get('/:projectId/postman', authenticate, async (req: AuthRequest, res) => {
    try {
        const project = await query('SELECT * FROM projects WHERE id = $1', [req.params.projectId]);
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const p = project.rows[0];
        const apis = await query(
            `SELECT a.*, json_agg(
        json_build_object(
          'path', e.path, 'method', e.method, 'summary', e.summary,
          'headers', e.headers, 'request_body', e.request_body, 'query_params', e.query_params
        ) ORDER BY e.sort_order
      ) FILTER (WHERE e.id IS NOT NULL) as endpoints
      FROM apis a
      LEFT JOIN endpoints e ON e.api_id = a.id
      WHERE a.project_id = $1
      GROUP BY a.id
      ORDER BY a.sort_order`,
            [req.params.projectId]
        );

        const collection = {
            info: {
                name: p.name,
                description: p.description,
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: apis.rows.map((api: any) => ({
                name: api.name,
                item: (api.endpoints || []).map((ep: any) => ({
                    name: `${ep.method} ${ep.path}`,
                    request: {
                        method: ep.method,
                        url: `${p.base_url || ''}${ep.path}`,
                        header: (ep.headers || []).map((h: any) => ({
                            key: h.name,
                            value: h.value || '',
                            type: 'text'
                        })),
                        body: ep.request_body ? {
                            mode: 'raw',
                            raw: JSON.stringify(ep.request_body, null, 2),
                            options: { raw: { language: 'json' } }
                        } : undefined
                    }
                }))
            }))
        };

        res.json(collection);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to export Postman collection' });
    }
});

export default router;
