import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { verifyWebhookSignature } from '../utils/crypto';
import { enqueueWebhookJob } from '../queue';

const router = Router();

router.post('/github', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string;
        const event = req.headers['x-github-event'] as string;
        const payload = req.body;

        if (!signature) {
            return res.status(401).json({ error: 'Missing signature' });
        }

        // Verify webhook signature
        const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
        const payloadString = JSON.stringify(payload);
        const isValid = verifyWebhookSignature(payloadString, signature, secret);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Handle push and pull_request events
        if (event === 'push' || event === 'pull_request') {
            const repoFullName = payload.repository?.full_name;

            if (!repoFullName) {
                return res.status(400).json({ error: 'Missing repository information' });
            }

            // Find project by repo_full_name
            const projectResult = await pool.query(
                'SELECT id, user_id FROM projects WHERE repo_full_name = $1',
                [repoFullName]
            );

            if (projectResult.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found for this repository' });
            }

            const project = projectResult.rows[0];
            const actor = payload.sender?.login || 'unknown';

            let action = event;
            if (event === 'pull_request') {
                action = `pull_request:${payload.action}`;
            }

            // Insert activity log
            const activityResult = await pool.query(
                `INSERT INTO activity_logs (project_id, user_id, action, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [
                    project.id,
                    project.user_id,
                    action,
                    {
                        event,
                        actor,
                        repo: repoFullName,
                        ref: payload.ref,
                        commits: payload.commits?.length || 0,
                        pull_request: payload.pull_request
                            ? {
                                number: payload.pull_request.number,
                                title: payload.pull_request.title,
                                state: payload.pull_request.state,
                            }
                            : undefined,
                    },
                ]
            );

            // Enqueue job for processing
            await enqueueWebhookJob({
                eventType: event,
                action,
                projectId: project.id,
                userId: project.user_id,
                payload,
            });

            console.log(`Webhook processed: ${event} for ${repoFullName}`);
            res.json({
                success: true,
                activityId: activityResult.rows[0].id,
                message: 'Webhook received and queued for processing'
            });
        } else {
            // Acknowledge other events but don't process
            res.json({ success: true, message: 'Event acknowledged but not processed' });
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

export default router;
