import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchHealthProfile,
  saveHealthProfile,
  type HealthProfilePayload,
} from "@/services/health-profile-api";

type HealthFieldKey =
  | "isPregnant"
  | "isBreastfeeding"
  | "isSmoking"
  | "isDrinking"
  | "isChild"
  | "isElderly";

type HealthField = {
  key: HealthFieldKey;
  title: string;
};

const healthFields: HealthField[] = [
  { key: "isPregnant", title: "임신 중" },
  { key: "isBreastfeeding", title: "수유 중" },
  { key: "isSmoking", title: "흡연" },
  { key: "isDrinking", title: "음주" },
  { key: "isChild", title: "소아" },
  { key: "isElderly", title: "고령자" },
];

const initialValues: Record<HealthFieldKey, boolean> = {
  isPregnant: false,
  isBreastfeeding: false,
  isSmoking: false,
  isDrinking: false,
  isChild: false,
  isElderly: false,
};

export function BasicHealthForm() {
  const theme = useTheme();
  const [values, setValues] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const loadHealthProfile = async () => {
      try {
        const profile = await fetchHealthProfile();
        setValues(profile);
      } catch (error) {
        const status =
          error instanceof Error && "status" in error
            ? (error as Error & { status?: number }).status
            : undefined;

        if (status !== 404) {
          setFeedbackMessage(
            error instanceof Error && error.message
              ? error.message
              : "기본 건강정보를 불러오지 못했어요.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadHealthProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMessage("");

    try {
      await saveHealthProfile(values as HealthProfilePayload);
      setFeedbackMessage("기본 건강정보를 저장했어요.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : "기본 건강정보를 저장하지 못했어요.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ThemedView type="backgroundElement" style={styles.feedbackCard}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            기본 건강정보를 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : (
        <>
          <ThemedView type="backgroundElement" style={styles.listCard}>
            {healthFields.map((field, index) => {
              const currentValue = values[field.key];

              return (
                <View key={field.key} style={styles.row}>
                  <View style={styles.rowContent}>
                    <View style={styles.labelBlock}>
                      <ThemedText style={styles.title}>
                        {field.title}
                      </ThemedText>
                    </View>

                    <View style={styles.actions}>
                      <SelectButton
                        label="예"
                        selected={currentValue}
                        onPress={() =>
                          setValues((prev) => ({ ...prev, [field.key]: true }))
                        }
                      />
                      <SelectButton
                        label="아니오"
                        selected={!currentValue}
                        onPress={() =>
                          setValues((prev) => ({ ...prev, [field.key]: false }))
                        }
                      />
                    </View>
                  </View>

                  {index < healthFields.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.backgroundSelected },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </ThemedView>

          {feedbackMessage ? (
            <ThemedText themeColor="textSecondary" style={styles.feedbackText}>
              {feedbackMessage}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={() => {
              void handleSave();
            }}
            disabled={isSaving}
            style={[
              styles.saveButton,
              { backgroundColor: theme.text, opacity: isSaving ? 0.7 : 1 },
            ]}
          >
            <ThemedText style={[styles.saveLabel, { color: theme.background }]}>
              {isSaving ? "저장 중..." : "저장"}
            </ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );
}

type SelectButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function SelectButton({ label, selected, onPress }: SelectButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.selectButton,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          borderColor: selected ? theme.text : theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.selectLabel,
          { color: selected ? theme.background : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  listCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  feedbackCard: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    minHeight: 72,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    justifyContent: "center",
    position: "relative",
  },
  labelBlock: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  selectButton: {
    minWidth: 72,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  divider: {
    position: "absolute",
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
