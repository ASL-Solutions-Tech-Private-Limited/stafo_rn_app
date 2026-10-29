import React from 'react';
import {View} from 'react-native';
import {useLayout} from '../../lib/layout';

/**
 * A main column and a side column next to each other on a wide tablet;
 * on phones (and narrow tablets) the side column simply follows the main one.
 */
export function Columns({main, side}: {main: React.ReactNode; side: React.ReactNode}) {
  const {wide} = useLayout();
  if (!wide) {
    return (
      <>
        {main}
        {side}
      </>
    );
  }
  return (
    <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
      <View style={{flex: 3, minWidth: 0}}>{main}</View>
      <View style={{flex: 2, minWidth: 0}}>{side}</View>
    </View>
  );
}
