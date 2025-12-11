'use client';

import { useState, useEffect } from 'react';
import { GitHubRepo } from 'shared';
import { apiRequest } from '../utils/api';

interface RepoSelectorProps {
    onRepoSelected: (repo: GitHubRepo) => void;
}

export default function RepoSelector({ onRepoSelected }: RepoSelectorProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRepos();
    }, []);

    const fetchRepos = async () => {
        try {
            const data = await apiRequest('/api/projects/repos');
            setRepos(data.repositories);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredRepos = repos.filter((repo) =>
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-2">Loading repositories...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">Error: {error}</p>
            </div>
        );
    }

    return (
        <div>
            <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRepos.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No repositories found</p>
                ) : (
                    filteredRepos.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => onRepoSelected(repo)}
                            className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold">{repo.full_name}</h3>
                                    {repo.description && (
                                        <p className="text-gray-400 text-sm mt-1">{repo.description}</p>
                                    )}
                                </div>
                                {repo.private && (
                                    <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                        Private
                                    </span>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
