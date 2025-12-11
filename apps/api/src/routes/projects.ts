import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { GitHubService } from '../services/github';
import { decrypt } from '../utils/crypto';

const router = Router();

// Get user's projects
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const result = await pool.query(
            `SELECT id, name, description, user_id, team_id, repo_full_name, repo_url, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC`,
            [userId]
        );

        res.json({ projects: result.rows });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Create a new project with repository
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name, description, repoFullName, repoUrl } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const result = await pool.query(
            `INSERT INTO projects (name, description, user_id, repo_full_name, repo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name, description || null, userId, repoFullName || null, repoUrl || null]
        );

        res.status(201).json({ project: result.rows[0] });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get user's GitHub repositories
router.get('/repos', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        // Get user's GitHub access token
        const tokenResult = await pool.query(
            'SELECT access_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
            [userId, 'github']
        );

        if (tokenResult.rows.length === 0) {
            return res.status(404).json({ error: 'GitHub token not found' });
        }

        const encryptedToken = tokenResult.rows[0].access_token;
        const accessToken = decrypt(encryptedToken);

        // Fetch repositories from GitHub
        const githubService = new GitHubService(accessToken);
        const repos = await githubService.getUserRepositories();

        res.json({ repositories: repos });
    } catch (error) {
        console.error('Error fetching repositories:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

export default router;
