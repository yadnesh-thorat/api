import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List user's projects
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(`
      SELECT p.*, pm.role as member_role,
        (SELECT COUNT(*) FROM apis WHERE project_id = p.id) as api_count,
        (SELECT COUNT(*) FROM endpoints WHERE project_id = p.id) as endpoint_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = $1
      ORDER BY p.updated_at DESC
    `, [req.user!.id]);

        res.json(result.rows);
    } catch (error: any) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

// Create project
router.post('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, base_url } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check slug uniqueness
        const existing = await query('SELECT id FROM projects WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'A project with this name already exists' });
        }

        const result = await query(
            `INSERT INTO projects (name, slug, description, base_url, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, slug, description || '', base_url || '', req.user!.id]
        );

        // Add owner as project member
        await query(
            `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`,
            [result.rows[0].id, req.user!.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get project by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM apis WHERE project_id = p.id) as api_count,
        (SELECT COUNT(*) FROM endpoints WHERE project_id = p.id) as endpoint_count,
        (SELECT json_agg(json_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'role', pm.role, 'avatar_url', u.avatar_url
        )) FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = p.id) as members
      FROM projects p
      WHERE p.id = $1
    `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

// Update project
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, base_url, is_public } = req.body;

        const result = await query(
            `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description),
       base_url = COALESCE($3, base_url), is_public = COALESCE($4, is_public)
       WHERE id = $5 RETURNING *`,
            [name, description, base_url, is_public, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete project
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id',
            [req.params.id, req.user!.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Add member to project
router.post('/:id/members', authenticate, async (req: AuthRequest, res) => {
    try {
        const { email, role } = req.body;

        const user = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await query(
            `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
            [req.params.id, user.rows[0].id, role || 'editor']
        );

        res.json({ message: 'Member added successfully' });
    } catch (error: any) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Get project tree (APIs + endpoints)
router.get('/:id/tree', authenticate, async (req: AuthRequest, res) => {
    try {
        const apis = await query(
            `SELECT a.*, json_agg(
        json_build_object(
          'id', e.id, 'path', e.path, 'method', e.method, 'summary', e.summary,
          'is_deprecated', e.is_deprecated, 'sort_order', e.sort_order
        ) ORDER BY e.sort_order
      ) FILTER (WHERE e.id IS NOT NULL) as endpoints
      FROM apis a
      LEFT JOIN endpoints e ON e.api_id = a.id
      WHERE a.project_id = $1
      GROUP BY a.id
      ORDER BY a.sort_order`,
            [req.params.id]
        );

        res.json(apis.rows);
    } catch (error: any) {
        console.error('Get tree error:', error);
        res.status(500).json({ error: 'Failed to get project tree' });
    }
});

export default router;
