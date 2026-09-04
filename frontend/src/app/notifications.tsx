import { AppIcon as Ionicons } from "@/components/ui/app-icon";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  deleteAllMedicationNotifications,
  deleteMedicationNotification,
  fetchMedicationNotifications,
  markMedicationNotificationRead,
type MedicationNotificationRecord,
} from "@/services/notification-api";

type NotificationListItem = MedicationNotificationRecord & {
  groupedIds: number[];
  groupedMedicineName: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<
    MedicationNotificationRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const displayNotifications = useMemo<NotificationListItem[]>(() => {
    const grouped = new Map<string, NotificationListItem>();

    for (const notification of notifications) {
      const key = [
        notification.medicationScheduleId,
        notification.scheduledAt,
      ].join(":");
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          ...notification,
          groupedIds: [notification.id],
          groupedMedicineName: getNotificationMedicineName(notification.body),
        });
        continue;
      }

      existing.groupedIds.push(notification.id);
      existing.readAt = existing.readAt && notification.readAt ? existing.readAt : null;
      existing.body = `${existing.groupedMedicineName} 외 ${
        existing.groupedIds.length - 1
      }개 약을 복용할 시간입니다.`;
    }

    return [...grouped.values()].sort(
      (left, right) =>
        new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
    );
  }, [notifications]);
  const unreadCount = useMemo(
    () => displayNotifications.filter((notification) => !notification.readAt).length,
    [displayNotifications],
  );

  const loadNotifications = useCallback(async () => {
    setErrorMessage("");

    try {
      const nextNotifications = await fetchMedicationNotifications();
      setNotifications(nextNotifications);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "알림 목록을 불러오지 못했어요.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadNotifications();
    }, [loadNotifications]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadNotifications();
  }, [loadNotifications]);

  const handleRead = useCallback(
    async (notification: NotificationListItem) => {
      if (notification.readAt) {
        return;
      }

      try {
        const updatedNotifications = await Promise.all(
          notification.groupedIds.map((id) => markMedicationNotificationRead(id)),
        );
        const updatedById = new Map(
          updatedNotifications.map((updatedNotification) => [updatedNotification.id, updatedNotification]),
        );
        setNotifications((currentNotifications) =>
          currentNotifications.map(
            (currentNotification) => updatedById.get(currentNotification.id) ?? currentNotification,
          ),
        );
      } catch (error) {
        Alert.alert(
          "알림",
          error instanceof Error && error.message
            ? error.message
            : "알림을 읽음 처리하지 못했어요.",
        );
      }
    },
    [],
  );

  const handleOpenNotification = useCallback(
    async (notification: NotificationListItem) => {
      await handleRead(notification);
      router.push("/(tabs)/schedule");
    },
    [handleRead, router],
  );

  const handleDelete = useCallback(
    (notification: NotificationListItem) => {
      Alert.alert("알림 삭제", "이 알림을 삭제할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                notification.groupedIds.map((id) => deleteMedicationNotification(id)),
              );
              setNotifications((currentNotifications) =>
                currentNotifications.filter(
                  (currentNotification) =>
                    !notification.groupedIds.includes(currentNotification.id),
                ),
              );
            } catch (error) {
              Alert.alert(
                "알림",
                error instanceof Error && error.message
                  ? error.message
                  : "알림을 삭제하지 못했어요.",
              );
            }
          },
        },
      ]);
    },
    [],
  );

  const handleDeleteAll = useCallback(() => {
    if (notifications.length === 0) {
      return;
    }

    Alert.alert("알림 전체 삭제", "모든 알림을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "전체 삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAllMedicationNotifications();
            setNotifications([]);
          } catch (error) {
            Alert.alert(
              "알림",
              error instanceof Error && error.message
                ? error.message
                : "알림을 모두 삭제하지 못했어요.",
            );
          }
        },
      },
    ]);
  }, [notifications.length]);

  return (
    <AppScreen showChatbotFab={false} showTopAlert={false}>
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + TopOverlayClearance,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                NOTIFICATIONS
              </ThemedText>
              <ThemedText type="subtitle">알림</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.summaryText}>
                {unreadCount > 0
                  ? `읽지 않은 복약 알림 ${unreadCount}개`
                  : "읽지 않은 복약 알림이 없어요."}
              </ThemedText>
            </View>

            <Pressable
              onPress={handleDeleteAll}
              disabled={notifications.length === 0}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.backgroundElement,
                  opacity: notifications.length === 0 ? 0.4 : 1,
                },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          {errorMessage ? (
            <ThemedView type="backgroundElement" style={styles.stateCard}>
              <ThemedText type="smallBold">알림을 불러오지 못했어요.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {errorMessage}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setIsLoading(true);
                  void loadNotifications();
                }}
                style={[
                  styles.retryButton,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="smallBold">다시 시도</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
            </View>
          ) : null}

          {!isLoading && !errorMessage && notifications.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.stateCard}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={theme.textSecondary}
                />
              </View>
              <ThemedText type="smallBold">표시할 알림이 없어요.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                복약 시간이 지나면 도착한 알림이 여기에 쌓입니다.
              </ThemedText>
            </ThemedView>
          ) : null}

          {!isLoading && !errorMessage && displayNotifications.length > 0 ? (
            <View style={styles.notificationList}>
              {displayNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onOpen={() => {
                    void handleOpenNotification(notification);
                  }}
                  onRead={() => {
                    void handleRead(notification);
                  }}
                  onDelete={() => handleDelete(notification)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </ThemedView>
    </AppScreen>
  );
}

type NotificationCardProps = {
  notification: MedicationNotificationRecord;
  onOpen: () => void;
  onRead: () => void;
  onDelete: () => void;
};

function NotificationCard({
  notification,
  onOpen,
  onRead,
  onDelete,
}: NotificationCardProps) {
  const theme = useTheme();
  const isUnread = !notification.readAt;
  const statusMeta = getNotificationStatusMeta(notification);

  return (
    <Pressable onPress={onOpen}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.notificationCard,
          {
            borderColor: isUnread ? theme.text : "transparent",
          },
        ]}
      >
        <View style={styles.notificationTopRow}>
          <View style={styles.notificationTitleBlock}>
            <View style={styles.titleRow}>
              {isUnread ? <View style={styles.unreadDot} /> : null}
              <ThemedText style={styles.notificationTitle}>
                {notification.title || "복약 알림"}
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.timeText}>
              {formatDateTime(notification.scheduledAt)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.backgroundColor },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </ThemedText>
          </View>
        </View>

        <ThemedText themeColor="textSecondary" style={styles.bodyText}>
          {notification.body || "약을 복용할 시간입니다."}
        </ThemedText>

        <View style={styles.actionRow}>
          <Pressable
            onPress={onRead}
            disabled={!isUnread}
            style={[
              styles.cardActionButton,
              {
                backgroundColor: theme.backgroundSelected,
                opacity: isUnread ? 1 : 0.45,
              },
            ]}
          >
            <Ionicons name="checkmark" size={16} color={theme.text} />
            <ThemedText type="smallBold">읽음</ThemedText>
          </Pressable>

          <Pressable
            onPress={onDelete}
            style={[
              styles.cardIconButton,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <Ionicons name="trash-outline" size={17} color={theme.text} />
          </Pressable>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function getNotificationStatusMeta(notification: MedicationNotificationRecord) {
  if (notification.readAt) {
    return {
      label: "읽음",
      color: "#DCE8FF",
      backgroundColor: "rgba(60, 135, 247, 0.26)",
    };
  }

  if (notification.status === "FAILED") {
    return {
      label: "실패",
      color: "#FFD4D4",
      backgroundColor: "rgba(255, 92, 92, 0.24)",
    };
  }

  if (notification.status === "SENT" || isPastDate(notification.scheduledAt)) {
    return {
      label: "도착",
      color: "#D8F6E7",
      backgroundColor: "rgba(40, 190, 120, 0.22)",
    };
  }

  return {
    label: "예정",
    color: "#F3E4B0",
    backgroundColor: "rgba(245, 190, 70, 0.24)",
  };
}

function isPastDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date <= new Date();
}

function getNotificationMedicineName(body: string) {
  return body.replace(/\s*복용할 시간입니다\.?\s*$/, '').trim() || '약';
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "시간 정보 없음";
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    gap: Spacing.one,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 20,
  },
  stateCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  loadingWrap: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationList: {
    gap: Spacing.two,
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  notificationTitleBlock: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3C87F7",
  },
  notificationTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
  cardActionButton: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
