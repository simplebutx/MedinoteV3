import { Image, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { MedicineSearchResponse } from "@/services/medicine-api";

import { ThemedText } from "../ui/themed-text";
import { ThemedView } from "../ui/themed-view";

type MedicineSearchResultCardProps = {
  result: MedicineSearchResponse;
};

type FieldRowProps = {
  label: string;
  value: string | number | null | undefined;
};

function FieldRow({ label, value }: FieldRowProps) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <View style={styles.fieldRow}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.fieldValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export function MedicineSearchResultCard({
  result,
}: MedicineSearchResultCardProps) {
  const cautionText = [result.warningBeforeUse, result.caution]
    .filter(Boolean)
    .join('\n\n');

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={styles.title}>{result.itemName}</ThemedText>
          {result.companyName ? (
            <ThemedText themeColor="textSecondary" style={styles.company}>
              {result.companyName}
            </ThemedText>
          ) : null}
        </View>

        {result.imageUrl ? (
          <Image source={{ uri: result.imageUrl }} style={styles.image} />
        ) : null}
      </View>

      <FieldRow label="효과" value={result.efficacy} />
      <FieldRow label="사용법" value={result.useMethod} />
      <FieldRow label="주의사항" value={cautionText} />
      <FieldRow label="상호작용" value={result.interaction} />
      <FieldRow label="부작용" value={result.sideEffect} />
      <FieldRow label="보관법" value={result.storageMethod} />

      {result.ingredients.length > 0 ? (
        <View style={styles.fieldRow}>
          <ThemedText type="smallBold" style={styles.fieldLabel}>
            성분
          </ThemedText>
          <View style={styles.ingredientList}>
            {result.ingredients.map((ingredient) => {
              const amount = [ingredient.quantity, ingredient.unit]
                .filter(Boolean)
                .join(' ');

              return (
                <View
                  key={`${ingredient.itemSeq}-${ingredient.ingredientSeq}`}
                  style={styles.ingredientRow}
                >
                  <ThemedText style={styles.ingredientName}>
                    {ingredient.ingredientName ?? ingredient.ingredientCode}
                  </ThemedText>
                  {amount ? (
                    <ThemedText themeColor="textSecondary" style={styles.ingredientMeta}>
                      {amount}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "700",
  },
  company: {
    fontSize: 11,
    lineHeight: 15,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 16,
    resizeMode: "contain",
    backgroundColor: "#FFFFFF",
  },
  sequencePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fieldRow: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 23,
  },
  ingredientList: {
    gap: Spacing.one,
  },
  ingredientRow: {
    gap: 2,
  },
  ingredientName: {
    fontSize: 15,
    lineHeight: 21,
  },
  ingredientMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
});
