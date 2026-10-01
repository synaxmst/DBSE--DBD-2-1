import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center page-fade">
      <div className="space-y-5 max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-3)]">
          <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
          HTTP 404
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-1)] tracking-tight">
          Page Not Found
        </h1>

        <p className="text-[14px] text-[var(--text-2)] leading-relaxed">
          The requested route does not exist or has been relocated in the AlgoFlow platform.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
