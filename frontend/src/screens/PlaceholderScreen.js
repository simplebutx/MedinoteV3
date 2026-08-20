import { Text, View } from "react-native";

import { styles } from "../styles/sharedStyles";

export function PlaceholderScreen({ title, description }) {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>{description}</Text>
    </View>
  );
}
