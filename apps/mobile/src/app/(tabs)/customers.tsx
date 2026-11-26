import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Screen } from '@/components/primitives';

export default function CustomersScreen() {
  return (
    <Screen>
      <SafeAreaView>
        <EmptyState
          title="Customers"
          body="Customer profiles, lifetime spend and order history. Arrives in v0.1."
        />
      </SafeAreaView>
    </Screen>
  );
}
