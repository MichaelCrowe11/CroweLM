import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
          },
          headerTintColor: isDark ? '#ffffff' : '#0f172a',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="target/[id]"
          options={{
            title: 'Target Analysis',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="molecule/[smiles]"
          options={{
            title: 'Molecule Viewer',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
