import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ThemedText } from "../ui/themed-text";
import { ThemedView } from "../ui/themed-view";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export type CalendarMarkedDate = {
  dateKey: string;
  count: number;
};

type CalendarProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates?: CalendarMarkedDate[];
};

type CalendarCell = {
  key: string;
  date?: Date;
  isCurrentMonth?: boolean;
  isToday?: boolean;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildMonthDates(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstGridDate = new Date(firstDay);
  firstGridDate.setDate(firstDay.getDate() - firstDay.getDay());

  const today = new Date();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(firstGridDate);
    cellDate.setDate(firstGridDate.getDate() + index);

    cells.push({
      key: toDateKey(cellDate),
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
      isToday:
        cellDate.getFullYear() === today.getFullYear() &&
        cellDate.getMonth() === today.getMonth() &&
        cellDate.getDate() === today.getDate(),
    });
  }

  return cells;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function Calender({
  selectedDate,
  onSelectDate,
  markedDates = [],
}: CalendarProps) {
  const theme = useTheme();
  const [displayedMonth, setDisplayedMonth] = useState(
    getMonthStart(selectedDate),
  );

  useEffect(() => {
    setDisplayedMonth(getMonthStart(selectedDate));
  }, [selectedDate]);

  const monthLabel = `${displayedMonth.getFullYear()}년 ${displayedMonth.getMonth() + 1}월`;
  const selectedDateKey = toDateKey(selectedDate);
  const cells = buildMonthDates(displayedMonth);
  const markedDateMap = new Map(
    markedDates.map((item) => [item.dateKey, item.count]),
  );

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <ThemedText type="smallBold">{monthLabel}</ThemedText>
        </View>

        <View style={styles.monthButtonRow}>
          <Pressable
            onPress={() =>
              setDisplayedMonth(
                new Date(
                  displayedMonth.getFullYear(),
                  displayedMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            style={[
              styles.monthButton,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText style={styles.monthButtonLabel}>{"<"}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() =>
              setDisplayedMonth(
                new Date(
                  displayedMonth.getFullYear(),
                  displayedMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            style={[
              styles.monthButton,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText style={styles.monthButtonLabel}>{">"}</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={styles.weekdayCell}>
            <ThemedText type="small" themeColor="textSecondary">
              {weekday}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (!cell.date) {
            return <View key={cell.key} style={styles.dayCell} />;
          }

          const dateKey = toDateKey(cell.date);
          const isSelected = dateKey === selectedDateKey;
          const markCount = markedDateMap.get(dateKey) ?? 0;

          return (
            <View key={cell.key} style={styles.dayCell}>
              <Pressable
                onPress={() => onSelectDate(cell.date!)}
                style={[
                  styles.dayButton,
                  isSelected && { backgroundColor: theme.text },
                  !isSelected &&
                    cell.isToday && {
                      backgroundColor: theme.backgroundSelected,
                    },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: isSelected
                      ? theme.background
                      : cell.isCurrentMonth
                        ? theme.text
                        : theme.textSecondary,
                  }}
                >
                  {cell.date.getDate()}
                </ThemedText>
              </Pressable>

              <View style={styles.markerRow}>
                {markCount > 0 ? (
                  <View
                    style={[
                      styles.markerDot,
                      {
                        backgroundColor: isSelected
                          ? theme.text
                          : theme.textSecondary,
                      },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  monthButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  monthButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonLabel: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 4,
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  markerRow: {
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  markerDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
});
