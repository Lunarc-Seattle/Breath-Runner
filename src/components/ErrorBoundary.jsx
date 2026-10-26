import { Component } from 'react';

/**
 * Catches render errors in a page so the header and navigation keep working,
 * and shows a recoverable message instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section
        role="alert"
        className="max-w-lg mx-auto mt-10 p-7 rounded-[28px] bg-white border border-slate-200 text-center space-y-3"
      >
        <h2 className="text-xl font-bold text-slate-900">This page hit a problem</h2>
        <p className="text-sm text-slate-600">
          Something went wrong while showing this page. Your saved runs are safe.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2.5 rounded-2xl bg-[#1E2432] text-white text-xs font-bold"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.props.onHome}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold"
          >
            Go home
          </button>
        </div>
      </section>
    );
  }
}
