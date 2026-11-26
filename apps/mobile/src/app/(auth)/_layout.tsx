import { Stack } from 'expo-router';
import { useTheme } from '@/theme/theme';

export default function AuthLayout() {
  const { colors, fonts } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.uiSemibold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="connect" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
    </Stack>
  );
}
