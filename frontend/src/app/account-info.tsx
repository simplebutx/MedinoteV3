import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { fetchMyProfile } from "@/services/auth-api";

export default function AccountInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut, updateUser, user } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setErrorMessage("");

      try {
        const profile = await fetchMyProfile();

        if (!mounted) {
          return;
        }

        await updateUser({
          email: profile.email,
          name: profile.username ?? profile.email.split("@")[0] ?? "사용자",
          role: profile.role,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "회원 정보를 불러오지 못했어요."
        );

        await signOut();
        router.replace("/login");
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [router, signOut, updateUser]);

  return (
    <AppScreen showTopAlert={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + TopOverlayClearance,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
              ACCOUNT
            </ThemedText>
            <ThemedText style={styles.title}>회원정보</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              현재 로그인한 계정 정보를 확인할 수 있어요.
            </ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push("/notifications")}
          />
        </View>

        <ThemedView type="backgroundElement" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <ThemedText themeColor="textSecondary" style={styles.label}>
              이름
            </ThemedText>
            <ThemedText style={styles.value}>
              {isLoadingProfile ? "불러오는 중..." : user?.name ?? "-"}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <ThemedText themeColor="textSecondary" style={styles.label}>
              이메일
            </ThemedText>
            <ThemedText style={styles.value}>
              {isLoadingProfile ? "불러오는 중..." : user?.email ?? "-"}
            </ThemedText>
          </View>
        </ThemedView>

        {errorMessage ? (
          <ThemedText themeColor="textSecondary" style={styles.errorText}>
            {errorMessage}
          </ThemedText>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  infoRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 18,
    gap: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
  },
  value: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  divider: {
    marginLeft: Spacing.three,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
