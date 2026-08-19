import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: '#E8D9B8',
          headerStyle: {
            backgroundColor: '#1A140C',
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: '#C4A35A',
          },
          contentStyle: {
            backgroundColor: '#0F1A14',
          },
        }}>
        <Stack.Screen name="index" options={{ title: 'Menu' }} />
        <Stack.Screen name="statistiques" options={{ title: 'Statistiques' }} />
        <Stack.Screen name="joueurs" options={{ title: 'Joueurs' }} />
        <Stack.Screen name="decks" options={{ title: 'Decks' }} />
        <Stack.Screen name="import-export" options={{ title: 'Import/Export' }} />
      </Stack>
    </ThemeProvider>
  );
}
