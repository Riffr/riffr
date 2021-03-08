import React from "react"

interface ErrorBoundaryProps {
    fallback: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
    state = { hasError: false, error: null };

    // Error Boundary has to be a class due to this method
    static getDerivedStateFromError(error: any) {
      return {
        hasError: true,
        error
      };
    }

    render() {
      if (this.state.hasError) {
        return this.props.fallback;
      }
      return this.props.children;
    }
}

export {
    ErrorBoundary
}