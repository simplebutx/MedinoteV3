import { Text, View } from "react-native";

import { styles } from "../styles/sharedStyles";

export function AppHeader({ pageTitle, serverStatus, statusText }) {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Medinote AI</Text>
        <Text style={styles.title}>{pageTitle}</Text>
      </View>
      <View style={[styles.statusPill, styles[serverStatus]]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}
