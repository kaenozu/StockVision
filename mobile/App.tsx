import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store/store';
import { theme } from './src/theme/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/NotificationService';
import { WebSocketService } from './src/services/WebSocketService';

export default function App() {
  React.useEffect(() => {
    // Initialize services
    NotificationService.initialize();
    WebSocketService.initialize();
    
    return () => {
      // Cleanup on unmount
      WebSocketService.disconnect();
    };
  }, []);

  return (
    <StoreProvider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </StoreProvider>
  );
}