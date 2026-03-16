import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create share link
router.post('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { permission, expires_in_days } = req.body;
        const token = uuidv4().replace(/-/g, '').substring(0, 20);

        let expiresAt = null;
        if (expires_in_days) {
            expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
        }

        const result = await query(
            `INSERT INTO share_links (project_id, token, permission, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.params.projectId, token, permission || 'read', expiresAt, req.user!.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create share link' });
    }
});

// Access shared documentation
router.get('/:token', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT sl.*, p.name as project_name, p.slug, p.description, p.base_url
       FROM share_links sl
       JOIN projects p ON p.id = sl.project_id
       WHERE sl.token = $1 AND (sl.expires_at IS NULL OR sl.expires_at > NOW())`,
            [req.params.token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Share link not found or expired' });
        }

        const link = result.rows[0];

        // Get project tree
        const apis = await query(
            `SELECT a.*, json_agg(
        json_build_object(
          'id', e.id, 'path', e.path, 'method', e.method, 'summary', e.summary
        ) ORDER BY e.sort_order
      ) FILTER (WHERE e.id IS NOT NULL) as endpoints
      FROM apis a
      LEFT JOIN endpoints e ON e.api_id = a.id
      WHERE a.project_id = $1
      GROUP BY a.id
      ORDER BY a.sort_order`,
            [link.project_id]
        );

        res.json({
            project: {
                name: link.project_name,
                slug: link.slug,
                description: link.description,
                base_url: link.base_url
            },
            permission: link.permission,
            apis: apis.rows
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get shared docs' });
    }
});

export default router;
