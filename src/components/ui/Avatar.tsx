import React, {useState} from 'react';
import {Image, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {Text} from './Text';

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  ring?: string;
  style?: StyleProp<ViewStyle>;
};

export {initialsOf} from '../../lib/initials';
import {initialsOf} from '../../lib/initials';

/** Picks a stable accent colour from the name so each person keeps theirs. */
function accentIndex(name: string, count: number) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

export function Avatar({name, uri, size = 44, ring, style}: Props) {
  const {colors} = useTheme();
  const [failed, setFailed] = useState(false);
  const accent = colors.accents[accentIndex(name ?? '?', colors.accents.length)];
  const showImage = !!uri && !failed;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        ring && {borderWidth: 2, borderColor: ring},
        style,
      ]}
      accessibilityLabel={name ?? undefined}>
      {showImage ? (
        <Image source={{uri}} style={{width: '100%', height: '100%'}} onError={() => setFailed(true)} />
      ) : (
        <Text
          variant="label"
          color={accent.fg}
          style={{fontSize: Math.max(11, size * 0.36), lineHeight: size * 0.5}}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
