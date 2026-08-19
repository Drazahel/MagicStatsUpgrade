import { Image } from 'expo-image';
import { type ImageStyle, type StyleProp } from 'react-native';

const IMAGE_HEADERS = {
  Accept: 'image/jpeg,image/png,image/webp;q=0.8,*/*;q=0.5',
};

type CommanderImageProps = {
  uri: string;
  style: StyleProp<ImageStyle>;
};

export function CommanderImage({ uri, style }: CommanderImageProps) {
  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="contain"
      recyclingKey={uri}
      source={{ uri, headers: IMAGE_HEADERS }}
      style={style}
    />
  );
}
