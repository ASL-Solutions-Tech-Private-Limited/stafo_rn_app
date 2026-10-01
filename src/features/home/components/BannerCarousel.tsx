import React, {useEffect, useRef, useState} from 'react';
import {FlatList, Image, useWindowDimensions, View} from 'react-native';
import type {Banner} from '../../../api/endpoints/dashboard';
import {useTheme} from '../../../theme/ThemeProvider';

const AUTO_ADVANCE_MS = 5000;

export function BannerCarousel({banners}: {banners: Banner[]}) {
  const {colors, spacing, radius} = useTheme();
  const {width} = useWindowDimensions();
  const itemWidth = width - spacing.lg * 2;
  const [index, setIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(2.4);
  const listRef = useRef<FlatList<Banner>>(null);

  // Size the carousel from the first banner's real proportions so artwork isn't cropped.
  const firstUri = banners[0]?.imageUrl;
  useEffect(() => {
    if (!firstUri) {
      return;
    }
    Image.getSize(
      firstUri,
      (w, h) => {
        if (w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
      },
      () => {},
    );
  }, [firstUri]);

  useEffect(() => {
    if (banners.length < 2) {
      return;
    }
    const t = setInterval(() => {
      const next = (index + 1) % banners.length;
      listRef.current?.scrollToOffset({offset: next * (itemWidth + spacing.md), animated: true});
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [index, banners.length, itemWidth, spacing.md]);

  if (!banners.length) {
    return null;
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        keyExtractor={b => String(b.id)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.md}}
        onMomentumScrollEnd={e =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (itemWidth + spacing.md)))
        }
        renderItem={({item}) => (
          <Image
            source={{uri: item.imageUrl}}
            accessibilityLabel={item.title ?? 'Announcement'}
            style={{
              width: itemWidth,
              aspectRatio,
              borderRadius: radius.xl,
              backgroundColor: colors.skeleton,
            }}
            resizeMode="cover"
          />
        )}
      />
      {banners.length > 1 && (
        <View style={{flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.md}}>
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? colors.primary : colors.borderStrong,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
