import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get version history for an endpoint
router.get('/endpoint/:endpointId', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT v.*, u.name as created_by_name
       FROM versions v
       JOIN users u ON u.id = v.created_by
       WHERE v.endpoint_id = $1
       ORDER BY v.version_number DESC`,
            [req.params.endpointId]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get versions' });
    }
});

// Get specific version
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT v.*, u.name as created_by_name
       FROM versions v
       JOIN users u ON u.id = v.created_by
       WHERE v.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Version not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get version' });
    }
});

// Restore a version
router.post('/:id/restore', authenticate, async (req: AuthRequest, res) => {
    try {
        const version = await query('SELECT * FROM versions WHERE id = $1', [req.params.id]);

        if (version.rows.length === 0) {
            return res.status(404).json({ error: 'Version not found' });
        }

        const snapshot = version.rows[0].snapshot;
        const endpointId = version.rows[0].endpoint_id;

        // Update endpoint with snapshot data
        await query(
            `UPDATE endpoints SET
       path = $1, method = $2, summary = $3, description = $4,
       request_body = $5, response_schema = $6, headers = $7,
       query_params = $8, path_params = $9, auth_type = $10,
       status_codes = $11, tags = $12, documentation = $13
       WHERE id = $14`,
            [
                snapshot.path, snapshot.method, snapshot.summary, snapshot.description,
                JSON.stringify(snapshot.request_body), JSON.stringify(snapshot.response_schema),
                JSON.stringify(snapshot.headers), JSON.stringify(snapshot.query_params),
                JSON.stringify(snapshot.path_params), snapshot.auth_type,
                JSON.stringify(snapshot.status_codes), snapshot.tags, snapshot.documentation,
                endpointId
            ]
        );

        // Create new version for the restore
        const maxVersion = await query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM versions WHERE endpoint_id = $1',
            [endpointId]
        );

        await query(
            `INSERT INTO versions (endpoint_id, project_id, version_number, snapshot, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                endpointId, version.rows[0].project_id,
                maxVersion.rows[0].next,
                snapshot,
                `Restored to version ${version.rows[0].version_number}`,
                req.user!.id
            ]
        );

        res.json({ message: 'Version restored successfully' });
    } catch (error: any) {
        console.error('Restore version error:', error);
        res.status(500).json({ error: 'Failed to restore version' });
    }
});

// Compare two versions
router.get('/compare/:id1/:id2', authenticate, async (req: AuthRequest, res) => {
    try {
        const v1 = await query('SELECT * FROM versions WHERE id = $1', [req.params.id1]);
        const v2 = await query('SELECT * FROM versions WHERE id = $1', [req.params.id2]);

        if (v1.rows.length === 0 || v2.rows.length === 0) {
            return res.status(404).json({ error: 'Version(s) not found' });
        }

        res.json({
            version1: v1.rows[0],
            version2: v2.rows[0]
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to compare versions' });
    }
});

export default router;
