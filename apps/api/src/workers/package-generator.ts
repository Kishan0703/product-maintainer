import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import simpleGit from 'simple-git';
import archiver from 'archiver';
import { LLMService } from '../services/llm';
import { StorageService } from '../services/storage';
import { EmbeddingsService } from '../services/embeddings';
import { pool } from '../db';
import { GitHubService } from '../services/github';
import { decrypt } from '../utils/crypto';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const llmService = new LLMService();
const storageService = new StorageService();
const embeddingsService = new EmbeddingsService();

// Helper to create zip from directory
function createZip(dir: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const buffers: Buffer[] = [];

        archive.on('data', (chunk: Buffer) => buffers.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(buffers)));
        archive.on('error', reject);

        archive.directory(dir, false);
        archive.finalize();
    });
}

// Package generator worker
const packageWorker = new Worker(
    'webhook-processing',
    async (job: Job) => {
        if (job.name === 'generate-package') {
            const { packageId, projectId, branchOrCommit } = job.data;

            try {
                console.log(`Starting package generation for ${packageId}`);

                // Update status
                await pool.query('UPDATE packages SET status = $1 WHERE id = $2', [
                    'processing',
                    packageId,
                ]);

                // Get project and OAuth token
                const projectResult = await pool.query(
                    `SELECT p.*, u.id as user_id 
           FROM projects p 
           JOIN users u ON p.user_id = u.id 
           WHERE p.id = $1`,
                    [projectId]
                );

                if (projectResult.rows.length === 0) {
                    throw new Error('Project not found');
                }

                const project = projectResult.rows[0];

                if (!project.repo_full_name) {
                    throw new Error('Project does not have a connected repository');
                }

                // Get GitHub token
                const tokenResult = await pool.query(
                    'SELECT access_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
                    [project.user_id, 'github']
                );

                if (tokenResult.rows.length === 0) {
                    throw new Error('GitHub token not found');
                }

                const accessToken = decrypt(tokenResult.rows[0].access_token);

                // Clone repository
                const tmpDir = `/tmp/repo-${packageId}`;
                const git = simpleGit();

                console.log(`Cloning ${project.repo_url} to ${tmpDir}`);
                await git.clone(project.repo_url, tmpDir, [
                    '--depth',
                    '1',
                    '--branch',
                    branchOrCommit,
                ]);

                // Detect files and package.json
                const files = fs.readdirSync(tmpDir).filter((f) => !f.startsWith('.'));
                let packageJson;

                if (fs.existsSync(path.join(tmpDir, 'package.json'))) {
                    packageJson = JSON.parse(
                        fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8')
                    );
                }

                // Generate README
                console.log('Generating README...');
                const readme = await llmService.generateREADME({
                    name: project.name,
                    description: project.description,
                    files,
                    packageJson,
                });

                // Generate pitch
                console.log('Generating pitch...');
                const pitch = await llmService.generatePitch({
                    name: project.name,
                    description: project.description,
                    readme,
                });

                // Write generated files
                fs.writeFileSync(path.join(tmpDir, 'README.md'), readme);
                fs.writeFileSync(path.join(tmpDir, 'PITCH.md'), pitch);

                // Create zip
                console.log('Creating zip archive...');
                const zipBuffer = await createZip(tmpDir);

                // Upload to S3
                console.log('Uploading to S3...');
                const packageUrl = await storageService.uploadPackage(
                    `packages/${packageId}.zip`,
                    zipBuffer
                );

                // Update package record
                await pool.query(
                    `UPDATE packages 
           SET status = $1, package_url = $2, readme_content = $3, pitch_content = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
                    ['completed', packageUrl, readme, pitch, packageId]
                );

                // Cleanup
                fs.rmSync(tmpDir, { recursive: true, force: true });

                console.log(`Package generation completed: ${packageId}`);
                return { success: true, packageUrl };
            } catch (error: any) {
                console.error(`Package generation failed for ${packageId}:`, error);

                await pool.query(
                    'UPDATE packages SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                    ['failed', error.message, packageId]
                );

                throw error;
            }
        }

        // Handle webhook processing with embeddings
        if (job.name === 'process-webhook') {
            const { eventType, payload, projectId, userId } = job.data;

            if (eventType === 'push' && payload.commits) {
                console.log(`Processing push event for project ${projectId}`);

                // Get GitHub token
                const tokenResult = await pool.query(
                    'SELECT access_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
                    [userId, 'github']
                );

                if (tokenResult.rows.length === 0) {
                    console.log('No GitHub token found, skipping embeddings');
                    return { success: true };
                }

                const accessToken = decrypt(tokenResult.rows[0].access_token);
                const githubService = new GitHubService(accessToken);
                const repoFullName = payload.repository.full_name;

                for (const commit of payload.commits.slice(0, 3)) {
                    // Process max 3 commits
                    const files = [...(commit.added || []), ...(commit.modified || [])];

                    for (const filePath of files.slice(0, 10)) {
                        // Process max 10 files per commit
                        try {
                            // Fetch file content from GitHub API
                            const octokit = githubService['octokit'];
                            const [owner, repo] = repoFullName.split('/');

                            const { data } = await octokit.repos.getContent({
                                owner,
                                repo,
                                path: filePath,
                                ref: commit.id,
                            });

                            if ('content' in data && data.content) {
                                const content = Buffer.from(data.content, 'base64').toString('utf-8');

                                // Skip if too large
                                if (content.length > 10000) {
                                    console.log(`Skipping large file: ${filePath}`);
                                    continue;
                                }

                                // Chunk the content
                                const chunks = embeddingsService.chunkText(content, 2000);

                                for (let i = 0; i < chunks.length; i++) {
                                    // Create embedding
                                    const embedding = await embeddingsService.createEmbedding(chunks[i]);

                                    // Store in database
                                    await pool.query(
                                        `INSERT INTO embeddings 
                     (project_id, file_path, commit_sha, chunk_index, content, embedding)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                                        [
                                            projectId,
                                            filePath,
                                            commit.id,
                                            i,
                                            chunks[i],
                                            `[${embedding.join(',')}]`,
                                        ]
                                    );
                                }

                                console.log(`Created ${chunks.length} embeddings for ${filePath}`);
                            }
                        } catch (error: any) {
                            console.error(`Failed to process file ${filePath}:`, error.message);
                        }
                    }
                }

                console.log(`Embeddings created for push to project ${projectId}`);
            }

            return { success: true };
        }
    },
    { connection, concurrency: 2 }
);

packageWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (${job.name}) completed`);
});

packageWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} (${job?.name}) failed:`, err);
});

console.log('🔄 Package generator and embeddings worker started');

export default packageWorker;
