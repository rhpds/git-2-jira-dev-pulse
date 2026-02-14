import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Button,
  EmptyStateActions,
  Stack,
  StackItem,
  CodeBlock,
  CodeBlockCode,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <EmptyState titleText="Something went wrong" icon={ExclamationCircleIcon} status="danger">
          <EmptyStateBody>
            <Stack hasGutter>
              <StackItem>
                An unexpected error occurred. You can try reloading the page or going back to the previous page.
              </StackItem>
              {isDev && this.state.error && (
                <StackItem>
                  <CodeBlock>
                    <CodeBlockCode>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </CodeBlockCode>
                  </CodeBlock>
                </StackItem>
              )}
            </Stack>
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={this.handleReload}>
                Reload page
              </Button>
              <Button variant="secondary" onClick={this.handleGoBack}>
                Go back
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
