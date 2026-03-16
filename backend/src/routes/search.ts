import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Search APIs
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { q, method, project_id, tag } = req.query;

        if (!q && !method && !tag) {
            return res.status(400).json({ error: 'Search query required' });
        }

        let sql = `
      SELECT e.*, a.name as api_name, p.name as project_name, p.slug as project_slug
      FROM endpoints e
      JOIN apis a ON a.id = e.api_id
      JOIN projects p ON p.id = e.project_id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      WHERE 1=1
    `;
        const params: any[] = [req.user!.id];
        let paramIndex = 2;

        if (q) {
            sql += ` AND (
        e.path ILIKE $${paramIndex} OR 
        e.summary ILIKE $${paramIndex} OR 
        e.description ILIKE $${paramIndex} OR
        a.name ILIKE $${paramIndex}
      )`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        if (method) {
            sql += ` AND e.method = $${paramIndex}`;
            params.push((method as string).toUpperCase());
            paramIndex++;
        }

        if (project_id) {
            sql += ` AND e.project_id = $${paramIndex}`;
            params.push(project_id);
            paramIndex++;
        }

        if (tag) {
            sql += ` AND $${paramIndex} = ANY(e.tags)`;
            params.push(tag);
            paramIndex++;
        }

        sql += ' ORDER BY e.path LIMIT 50';

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;
