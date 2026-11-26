import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const { colors, fonts } = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      iconColor={{ default: colors.inkMuted, selected: colors.ink }}
      labelStyle={{
        default: { color: colors.inkMuted, fontFamily: fonts.uiMedium },
        selected: { color: colors.ink, fontFamily: fonts.uiSemibold },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <NativeTabs.Trigger.Label>Products</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tag', selected: 'tag.fill' }} md="sell" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <NativeTabs.Trigger.Label>Customers</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
