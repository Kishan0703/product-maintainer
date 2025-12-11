import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { LLMService } from '../services/llm';
import { EmbeddingsService } from '../services/embeddings';

const router = Router();
const llmService = new LLMService();
const embeddingsService = new EmbeddingsService();

// Ask question about repository
router.post('/:id/q', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { question } = req.body;
        const userId = req.user!.id;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Verify project ownership
        const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check cache
        const cached = await pool.query(
            `SELECT content, metadata FROM ai_summaries 
       WHERE project_id = $1 AND summary_type = 'qa' 
       AND metadata->>'question' = $2 
       ORDER BY created_at DESC LIMIT 1`,
            [id, question]
        );

        if (cached.rows.length > 0) {
            const cachedResponse = JSON.parse(cached.rows[0].content);
            return res.json({ ...cachedResponse, cached: true });
        }

        // Create embedding for question
        const questionEmbedding = await embeddingsService.createEmbedding(question);

        // pgvector k-NN search for top 5 similar chunks
        const results = await pool.query(
            `SELECT file_path, commit_sha, content, 
              1 - (embedding <=> $1::vector) as similarity
       FROM embeddings
       WHERE project_id = $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
            [`[${questionEmbedding.join(',')}]`, id]
        );

        if (results.rows.length === 0) {
            return res.json({
                answer: 'No code context available yet. Please push some code to the repository first.',
                sources: [],
                cached: false,
            });
        }

        // Build context from top results
        const context = results.rows.map(
            (r) => `File: ${r.file_path} (commit: ${r.commit_sha})\n${r.content}`
        );

        // Get LLM answer
        const answer = await llmService.answerQuestion(question, context);

        const response = {
            answer,
            sources: results.rows.map((r) => ({
                filePath: r.file_path,
                commitSha: r.commit_sha,
                content: r.content.substring(0, 500), // Truncate for response
                similarity: parseFloat(r.similarity),
            })),
            cached: false,
        };

        // Cache the result
        await pool.query(
            `INSERT INTO ai_summaries (project_id, summary_type, content, metadata)
       VALUES ($1, 'qa', $2, $3)`,
            [id, JSON.stringify(response), JSON.stringify({ question })]
        );

        res.json(response);
    } catch (error) {
        console.error('Error processing question:', error);
        res.status(500).json({ error: 'Failed to process question' });
    }
});

export default router;
