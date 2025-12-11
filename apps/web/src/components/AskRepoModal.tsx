'use client';

import { useState } from 'react';
import { QAResponse } from 'shared';
import { apiRequest } from '../utils/api';

interface AskRepoModalProps {
    projectId: string;
    onClose: () => void;
}

export default function AskRepoModal({ projectId, onClose }: AskRepoModalProps) {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<QAResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAsk = async () => {
        if (!question.trim()) return;

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const data = await apiRequest(`/api/projects/${projectId}/ai/q`, {
                method: 'POST',
                body: JSON.stringify({ question }),
            });

            setResponse(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Ask Repository</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Question Input */}
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Your Question</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                                placeholder="What does this project do?"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                disabled={loading}
                            />
                            <button
                                onClick={handleAsk}
                                disabled={loading || !question.trim()}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                            >
                                {loading ? 'Thinking...' : 'Ask'}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Response */}
                    {response && (
                        <div className="space-y-4">
                            {/* Answer */}
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-blue-400 font-semibold">Answer</span>
                                    {response.cached && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                            Cached
                                        </span>
                                    )}
                                </div>
                                <p className="text-white whitespace-pre-wrap">{response.answer}</p>
                            </div>

                            {/* Sources */}
                            {response.sources.length > 0 && (
                                <div>
                                    <h3 className="text-gray-300 font-semibold mb-3">Source Code Snippets</h3>
                                    <div className="space-y-3">
                                        {response.sources.map((source, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white/5 border border-white/10 rounded-lg p-4"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <code className="text-blue-400 text-sm">{source.filePath}</code>
                                                    {source.similarity && (
                                                        <span className="text-xs text-gray-400">
                                                            {(source.similarity * 100).toFixed(1)}% match
                                                        </span>
                                                    )}
                                                </div>
                                                {source.commitSha && (
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        Commit: {source.commitSha.substring(0, 7)}
                                                    </p>
                                                )}
                                                <pre className="text-sm text-gray-300 bg-black/30 p-3 rounded overflow-x-auto">
                                                    {source.content}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-400">Searching repository and generating answer...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
