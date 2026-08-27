import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ThemedText } from "../ui/themed-text";
import { ThemedView } from "../ui/themed-view";

export function PrescriptionUploadActions() {
  const router = useRouter();
  const theme = useTheme();
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "권한 필요",
        "카메라 권한을 허용해야 처방전을 촬영할 수 있어요.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setPhotoOptionsOpen(false);
    router.push({
      pathname: "/prescription-photo-preview",
      params: {
        imageUri: asset.uri,
        source: "camera",
      },
    });
  }

  async function openImageLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "권한 필요",
        "사진 접근 권한을 허용해야 앨범에서 불러올 수 있어요.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setPhotoOptionsOpen(false);
    router.push({
      pathname: "/prescription-photo-preview",
      params: {
        imageUri: asset.uri,
        source: "library",
      },
    });
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.primaryActions}>
          <Pressable
            style={styles.primaryCard}
            onPress={() => setPhotoOptionsOpen(true)}
          >
            <ThemedView type="backgroundElement" style={styles.primaryInner}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Ionicons name="camera" size={22} color={theme.text} />
              </View>

              <ThemedText style={styles.actionTitle}>사진으로 등록</ThemedText>
            </ThemedView>
          </Pressable>

          <Pressable
            style={styles.primaryCard}
            onPress={() => router.push("/prescription-manual")}
          >
            <ThemedView type="backgroundElement" style={styles.primaryInner}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Ionicons name="create-outline" size={22} color={theme.text} />
              </View>

              <ThemedText style={styles.actionTitle}>직접 입력</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={photoOptionsOpen}
        onRequestClose={() => setPhotoOptionsOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPhotoOptionsOpen(false)}
        >
          <Pressable onPress={() => {}}>
            <ThemedView type="backgroundElement" style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>사진 등록 방식</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  원하는 방법을 골라 바로 진행하세요.
                </ThemedText>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[
                    styles.modalActionButton,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                  onPress={openCamera}
                >
                  <Ionicons
                    name="camera-outline"
                    size={22}
                    color={theme.text}
                  />
                  <ThemedText style={styles.modalActionLabel}>촬영</ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalActionButton,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                  onPress={openImageLibrary}
                >
                  <Ionicons
                    name="images-outline"
                    size={22}
                    color={theme.text}
                  />
                  <ThemedText style={styles.modalActionLabel}>앨범 선택</ThemedText>
                </Pressable>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setPhotoOptionsOpen(false)}
              >
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.modalClose}
                >
                  닫기
                </ThemedText>
              </Pressable>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    alignItems: "center",
  },
  primaryActions: {
    gap: Spacing.two,
    width: "100%",
  },
  primaryCard: {
    width: "100%",
  },
  primaryInner: {
    borderRadius: 24,
    paddingHorizontal: 20,
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    gap: Spacing.three,
  },
  modalHeader: {
    gap: Spacing.one,
  },
  modalTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  modalActions: {
    gap: Spacing.two,
  },
  modalActionButton: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  modalActionLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  modalClose: {
    fontSize: 14,
    lineHeight: 18,
  },
});
