import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { fontAssets, theme } from '@/distribution';
import { SessionProvider, useSession } from '@/session/session';
import { AppThemeProvider, useTheme } from '@/theme/theme';
import { ApiProvider } from '@/trpc/trpc';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    ...fontAssets,
  });
  return (
    <AppThemeProvider theme={theme}>
      <SessionProvider>
        <Navigation ready={fontsLoaded} />
      </SessionProvider>
    </AppThemeProvider>
  );
}

function Navigation({ ready }: { ready: boolean }) {
  const { state } = useSession();
  const { colors, scheme } = useTheme();
  const booted = ready && state.status !== 'loading';

  useEffect(() => {
    if (booted) SplashScreen.hideAsync();
  }, [booted]);
  if (!booted) return null;

  return (
    <ApiProvider session={state.session}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={state.status === 'ready'}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={state.status !== 'ready'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ApiProvider>
  );
}
