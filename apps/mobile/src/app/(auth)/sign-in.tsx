import { space } from '@spree-native/ui';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button, Screen, TextField } from '@/components/primitives';
import { Text } from '@/components/text';
import { useSession } from '@/session/session';
import { useTRPC } from '@/trpc/trpc';

type Mode = 'password' | 'apiKey' | 'oauthClient';

export default function SignInScreen() {
  const { url, api } = useLocalSearchParams<{ url: string; api: 'platform-v2' | 'admin-v3' }>();
  const trpc = useTRPC();
  const session = useSession();
  const [mode, setMode] = useState<Mode>(api === 'admin-v3' ? 'apiKey' : 'password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [clientId, setClientId] = useState('');

  const signIn = useMutation(
    trpc.store.signIn.mutationOptions({
      onSuccess: ({ probe, credential }) => session.connect(probe, credential),
    }),
  );

  const submit = () => {
    if (mode === 'password') signIn.mutate({ method: 'password', url, email, password });
    else if (mode === 'apiKey') signIn.mutate({ method: 'apiKey', url, apiKey: secret });
    else signIn.mutate({ method: 'oauthClient', url, clientId, clientSecret: secret });
  };

  const alternate: Mode =
    api === 'admin-v3'
      ? mode === 'apiKey'
        ? 'password'
        : 'apiKey'
      : mode === 'password'
        ? 'oauthClient'
        : 'password';
  const alternateLabel = {
    password: 'Sign in with email instead',
    apiKey: 'Use a secret API key instead',
    oauthClient: 'Use an OAuth application instead',
  }[alternate];

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: space[4], gap: space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text tone="muted">{url.replace(/^https?:\/\//, '')}</Text>
          {mode === 'password' ? (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                onSubmitEditing={submit}
              />
            </>
          ) : mode === 'apiKey' ? (
            <TextField
              label="Secret API key"
              value={secret}
              onChangeText={setSecret}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="sk_…"
            />
          ) : (
            <>
              <TextField
                label="OAuth application ID"
                value={clientId}
                onChangeText={setClientId}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextField
                label="OAuth application secret"
                value={secret}
                onChangeText={setSecret}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </>
          )}
          {signIn.error ? <Text tone="critical">{signIn.error.message}</Text> : null}
          <Button title="Sign in" loading={signIn.isPending} onPress={submit} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode(alternate)}
            style={{ alignSelf: 'center', padding: space[2] }}
          >
            <Text tone="accent" font="uiMedium">
              {alternateLabel}
            </Text>
          </Pressable>
          <View style={{ height: space[8] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
