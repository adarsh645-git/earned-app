import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('=== REAL ERROR CAUGHT ===');
    console.log('Error message:', error.message);
    console.log('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0E0E10', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#F87171', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            Caught Error
          </Text>
          <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
          <Text style={{ color: '#71717A', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
            {this.state.errorInfo}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
