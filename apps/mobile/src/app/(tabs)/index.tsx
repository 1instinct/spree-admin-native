import { layout, radius, space } from '@spree-native/ui';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/primitives';
import { Label, Text } from '@/components/text';
import { useSession } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { useTRPC } from '@/trpc/trpc';

export default function HomeScreen() {
  const trpc = useTRPC();
  const { colors } = useTheme();
  const { state } = useSession();
  const [unfulfilled, unpaid] = useQueries({
    queries: [
      trpc.orders.list.queryOptions({ filter: 'unfulfilled', perPage: 1 }),
      trpc.orders.list.queryOptions({ filter: 'unpaid', perPage: 1 }),
    ],
  });
  const storeName =
    state.store?.probe.storeName ?? state.store?.probe.baseUrl.replace(/^https?:\/\//, '') ?? '';
  const todo: [number | undefined, string, string, 'attention' | 'info'][] = [
    [unfulfilled?.data?.totalCount, 'orders to fulfil', 'unfulfilled', 'attention'],
    [unpaid?.data?.totalCount, 'payments due', 'unpaid', 'attention'],
  ];

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: layout.gutter, gap: space[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <View style={[styles.mark, { backgroundColor: colors.ink }]}>
              <Text font="display" size="footnote" style={{ color: colors.bg }}>
                {storeName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text font="uiSemibold" numberOfLines={1}>
              {storeName}
            </Text>
          </View>
          <View style={{ gap: space[2] }}>
            <Label>To do</Label>
            <View style={[styles.list, { borderColor: colors.line, backgroundColor: colors.line }]}>
              {todo.map(([count, label, filter, tone]) => (
                <Pressable
                  key={filter}
                  accessibilityRole="button"
                  onPress={() => router.push('/orders')}
                  style={({ pressed }) => [
                    styles.todo,
                    { backgroundColor: pressed ? colors.surfaceSunk : colors.surface },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: colors[tone] }]} />
                  <Text font="display" size="title3" style={{ minWidth: 28 }}>
                    {count ?? '–'}
                  </Text>
                  <Text style={{ flex: 1 }}>{label}</Text>
                  <Text tone="muted">›</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text size="footnote" tone="muted">
            Today's sales, low stock and activity arrive in v0.1.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    overflow: 'hidden',
    gap: StyleSheet.hairlineWidth,
  },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    minHeight: layout.rowMinHeight,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
