import { Octokit } from '@octokit/rest';
import { GitHubRepo } from 'shared';

export class GitHubService {
    private octokit: Octokit;

    constructor(accessToken: string) {
        this.octokit = new Octokit({ auth: accessToken });
    }

    async getUserProfile() {
        const { data } = await this.octokit.users.getAuthenticated();
        return {
            id: data.id,
            login: data.login,
            name: data.name || data.login,
            email: data.email || `${data.login}@users.noreply.github.com`,
            avatar_url: data.avatar_url,
        };
    }

    async getUserRepositories(): Promise<GitHubRepo[]> {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
        });

        return data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description || undefined,
            private: repo.private,
        }));
    }

    static async exchangeCodeForToken(code: string): Promise<string> {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error_description || 'Failed to exchange code for token');
        }

        return data.access_token;
    }
}
