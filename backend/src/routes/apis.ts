import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List APIs in a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT a.*, 
        (SELECT COUNT(*) FROM endpoints WHERE api_id = a.id) as endpoint_count
       FROM apis a
       WHERE a.project_id = $1
       ORDER BY a.sort_order`,
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to list APIs' });
    }
});

// Create API group
router.post('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, tag } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'API name is required' });
        }

        const maxOrder = await query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM apis WHERE project_id = $1',
            [req.params.projectId]
        );

        const result = await query(
            `INSERT INTO apis (project_id, name, description, tag, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.params.projectId, name, description || '', tag || name.toLowerCase(), maxOrder.rows[0].next_order]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create API' });
    }
});

// Update API group
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, tag, sort_order } = req.body;

        const result = await query(
            `UPDATE apis SET name = COALESCE($1, name), description = COALESCE($2, description),
       tag = COALESCE($3, tag), sort_order = COALESCE($4, sort_order)
       WHERE id = $5 RETURNING *`,
            [name, description, tag, sort_order, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update API' });
    }
});

// Delete API group
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query('DELETE FROM apis WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        res.json({ message: 'API deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete API' });
    }
});

export default router;
