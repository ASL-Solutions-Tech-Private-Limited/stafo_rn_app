import {
  Building2,
  Car,
  CreditCard,
  Droplets,
  Flame,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Phone,
  PiggyBank,
  ReceiptIndianRupee,
  Repeat,
  ShieldPlus,
  Smartphone,
  Stethoscope,
  Tv,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

// The server's category icons (public/uploads/bbps_category) are missing, so the app draws its own.
const ICONS: [RegExp, LucideIcon][] = [
  [/mobile/i, Smartphone],
  [/electric/i, Zap],
  [/dth|cable/i, Tv],
  [/water/i, Droplets],
  [/gas/i, Flame],
  [/fastag/i, Car],
  [/loan/i, Landmark],
  [/health/i, HeartPulse],
  [/insurance/i, ShieldPlus],
  [/broadband/i, Wifi],
  [/landline/i, Phone],
  [/credit card/i, CreditCard],
  [/education/i, GraduationCap],
  [/hospital/i, Stethoscope],
  [/municipal/i, Building2],
  [/housing/i, House],
  [/subscription/i, Repeat],
  [/deposit/i, PiggyBank],
  [/club/i, Users],
];

export const categoryIcon = (name: string): LucideIcon =>
  ICONS.find(([re]) => re.test(name))?.[1] ?? ReceiptIndianRupee;

/** Same colour for a category every time. */
export function categoryTint<T>(name: string, accents: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 1_000_003;
  }
  return accents[Math.abs(h) % accents.length];
}
