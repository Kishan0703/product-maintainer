import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class LLMService {
    async generateREADME(projectInfo: {
        name: string;
        description?: string;
        files: string[];
        packageJson?: any;
    }): Promise<string> {
        const prompt = `Generate a comprehensive README.md for a project with the following information:

Project Name: ${projectInfo.name}
Description: ${projectInfo.description || 'Not provided'}
Main Files: ${projectInfo.files.slice(0, 20).join(', ')}
${projectInfo.packageJson ? `Package.json: ${JSON.stringify(projectInfo.packageJson, null, 2)}` : ''}

Create a professional README with sections for:
- Project Title and Description
- Features
- Installation
- Usage
- API Documentation (if applicable)
- Contributing
- License

Make it clear, concise, and professional.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0].message.content || '';
    }

    async generatePitch(projectInfo: {
        name: string;
        description?: string;
        readme: string;
    }): Promise<string> {
        const prompt = `Based on this project information, create a 6-slide pitch outline in Markdown format:

Project: ${projectInfo.name}
Description: ${projectInfo.description || ''}

README excerpt:
${projectInfo.readme.slice(0, 1000)}

Create 6 slides with:
1. Title & Problem Statement
2. Solution Overview
3. Key Features
4. Technical Architecture
5. Market Opportunity
6. Call to Action

Format as Markdown with clear slide separators (---).`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0].message.content || '';
    }

    async answerQuestion(question: string, context: string[]): Promise<string> {
        const contextText = context.join('\n\n---\n\n');

        const prompt = `You are a helpful code assistant. Answer the following question about a repository based on the provided code snippets.

Question: ${question}

Code Context:
${contextText}

Provide a clear, concise answer referencing specific files and code when relevant.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
        });

        return response.choices[0].message.content || '';
    }
}
