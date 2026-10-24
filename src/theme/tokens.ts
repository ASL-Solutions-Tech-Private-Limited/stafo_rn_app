/**
 * STAFO design tokens.
 *
 * Brand, from the app icon: an emerald-to-ocean arc on deep slate. Actions use
 * ocean teal; headers use the emerald-to-ocean gradient; dark mode sits on the
 * icon's slate. Every semantic colour ships with a "soft" tint for badges,
 * icon wells and banners.
 */

const palette = {
  // Brand: the icon's arc runs emerald → ocean.
  emerald500: '#10B070',
  emerald700: '#0C8A58',
  ocean50: '#E2F3F4',
  ocean100: '#C6E7EA',
  ocean400: '#2BB8A6',
  ocean500: '#1596B0',
  ocean600: '#0E7A9F',
  ocean700: '#0A5E7B',
  blue600: '#1574B3',
  blue800: '#12588A',

  // Neutrals: a touch of the icon's slate blue-green.
  slate0: '#FFFFFF',
  slate25: '#F9FBFB',
  slate50: '#F4F7F8',
  slate100: '#E7EDF0',
  slate200: '#DCE4E8',
  slate300: '#C1CDD3',
  slate400: '#8796A0',
  slate500: '#5B6B76',
  slate600: '#465560',
  slate700: '#2C4050',
  slate800: '#1E3242',
  slate850: '#172A38',
  slate900: '#122230',
  slate950: '#0B1620',

  green500: '#3DD68C',
  green600: '#0E9F5E',
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

  primary: palette.ocean600,
  primaryPressed: palette.ocean700,
  primarySoft: palette.ocean50,
  primaryAccent: palette.emerald500,

  success: palette.green600,
  successSoft: '#E4F6EC',
  warning: palette.amber600,
  warningSoft: '#FEF5E4',
  danger: palette.red600,
  dangerSoft: '#FEECEA',
  info: palette.blue600,
  infoSoft: '#E3F1FA',

  overlay: 'rgba(11, 22, 32, 0.45)',
  skeleton: palette.slate100,
  heroFrom: palette.emerald500,
  heroTo: palette.blue600,

  accents: [
    {fg: palette.ocean600, bg: palette.ocean50},
    {fg: palette.violet500, bg: '#F1ECFE'},
    {fg: palette.green600, bg: '#E4F6EC'},
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

  text: '#EAF2F5',
  textMuted: palette.slate400,
  textSubtle: palette.slate500,
  // Light teal buttons take dark text in dark mode.
  textOnPrimary: '#06211E',

  primary: palette.ocean400,
  primaryPressed: '#4CCDBB',
  primarySoft: 'rgba(43, 184, 166, 0.16)',
  primaryAccent: palette.emerald500,

  success: palette.green500,
  successSoft: 'rgba(18, 183, 106, 0.16)',
  warning: '#FDB022',
  warningSoft: 'rgba(245, 165, 36, 0.16)',
  danger: '#F97066',
  dangerSoft: 'rgba(240, 68, 56, 0.16)',
  info: '#4FB3E8',
  infoSoft: 'rgba(21, 116, 179, 0.2)',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: palette.slate800,
  heroFrom: palette.emerald700,
  heroTo: palette.blue800,

  accents: [
    {fg: palette.ocean400, bg: 'rgba(43, 184, 166, 0.16)'},
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
    shadowColor: '#0B2A33',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B2A33',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
