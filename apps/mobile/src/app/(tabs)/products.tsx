import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Screen } from '@/components/primitives';

export default function ProductsScreen() {
  return (
    <Screen>
      <SafeAreaView>
        <EmptyState
          title="Products"
          body="Browse products, scan barcodes and adjust stock. Arrives in v0.1."
        />
      </SafeAreaView>
    </Screen>
  );
}
