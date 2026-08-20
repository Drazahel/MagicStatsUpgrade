import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/components/AppTheme';
import { ThemeSwitch } from '@/components/ThemeSwitch';
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

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { colors } = useAppTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.cream,
          headerStyle: {
            backgroundColor: colors.header,
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: colors.gold,
          },
          contentStyle: {
            backgroundColor: colors.screen,
          },
        }}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Menu',
            headerRight: () => <ThemeSwitch />,
          }}
        />
        <Stack.Screen name="nouvelle-partie" options={{ title: 'Nouvelle Partie' }} />
        <Stack.Screen name="historique" options={{ title: 'Historique' }} />
        <Stack.Screen name="statistiques" options={{ title: 'Statistiques' }} />
        <Stack.Screen name="joueurs" options={{ title: 'Joueurs' }} />
        <Stack.Screen name="decks" options={{ title: 'Decks' }} />
        <Stack.Screen name="import-export" options={{ title: 'Import/Export' }} />
      </Stack>
    </ThemeProvider>
  );
}
