import {useWindowDimensions} from 'react-native';

/** A screen whose short side is at least this wide (dp) is a tablet: iPads and Android sw600dp. */
export const TABLET_MIN_SIDE = 600;
/** Reading width for single-column screens on a tablet. */
export const CONTENT_MAX_WIDTH = 720;
/** Width of a sheet shown as a centred dialog on a tablet. */
export const DIALOG_WIDTH = 520;
/** The list column of a list + detail screen. */
export const LIST_PANE_WIDTH = 380;

export function useLayout() {
  const {width, height} = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN_SIDE;
  return {
    width,
    height,
    isTablet,
    landscape: width > height,
    /** Wide enough for two columns side by side. */
    wide: isTablet && width >= 900,
  };
}

/** Style for a screen's content on a tablet: a centred reading column. Null on phones. */
export function useColumn() {
  const {isTablet} = useLayout();
  return isTablet ? ({width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center'} as const) : null;
}
