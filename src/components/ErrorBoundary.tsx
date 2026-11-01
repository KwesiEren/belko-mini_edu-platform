import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "./Icon";

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
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Belko UI ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Icon name="alert" size={32} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
              <p className="text-sm text-slate-600 mt-2">
                Belko encountered an unexpected issue. Your school database is safe. You can recover by trying again or reloading.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-36 overflow-auto text-xs text-rose-700 font-mono">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="button button-secondary"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="button button-primary"
              >
                Reload workspace
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
