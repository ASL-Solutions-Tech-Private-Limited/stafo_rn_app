/**
 * STAFO design tokens.
 *
 * Brand: a confident royal blue with an indigo accent. Neutrals are cool
 * slate so the blue reads as the single source of emphasis. Every semantic
 * colour ships with a "soft" tint for badges, icon wells and banners.
 */

const palette = {
  blue50: '#EEF2FF',
  blue100: '#DCE4FF',
  blue200: '#B9C8FF',
  blue400: '#6F8BFF',
  blue500: '#4A6BFF',
  blue600: '#2F54EB',
  blue700: '#2140C4',
  blue900: '#111F66',
  indigo500: '#6C4DFF',

  slate0: '#FFFFFF',
  slate25: '#FAFBFD',
  slate50: '#F4F6FA',
  slate100: '#EBEEF4',
  slate200: '#DDE2EC',
  slate300: '#C3CAD8',
  slate400: '#97A0B3',
  slate500: '#687288',
  slate600: '#4B5468',
  slate700: '#343B4D',
  slate800: '#1E2433',
  slate850: '#171C28',
  slate900: '#10141E',
  slate950: '#0A0D14',

  green500: '#12B76A',
  green600: '#039855',
  amber500: '#F5A524',
  amber600: '#DC8A06',
  red500: '#F04438',
  red600: '#D92D20',
  sky500: '#0BA5EC',
  violet500: '#8B5CF6',
  pink500: '#EC4899',
  teal500: '#14B8A6',
} as const;

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryAccent: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  overlay: string;
  skeleton: string;
  heroFrom: string;
  heroTo: string;

  /** Rotating accent colours for module tiles and avatars. */
  accents: readonly {fg: string; bg: string}[];
};

export const lightColors: ColorTokens = {
  background: palette.slate50,
  surface: palette.slate0,
  surfaceMuted: palette.slate25,
  surfaceRaised: palette.slate0,
  border: palette.slate100,
  borderStrong: palette.slate200,

  text: palette.slate900,
  textMuted: palette.slate500,
  textSubtle: palette.slate400,
  textOnPrimary: palette.slate0,

  primary: palette.blue600,
  primaryPressed: palette.blue700,
  primarySoft: palette.blue50,
  primaryAccent: palette.indigo500,

  success: palette.green600,
  successSoft: '#E6F7EE',
  warning: palette.amber600,
  warningSoft: '#FEF5E4',
  danger: palette.red600,
  dangerSoft: '#FEECEA',
  info: palette.sky500,
  infoSoft: '#E6F6FE',

  overlay: 'rgba(10, 13, 20, 0.45)',
  skeleton: palette.slate100,
  heroFrom: palette.blue600,
  heroTo: palette.indigo500,

  accents: [
    {fg: palette.blue600, bg: palette.blue50},
    {fg: palette.violet500, bg: '#F1ECFE'},
    {fg: palette.green600, bg: '#E6F7EE'},
    {fg: palette.amber600, bg: '#FEF5E4'},
    {fg: palette.pink500, bg: '#FDEBF4'},
    {fg: palette.teal500, bg: '#E3F8F5'},
    {fg: palette.sky500, bg: '#E6F6FE'},
    {fg: palette.red500, bg: '#FEECEA'},
  ],
};

export const darkColors: ColorTokens = {
  background: palette.slate950,
  surface: palette.slate900,
  surfaceMuted: palette.slate850,
  surfaceRaised: palette.slate800,
  border: palette.slate800,
  borderStrong: palette.slate700,

  text: '#F3F5FA',
  textMuted: palette.slate400,
  textSubtle: palette.slate500,
  textOnPrimary: palette.slate0,

  primary: palette.blue500,
  primaryPressed: palette.blue400,
  primarySoft: 'rgba(74, 107, 255, 0.16)',
  primaryAccent: palette.indigo500,

  success: '#32D583',
  successSoft: 'rgba(18, 183, 106, 0.16)',
  warning: '#FDB022',
  warningSoft: 'rgba(245, 165, 36, 0.16)',
  danger: '#F97066',
  dangerSoft: 'rgba(240, 68, 56, 0.16)',
  info: '#36BFFA',
  infoSoft: 'rgba(11, 165, 236, 0.16)',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: palette.slate800,
  heroFrom: palette.blue700,
  heroTo: '#4B2FD6',

  accents: [
    {fg: palette.blue400, bg: 'rgba(74, 107, 255, 0.16)'},
    {fg: '#A78BFA', bg: 'rgba(139, 92, 246, 0.16)'},
    {fg: '#32D583', bg: 'rgba(18, 183, 106, 0.16)'},
    {fg: '#FDB022', bg: 'rgba(245, 165, 36, 0.16)'},
    {fg: '#F472B6', bg: 'rgba(236, 72, 153, 0.16)'},
    {fg: '#2DD4BF', bg: 'rgba(20, 184, 166, 0.16)'},
    {fg: '#36BFFA', bg: 'rgba(11, 165, 236, 0.16)'},
    {fg: '#F97066', bg: 'rgba(240, 68, 56, 0.16)'},
  ],
};

export const fonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
} as const;

export const typography = {
  display: {fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 38, letterSpacing: -0.6},
  h1: {fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.4},
  h2: {fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2},
  h3: {fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1},
  title: {fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22},
  body: {fontFamily: fonts.medium, fontSize: 14, lineHeight: 21},
  bodyRegular: {fontFamily: fonts.regular, fontSize: 14, lineHeight: 21},
  label: {fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18},
  caption: {fontFamily: fonts.medium, fontSize: 12, lineHeight: 16},
  overline: {fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8},
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1B2559',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: '#1B2559',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
