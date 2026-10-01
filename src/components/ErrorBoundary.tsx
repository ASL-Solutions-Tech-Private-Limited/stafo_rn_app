import React from 'react';
import {View} from 'react-native';
import BootSplash from 'react-native-bootsplash';
import {TriangleAlert} from 'lucide-react-native';
import {Button, EmptyState} from './ui';

type State = {error: Error | null};

/**
 * Last-resort screen for render crashes. Also hides the native splash, which
 * would otherwise stay up forever if the app fails before navigation is ready.
 */
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error) {
    BootSplash.hide({fade: true});
    if (__DEV__) {
      console.error(error);
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <View style={{flex: 1, justifyContent: 'center', padding: 24}}>
        <EmptyState
          icon={TriangleAlert}
          title="Something went wrong"
          message="STAFO hit an unexpected problem. Try again, and if it keeps happening, restart the app."
          action={<Button title="Try again" fullWidth={false} onPress={() => this.setState({error: null})} />}
        />
      </View>
    );
  }
}
