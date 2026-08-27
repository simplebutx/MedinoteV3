import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ChatbotFab } from './chatbot-fab';

type AppScreenProps = PropsWithChildren<{
  showChatbotFab?: boolean;
  showTopAlert?: boolean;
}>;

export function AppScreen({
  children,
  showChatbotFab = true,
}: AppScreenProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {children}
      {showChatbotFab && <ChatbotFab onPress={() => router.push('/chatbot')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
