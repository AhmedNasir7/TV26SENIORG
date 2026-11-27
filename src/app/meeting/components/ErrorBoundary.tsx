"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="font-display mb-4 text-2xl font-semibold" style={{ color: "var(--danger)" }}>
              Something went wrong
            </h2>
            <p className="mb-4 text-[color:var(--muted)]">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary px-4 py-2 text-sm">
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

