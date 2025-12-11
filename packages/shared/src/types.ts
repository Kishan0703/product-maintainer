export interface User {
    id: string;
    email: string;
    name: string;
    githubId?: string;
    githubUsername?: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Team {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    userId: string;
    teamId?: string;
    repoFullName?: string;
    repoUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActivityLog {
    id: string;
    projectId: string;
    userId: string;
    action: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    githubUsername?: string;
    avatarUrl?: string;
}

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description?: string;
    private: boolean;
}

export interface Package {
    id: string;
    projectId: string;
    branchOrCommit: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    packageUrl?: string;
    readmeContent?: string;
    pitchContent?: string;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EmbeddingChunk {
    id: string;
    projectId: string;
    filePath?: string;
    commitSha?: string;
    chunkIndex: number;
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface QAResponse {
    answer: string;
    sources: {
        filePath: string;
        commitSha?: string;
        content: string;
        similarity?: number;
    }[];
    cached: boolean;
}
