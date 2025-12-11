import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class EmbeddingsService {
    async createEmbedding(text: string): Promise<number[]> {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    }

    async createEmbeddings(texts: string[]): Promise<number[][]> {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: texts,
        });

        return response.data.map((d) => d.embedding);
    }

    chunkText(text: string, maxChunkSize: number = 2000): string[] {
        const chunks: string[] = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if (currentChunk.length + line.length > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = line;
            } else {
                currentChunk += '\n' + line;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}
