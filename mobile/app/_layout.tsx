import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '../context/AuthContext';
import { colors } from '../theme';
import { notifications } from '../services/notifications';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Initialize notifications
    notifications.initialize();

    // Hide splash screen after setup
    SplashScreen.hideAsync();

    return () => {
      notifications.removeListeners();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background.primary,
            },
            headerTintColor: colors.text.primary,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: colors.background.primary,
            },
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="target/[id]"
            options={{
              title: 'Target Analysis',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="target/new"
            options={{
              title: 'New Analysis',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="molecule/[smiles]"
            options={{
              title: 'Molecule Viewer',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="molecule/new"
            options={{
              title: 'Generate Molecules',
              presentation: 'modal',
            }}
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
