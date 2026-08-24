'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-900/40 bg-rose-950/20 backdrop-blur-md m-4">
          <div className="h-16 w-16 rounded-2xl bg-rose-900/30 border border-rose-700/50 flex items-center justify-center mb-4 text-rose-400">
            <AlertOctagon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Component Rendering Interrupted</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            An unexpected error occurred in this view. The zero-retention guardrail data has been protected.
          </p>

          {this.state.error && (
            <div className="w-full max-w-lg mb-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left overflow-auto font-mono text-xs text-rose-300">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-md"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
