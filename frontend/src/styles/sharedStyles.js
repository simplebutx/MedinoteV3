import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf2f0",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    color: "#176b87",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: "#1f2933",
    fontSize: 25,
    fontWeight: "800",
  },
  statusPill: {
    backgroundColor: "#ffffff",
    borderColor: "#bfccd0",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  online: {
    borderColor: "#8fb99b",
  },
  offline: {
    borderColor: "#e5a0a0",
  },
  checking: {
    borderColor: "#bfccd0",
  },
  statusText: {
    color: "#43515c",
    fontSize: 12,
    fontWeight: "700",
  },
  pageBody: {
    flex: 1,
  },
  sectionHeader: {
    borderBottomColor: "#e2e8e7",
    borderBottomWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    color: "#1f2933",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#66737d",
    fontSize: 13,
    marginTop: 3,
  },
  chatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#d7e0df",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  chatList: {
    gap: 10,
    padding: 14,
  },
  messageRow: {
    alignItems: "flex-start",
  },
  userMessageRow: {
    alignItems: "flex-end",
  },
  messageBubble: {
    backgroundColor: "#eef5f4",
    borderRadius: 8,
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#176b87",
  },
  messageText: {
    color: "#21343d",
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#ffffff",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  loadingText: {
    color: "#5a6872",
    fontSize: 13,
  },
  inputRow: {
    borderTopColor: "#e2e8e7",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  input: {
    borderColor: "#c8d4d4",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1f2933",
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#176b87",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: "#9aa8a9",
  },
  pressedButton: {
    opacity: 0.86,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  ocrCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e0df",
    borderRadius: 8,
    borderWidth: 1,
    paddingBottom: 14,
  },
  ocrActions: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  fileButton: {
    borderColor: "#a8b8b7",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  fileButtonText: {
    color: "#1f2933",
    fontSize: 14,
    fontWeight: "700",
  },
  ocrResult: {
    color: "#43515c",
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 14,
  },
  placeholderCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e0df",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  placeholderTitle: {
    color: "#1f2933",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderText: {
    color: "#66737d",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  bottomNav: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e0df",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 54,
  },
  activeTabButton: {
    backgroundColor: "#eef5f4",
  },
  pressedTab: {
    opacity: 0.75,
  },
  tabLabel: {
    color: "#7a878e",
    fontSize: 11,
    fontWeight: "700",
  },
  activeTabLabel: {
    color: "#176b87",
  },
});
