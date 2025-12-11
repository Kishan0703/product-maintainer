import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const webhookQueue = new Queue('webhook-processing', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

export interface WebhookJob {
    eventType: string;
    action: string;
    projectId: string;
    userId: string;
    payload: any;
}

export async function enqueueWebhookJob(job: WebhookJob) {
    await webhookQueue.add('process-webhook', job);
}
