import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor="transparent"
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>복약 일정</Label>
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label>약 검색</Label>
        <Icon
          sf={{
            default: "magnifyingglass",
            selected: "magnifyingglass",
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add">
        <Label>처방전 업로드</Label>
        <Icon sf={{ default: "camera", selected: "camera" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="prescription">
        <Label>내 처방전</Label>
        <Icon sf={{ default: "doc.text", selected: "doc.text" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mypage">
        <Label>마이페이지</Label>
        <Icon sf={{ default: "person", selected: "person" }} />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
