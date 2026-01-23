import React from 'react';

/**
 * This will catch errors with any child components and display a fallback UI.
 * There is a default fallback UI but you can pass a custom one as a prop.
 * @param {React.ReactNode} fallback - The fallback UI to display when an error occurs.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetError = this.resetError.bind(this);
  }

  // This lifecycle method is called when a child component throws an error
  static getDerivedStateFromError(error) {
    // Set the error in state so we can use it in the render method
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error caught by ErrorBoundary:', error, info);
  }

  // A method to reset the state and try rendering the children again
  resetError() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { fallback, children } = this.props;
    if (hasError) {
      return (
        fallback || (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <h3>Something went wrong 😭</h3>
            <p>{error?.toString()}</p>
            <button style={{ marginTop: '20px' }} onClick={this.resetError}>
              Attempt to Reload
            </button>
          </div>
        )
      );
    }

    return children;
  }
}

export default ErrorBoundary;
