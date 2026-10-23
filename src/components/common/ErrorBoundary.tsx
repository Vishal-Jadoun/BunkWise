import { Component, ErrorInfo, ReactNode } from 'react';

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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught rendering exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0A0A0A] text-white min-h-[400px]">
          <div className="w-14 h-14 rounded-2xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center mb-3 text-2xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold mb-1">Display Error Recovered</h2>
          <p className="text-xs text-gray-400 max-w-xs mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading student records.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00]"
            >
              Refresh View
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/auth/login';
              }}
              className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-white/5"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
