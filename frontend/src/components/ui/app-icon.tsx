import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

type IoniconName = keyof typeof Ionicons.glyphMap;
type IoniconProps = ComponentProps<typeof Ionicons>;

type AppIconProps = Omit<IoniconProps, 'name'> & {
  name: IoniconName;
};

const sfSymbolByIoniconName: Partial<Record<IoniconName, SFSymbol>> = {
  add: 'plus',
  'add-outline': 'plus',
  'alert-circle-outline': 'exclamationmark.circle',
  'calendar-outline': 'calendar',
  camera: 'camera',
  'camera-outline': 'camera',
  checkmark: 'checkmark',
  'checkmark-circle-outline': 'checkmark.circle',
  'chatbubble-ellipses': 'bubble.left.and.bubble.right',
  'chevron-back': 'chevron.left',
  'chevron-down': 'chevron.down',
  'chevron-up': 'chevron.up',
  close: 'xmark',
  'create-outline': 'square.and.pencil',
  'document-text': 'doc.text',
  'document-text-outline': 'doc.text',
  images: 'photo.on.rectangle',
  'images-outline': 'photo.on.rectangle',
  'information-circle-outline': 'info.circle',
  notifications: 'bell',
  'notifications-outline': 'bell',
  person: 'person',
  'person-outline': 'person',
  remove: 'minus',
  search: 'magnifyingglass',
  'search-outline': 'magnifyingglass',
  send: 'paperplane.fill',
  sparkles: 'sparkles',
  'sparkles-outline': 'sparkles',
  'time-outline': 'clock',
  'trash-outline': 'trash',
  'warning-outline': 'exclamationmark.triangle',
};

export function AppIcon({ name, size = 24, color, style, ...props }: AppIconProps) {
  const sfSymbolName = sfSymbolByIoniconName[name];

  if (Platform.OS === 'ios' && sfSymbolName) {
    return (
      <SymbolView
        name={sfSymbolName}
        size={size}
        style={style as never}
        tintColor={color}
        type="monochrome"
      />
    );
  }

  return <Ionicons {...props} name={name} size={size} color={color} style={style} />;
}

AppIcon.glyphMap = Ionicons.glyphMap;
