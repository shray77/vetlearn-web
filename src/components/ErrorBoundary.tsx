'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFE5E3] dark:bg-[#3D1510] flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-[#FF3B30]" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Что-то пошло не так</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-[240px]">
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#28CD41] hover:bg-[#1FA833] text-white text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
