import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List endpoints for an API group
router.get('/api/:apiId', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT e.*, u.name as created_by_name
       FROM endpoints e
       LEFT JOIN users u ON u.id = e.created_by
       WHERE e.api_id = $1
       ORDER BY e.sort_order, e.path`,
            [req.params.apiId]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to list endpoints' });
    }
});

// Get single endpoint
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT e.*, u.name as created_by_name,
        (SELECT json_agg(json_build_object(
          'id', mc.id, 'status_code', mc.status_code, 'response_body', mc.response_body,
          'delay_ms', mc.delay_ms, 'is_active', mc.is_active
        )) FROM mock_configs mc WHERE mc.endpoint_id = e.id) as mock_configs
       FROM endpoints e
       LEFT JOIN users u ON u.id = e.created_by
       WHERE e.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get endpoint' });
    }
});

// Create endpoint
router.post('/api/:apiId', authenticate, async (req: AuthRequest, res) => {
    try {
        const {
            path, method, summary, description, request_body, response_schema,
            headers, query_params, path_params, auth_type, status_codes, tags, documentation
        } = req.body;

        if (!path || !method) {
            return res.status(400).json({ error: 'Path and method are required' });
        }

        // Get project_id from api
        const api = await query('SELECT project_id FROM apis WHERE id = $1', [req.params.apiId]);
        if (api.rows.length === 0) {
            return res.status(404).json({ error: 'API group not found' });
        }

        const maxOrder = await query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM endpoints WHERE api_id = $1',
            [req.params.apiId]
        );

        const result = await query(
            `INSERT INTO endpoints (api_id, project_id, path, method, summary, description, 
       request_body, response_schema, headers, query_params, path_params,
       auth_type, status_codes, tags, documentation, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
            [
                req.params.apiId, api.rows[0].project_id, path, method.toUpperCase(),
                summary || '', description || '',
                request_body ? JSON.stringify(request_body) : null,
                response_schema ? JSON.stringify(response_schema) : null,
                JSON.stringify(headers || []),
                JSON.stringify(query_params || []),
                JSON.stringify(path_params || []),
                auth_type || null,
                JSON.stringify(status_codes || []),
                tags || [],
                documentation || '',
                maxOrder.rows[0].next_order,
                req.user!.id
            ]
        );

        // Auto-create version 1
        await query(
            `INSERT INTO versions (endpoint_id, project_id, version_number, snapshot, change_summary, created_by)
       VALUES ($1, $2, 1, $3, 'Initial version', $4)`,
            [result.rows[0].id, api.rows[0].project_id, JSON.stringify(result.rows[0]), req.user!.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create endpoint error:', error);
        res.status(500).json({ error: 'Failed to create endpoint' });
    }
});

// Update endpoint
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const {
            path, method, summary, description, request_body, response_schema,
            headers, query_params, path_params, auth_type, status_codes, tags,
            documentation, is_deprecated
        } = req.body;

        const result = await query(
            `UPDATE endpoints SET
       path = COALESCE($1, path), method = COALESCE($2, method),
       summary = COALESCE($3, summary), description = COALESCE($4, description),
       request_body = COALESCE($5, request_body), response_schema = COALESCE($6, response_schema),
       headers = COALESCE($7, headers), query_params = COALESCE($8, query_params),
       path_params = COALESCE($9, path_params), auth_type = COALESCE($10, auth_type),
       status_codes = COALESCE($11, status_codes), tags = COALESCE($12, tags),
       documentation = COALESCE($13, documentation), is_deprecated = COALESCE($14, is_deprecated)
       WHERE id = $15 RETURNING *`,
            [
                path, method?.toUpperCase(),
                summary, description,
                request_body ? JSON.stringify(request_body) : null,
                response_schema ? JSON.stringify(response_schema) : null,
                headers ? JSON.stringify(headers) : null,
                query_params ? JSON.stringify(query_params) : null,
                path_params ? JSON.stringify(path_params) : null,
                auth_type,
                status_codes ? JSON.stringify(status_codes) : null,
                tags,
                documentation, is_deprecated,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }

        // Create new version
        const versionCount = await query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM versions WHERE endpoint_id = $1',
            [req.params.id]
        );

        await query(
            `INSERT INTO versions (endpoint_id, project_id, version_number, snapshot, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.params.id, result.rows[0].project_id,
                versionCount.rows[0].next,
                JSON.stringify(result.rows[0]),
                req.body.change_summary || 'Updated endpoint',
                req.user!.id
            ]
        );

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update endpoint error:', error);
        res.status(500).json({ error: 'Failed to update endpoint' });
    }
});

// Delete endpoint
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query('DELETE FROM endpoints WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }
        res.json({ message: 'Endpoint deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete endpoint' });
    }
});

export default router;
