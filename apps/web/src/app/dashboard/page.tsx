'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { Project, GitHubRepo } from 'shared';
import RepoSelector from '@/components/RepoSelector';
import AskRepoModal from '@/components/AskRepoModal';

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading, logout } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [showRepoSelector, setShowRepoSelector] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchProjects();
        }
    }, [user, authLoading, router]);

    const fetchProjects = async () => {
        try {
            const data = await apiRequest('/api/projects');
            setProjects(data.projects);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRepoSelected = async (repo: GitHubRepo) => {
        try {
            await apiRequest('/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    name: repo.name,
                    description: repo.description,
                    repoFullName: repo.full_name,
                    repoUrl: repo.html_url,
                }),
            });

            setShowRepoSelector(false);
            fetchProjects();
        } catch (error: any) {
            alert(`Failed to connect repository: ${error.message}`);
        }
    };

    if (authLoading || loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {user.avatarUrl && (
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                            <p className="text-gray-400">@{user.githubUsername}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Projects Section */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Connected Projects</h2>
                        <button
                            onClick={() => setShowRepoSelector(!showRepoSelector)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                            {showRepoSelector ? 'Cancel' : '+ Connect Repository'}
                        </button>
                    </div>

                    {showRepoSelector && (
                        <div className="mb-6">
                            <RepoSelector onRepoSelected={handleRepoSelected} />
                        </div>
                    )}

                    {projects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📦</div>
                            <p className="text-gray-400 mb-4">No projects connected yet</p>
                            <button
                                onClick={() => setShowRepoSelector(true)}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                Connect Your First Repository
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
                                >
                                    <h3 className="text-white font-semibold mb-2">{project.name}</h3>
                                    {project.description && (
                                        <p className="text-gray-400 text-sm mb-3">{project.description}</p>
                                    )}
                                    {project.repoFullName && (
                                        <div className="flex items-center gap-2 text-sm mb-3">
                                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            <a
                                                href={project.repoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 truncate"
                                            >
                                                {project.repoFullName}
                                            </a>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSelectedProjectId(project.id)}
                                        className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        🤖 Ask Repo
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Ask Repo Modal */}
            {selectedProjectId && (
                <AskRepoModal
                    projectId={selectedProjectId}
                    onClose={() => setSelectedProjectId(null)}
                />
            )}
        </main>
    );
}
