'use client';

import { useState } from 'react';
import { Package } from 'shared';
import { apiRequest } from '../utils/api';

interface PackageGeneratorProps {
    projectId: string;
    onPackageCreated?: (pkg: Package) => void;
}

export default function PackageGenerator({ projectId, onPackageCreated }: PackageGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const [currentPackage, setCurrentPackage] = useState<Package | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [branchOrCommit, setBranchOrCommit] = useState('main');

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await apiRequest(`/api/projects/${projectId}/package`, {
                method: 'POST',
                body: JSON.stringify({ branchOrCommit }),
            });

            setCurrentPackage(data.package);
            onPackageCreated?.(data.package);

            // Poll for status
            pollPackageStatus(data.package.id);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const pollPackageStatus = async (packageId: string) => {
        const interval = setInterval(async () => {
            try {
                const data = await apiRequest(`/api/packages/${packageId}`);
                setCurrentPackage(data.package);

                if (data.package.status === 'completed' || data.package.status === 'failed') {
                    clearInterval(interval);
                    setLoading(false);
                }
            } catch (err) {
                clearInterval(interval);
                setLoading(false);
            }
        }, 3000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-400';
            case 'failed':
                return 'text-red-400';
            case 'processing':
                return 'text-blue-400';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Generate Package</h3>

            {/* Input */}
            <div className="mb-4">
                <label className="block text-gray-300 mb-2">Branch or Commit</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={branchOrCommit}
                        onChange={(e) => setBranchOrCommit(e.target.value)}
                        placeholder="main"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        disabled={loading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !branchOrCommit}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Package Status */}
            {currentPackage && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-300">Status:</span>
                        <span className={`font-semibold capitalize ${getStatusColor(currentPackage.status)}`}>
                            {currentPackage.status}
                        </span>
                    </div>

                    {currentPackage.status === 'processing' && (
                        <div className="mb-3">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                Cloning repository, generating docs, and creating package...
                            </p>
                        </div>
                    )}

                    {currentPackage.status === 'completed' && currentPackage.packageUrl && (
                        <div>
                            <a
                                href={currentPackage.packageUrl}
                                download
                                className="block w-full text-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-semibold mb-3"
                            >
                                📦 Download Package
                            </a>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-black/30 p-2 rounded">
                                    <span className="text-gray-400">README:</span>
                                    <span className="text-green-400 ml-2">✓ Generated</span>
                                </div>
                                <div className="bg-black/30 p-2 rounded">
                                    <span className="text-gray-400">Pitch:</span>
                                    <span className="text-green-400 ml-2">✓ Generated</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentPackage.status === 'failed' && currentPackage.errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-red-400 text-sm">{currentPackage.errorMessage}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
