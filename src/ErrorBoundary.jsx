import React from 'react';
import { Button } from './components/ui/Button';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Ops! Algo deu errado.</h1>
                    <p className="text-gray-600 mb-6">O aplicativo encontrou um erro inesperado.</p>

                    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl w-full text-left overflow-auto mb-6 border border-red-100">
                        <summary className="font-mono text-sm text-red-800 mb-2 font-bold">
                            {this.state.error && this.state.error.toString()}
                        </summary>
                        <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <Button onClick={() => window.location.reload()}>
                        Recarregar Página
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
