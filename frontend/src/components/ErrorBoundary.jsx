import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '#dashboard';
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto my-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-rose-500/30 rounded-2xl shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {this.props.title || 'Error al renderizar la sección'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se detectó una excepción no controlada en la interfaz. El resto del sistema continúa operativo.
              </p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-rose-700 dark:text-rose-300 overflow-x-auto max-h-32">
            {this.state.error?.toString()}
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={this.handleReset}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Vista</span>
            </button>
            <button
              onClick={this.handleGoDashboard}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Volver a Sala de Situación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
