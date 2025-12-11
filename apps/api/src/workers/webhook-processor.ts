import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { WebhookJob } from '../queue';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const worker = new Worker(
    'webhook-processing',
    async (job) => {
        const data = job.data as WebhookJob;

        console.log(`Processing webhook job ${job.id}:`, {
            eventType: data.eventType,
            action: data.action,
            projectId: data.projectId,
        });

        // TODO: Add your webhook processing logic here
        // Examples:
        // - Generate AI summaries
        // - Create embeddings for commits
        // - Send notifications
        // - Update project statistics

        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(`Completed webhook job ${job.id}`);

        return { success: true, processedAt: new Date().toISOString() };
    },
    {
        connection,
        concurrency: 5,
    }
);

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('🔄 Webhook worker started');

export default worker;
