import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { fetchMedicationNotifications } from '@/services/notification-api';

import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

type TopAlertBannerProps = {
  unreadCount?: number;
  onPress?: () => void;
};

export function TopAlertBanner({
  onPress,
}: TopAlertBannerProps) {
  const theme = useTheme();
  const { isAuthenticated, isHydrating } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadUnreadCount() {
        if (isHydrating || !isAuthenticated) {
          setUnreadCount(0);
          return;
        }

        try {
          const notifications = await fetchMedicationNotifications();
          const nextUnreadCount = notifications.filter(
            (notification) => !notification.readAt,
          ).length;

          if (mounted) {
            setUnreadCount(nextUnreadCount);
          }
        } catch {
          if (mounted) {
            setUnreadCount(0);
          }
        }
      }

      void loadUnreadCount();

      return () => {
        mounted = false;
      };
    }, [isAuthenticated, isHydrating]),
  );

  return (
    <Pressable hitSlop={12} style={styles.wrapper} onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.button}>
        <Ionicons name="notifications-outline" size={22} color={theme.text} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{badgeLabel}</ThemedText>
          </View>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
