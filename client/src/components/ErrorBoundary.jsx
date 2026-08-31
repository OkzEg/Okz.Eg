import { Component } from 'react';
import { Link } from 'react-router-dom';
import { reportClientError } from '../utils/errorReporting';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportClientError({
      type: 'react',
      message: String(error?.message || 'React render error').slice(0, 2000),
      stack: [error?.stack, info?.componentStack].filter(Boolean).join('\n\n').slice(0, 4000),
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="font-display text-4xl tracking-wide text-timber-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-timber-500">
            We’ve been notified. Please refresh or go back to the shop.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-wheat"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
            <a href="/shop" className="btn-outline">
              Back to shop
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
