import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { GitHubService } from '../services/github';
import { generateToken } from '../utils/jwt';
import { encrypt } from '../utils/crypto';

const router = Router();

// Redirect to GitHub OAuth
router.get('/github', (_req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    const scope = 'read:user user:email repo';

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    res.redirect(githubAuthUrl);
});

// GitHub OAuth callback
router.get('/github/callback', async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        // Exchange code for access token
        const accessToken = await GitHubService.exchangeCodeForToken(code);

        // Get GitHub user profile
        const githubService = new GitHubService(accessToken);
        const githubUser = await githubService.getUserProfile();

        // Check if user exists
        let user = await pool.query('SELECT * FROM users WHERE github_id = $1', [
            githubUser.id.toString(),
        ]);

        if (user.rows.length === 0) {
            // Create new user
            const insertResult = await pool.query(
                `INSERT INTO users (email, name, github_id, github_username, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
                [
                    githubUser.email,
                    githubUser.name,
                    githubUser.id.toString(),
                    githubUser.login,
                    githubUser.avatar_url,
                ]
            );
            user = insertResult;
        } else {
            // Update existing user
            await pool.query(
                `UPDATE users 
         SET name = $1, github_username = $2, avatar_url = $3, updated_at = CURRENT_TIMESTAMP
         WHERE github_id = $4`,
                [githubUser.name, githubUser.login, githubUser.avatar_url, githubUser.id.toString()]
            );
        }

        const dbUser = user.rows[0];

        // Store encrypted OAuth token
        const encryptedToken = encrypt(accessToken);
        await pool.query(
            `INSERT INTO oauth_tokens (user_id, provider, access_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET access_token = $3, updated_at = CURRENT_TIMESTAMP`,
            [dbUser.id, 'github', encryptedToken]
        );

        // Generate JWT
        const token = generateToken({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            githubUsername: dbUser.github_username,
            avatarUrl: dbUser.avatar_url,
        });

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = await import('../utils/jwt');
    const user = verifyToken(token);

    if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
});

export default router;
