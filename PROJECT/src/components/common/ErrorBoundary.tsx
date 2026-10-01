import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Isolated client exception caught by boundary
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-6 text-[var(--bone)]">
          <div className="max-w-md w-full bg-[var(--carbon)] border border-[var(--border)] rounded-[var(--r-xl)] p-8 shadow-[var(--shadow-lg)] space-y-6 text-center page-fade">
            <div className="w-12 h-12 rounded-full bg-[var(--red-dim)] border border-[var(--red-dim)] text-[var(--red)] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[var(--bone)] tracking-tight">
                Something went wrong
              </h2>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                An unexpected application error occurred. Refresh the page or return home to continue.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[var(--obsidian)] border border-[var(--border)] rounded-[var(--r-md)] text-left">
                <p className="text-xs font-mono text-[var(--red)] truncate">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-secondary !h-9 !text-xs gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary !h-9 !text-xs gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
