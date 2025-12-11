import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { webhookQueue } from '../queue';

const router = Router();

// Create package
router.post('/:id/package', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { branchOrCommit = 'main' } = req.body;
        const userId = req.user!.id;

        // Verify project ownership
        const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Create package record
        const result = await pool.query(
            `INSERT INTO packages (project_id, branch_or_commit, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
            [id, branchOrCommit]
        );

        const packageRecord = result.rows[0];

        // Enqueue packaging job
        await webhookQueue.add('generate-package', {
            packageId: packageRecord.id,
            projectId: id,
            branchOrCommit,
        });

        res.status(201).json({ package: packageRecord });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// Get package status
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT p.*, pr.name as project_name 
       FROM packages p
       JOIN projects pr ON p.project_id = pr.id
       WHERE p.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json({ package: result.rows[0] });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ error: 'Failed to fetch package' });
    }
});

// List project packages
router.get('/project/:projectId', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const result = await pool.query(
            `SELECT * FROM packages 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
            [projectId]
        );

        res.json({ packages: result.rows });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

export default router;
