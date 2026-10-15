import React, {useEffect, useState} from 'react';
import {Linking, Share, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Gift,
  Mail,
  Phone,
  Share2,
  Star,
  Upload,
  Users,
} from 'lucide-react-native';
import {COMPANY_DOCUMENTS} from '../../../api/endpoints/account';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Skeleton,
  Text,
  TextField,
  toast,
} from '../../../components/ui';
import {formatDay, parseServerDate} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import type {AppScreenProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {useCompanyProfile} from '../../home/queries';
import {ChoiceChips, FormSection, IconWell, SetupScreen} from '../../setup/parts';
import {SALES} from '../../subscription/SubscriptionScreen';
import {pickFiles} from '../../tasks/pickFiles';
import {takePhoto} from '../../trips/queries';
import {companyErrors, maskAccount} from '../accountLogic';
import {
  useCompanyDetails,
  useMyDocuments,
  useReferrals,
  useSendFeedback,
  useUpdateCompany,
  useUploadCompanyDocument,
  useUploadLogo,
} from '../accountQueries';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.stafo.app';
const open = (url: string, what: string) =>
  Linking.openURL(url).catch(() => toast.error(`Couldn’t open ${what}.`));

/** Edit the company's details, as the old app did through company/update. */
export function CompanyProfileEditScreen({navigation}: AppScreenProps<'CompanyProfileEdit'>) {
  const {spacing} = useTheme();
  const details = useCompanyDetails();
  const logoQuery = useCompanyProfile();
  const save = useUpdateCompany();
  const uploadLogo = useUploadLogo();
  const c = details.data?.company;
  const [f, setF] = useState({
    company_name: '',
    email: '',
    registration_number: '',
    gst_number: '',
    pan_number: '',
    address: '',
    pin: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  // The saved account number shows masked until they choose to change it.
  const [editAccount, setEditAccount] = useState(false);

  useEffect(() => {
    if (c && !loaded) {
      setF({
        company_name: c.company_name ?? '',
        email: c.email ?? '',
        registration_number: c.registration_number ?? '',
        gst_number: c.gst_number ?? '',
        pan_number: c.pan_number ?? '',
        address: c.address ?? '',
        pin: c.pin ?? '',
        bank_name: c.bank_name ?? '',
        account_number: c.account_number ?? '',
        ifsc_code: c.ifsc_code ?? '',
      });
      setEditAccount(!c.account_number);
      setLoaded(true);
    }
  }, [c, loaded]);

  const errors = companyErrors(f);
  const err = (k: string) => (tried ? errors[k] ?? null : null);
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({...p, [k]: v}));

  const changeLogo = async () => {
    const p = await takePhoto('company-logo');
    if (p) {
      uploadLogo.mutate(p);
    }
  };

  return (
    <SetupScreen title="Company profile" subtitle="Shown on payslips and invoices" query={details}>
      {c ? (
        <View style={{gap: spacing.lg}}>
          <Card style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <Avatar name={c.company_name} uri={logoQuery.data?.data?.company_logo} size={56} />
            <View style={{flex: 1}}>
              <Text variant="title" numberOfLines={2}>
                {c.company_name}
              </Text>
              {c.company_code ? (
                <Text variant="caption" tone="muted">
                  Code {c.company_code}
                </Text>
              ) : null}
            </View>
            <Button
              title="Logo"
              icon={Camera}
              variant="ghost"
              size="sm"
              fullWidth={false}
              loading={uploadLogo.isPending}
              onPress={changeLogo}
            />
          </Card>

          <FormSection title="BUSINESS">
            <TextField
              label="Company name"
              value={f.company_name}
              onChangeText={set('company_name')}
              error={err('company_name')}
            />
            <TextField
              label="Email"
              value={f.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={err('email')}
            />
            <TextField
              label="GSTIN"
              value={f.gst_number}
              onChangeText={set('gst_number')}
              autoCapitalize="characters"
              maxLength={15}
              placeholder="Optional"
              error={err('gst_number')}
            />
            <TextField
              label="PAN"
              value={f.pan_number}
              onChangeText={set('pan_number')}
              autoCapitalize="characters"
              maxLength={10}
              placeholder="Optional"
              error={err('pan_number')}
            />
            <TextField
              label="Registration number"
              value={f.registration_number}
              onChangeText={set('registration_number')}
              autoCapitalize="characters"
              placeholder="Optional"
            />
          </FormSection>

          <FormSection title="ADDRESS">
            <TextField label="Address" value={f.address} onChangeText={set('address')} multiline />
            <TextField
              label="PIN code"
              value={f.pin}
              onChangeText={set('pin')}
              keyboardType="number-pad"
              maxLength={6}
              error={err('pin')}
            />
            <Text variant="caption" tone="muted">
              City and state:{' '}
              {[details.data?.cityName, details.data?.stateName].filter(Boolean).join(', ') || 'not set'}. Ask
              STAFO support to change them.
            </Text>
          </FormSection>

          <FormSection title="BANK (FOR SALARIES)">
            <TextField
              label="Bank name"
              value={f.bank_name}
              onChangeText={set('bank_name')}
              placeholder="Optional"
            />
            {editAccount ? (
              <TextField
                label="Account number"
                value={f.account_number}
                onChangeText={set('account_number')}
                keyboardType="number-pad"
                maxLength={18}
                placeholder="Optional"
                error={err('account_number')}
              />
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <View>
                  <Text variant="label">Account number</Text>
                  <Text variant="body">{maskAccount(f.account_number)}</Text>
                </View>
                <Button
                  title="Change"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setEditAccount(true)}
                />
              </View>
            )}
            <TextField
              label="IFSC"
              value={f.ifsc_code}
              onChangeText={set('ifsc_code')}
              autoCapitalize="characters"
              maxLength={11}
              placeholder="Optional"
              error={err('ifsc_code')}
            />
          </FormSection>

          <Button
            title="Save changes"
            icon={Check}
            loading={save.isPending}
            disabled={!loaded}
            onPress={() => {
              setTried(true);
              if (Object.keys(errors).length) {
                haptics.error();
                return;
              }
              save.mutate({current: c, edit: f}, {onSuccess: () => navigation.goBack()});
            }}
          />
        </View>
      ) : null}
    </SetupScreen>
  );
}

/** Upload the company's documents (the server keeps no list to show back). */
export function CompanyDocumentsScreen(_: AppScreenProps<'CompanyDocuments'>) {
  const {colors, spacing} = useTheme();
  const upload = useUploadCompanyDocument();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, string>>({});

  const add = async (typeId: number, source: 'camera' | 'file') => {
    const file = source === 'camera' ? await takePhoto(`company-doc-${typeId}`) : (await pickFiles())[0];
    if (!file) {
      return;
    }
    setBusy(typeId);
    upload.mutate(
      {typeId, file},
      {
        onSuccess: () => setDone(d => ({...d, [typeId]: file.name})),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <SetupScreen title="Company documents" subtitle="Sent to STAFO for verification">
      <View style={{gap: spacing.md}}>
        {COMPANY_DOCUMENTS.map(d => (
          <Card key={d.id} style={{gap: spacing.sm}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
              <IconWell
                icon={done[d.id] ? Check : FileText}
                fg={done[d.id] ? colors.success : colors.primary}
                bg={done[d.id] ? colors.successSoft : colors.primarySoft}
              />
              <View style={{flex: 1}}>
                <Text variant="title">{d.name}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {done[d.id] ? `Uploaded ${done[d.id]}` : 'Photo or PDF'}
                </Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Button
                title="Photo"
                icon={Camera}
                variant="ghost"
                size="sm"
                style={{flex: 1}}
                disabled={busy != null}
                loading={busy === d.id}
                onPress={() => add(d.id, 'camera')}
              />
              <Button
                title="File"
                icon={Upload}
                variant="ghost"
                size="sm"
                style={{flex: 1}}
                disabled={busy != null}
                onPress={() => add(d.id, 'file')}
              />
            </View>
          </Card>
        ))}
        <Text variant="caption" tone="muted">
          The server doesn’t send back which documents are already on file, so uploading one again replaces
          it.
        </Text>
      </View>
    </SetupScreen>
  );
}

/** An employee's own documents, kept by their company (read-only). */
export function MyDocumentsScreen(_: AppScreenProps<'MyDocuments'>) {
  const {colors, spacing} = useTheme();
  const docs = useMyDocuments();
  const list = docs.data ?? [];
  return (
    <SetupScreen title="My documents" subtitle="Kept by your company" query={docs}>
      {list.length ? (
        <Card padded={false}>
          {list.map((d, i) => {
            const at = parseServerDate(d.created_at);
            return (
              <PressableScale
                key={d.id}
                disabled={!d.file_path}
                onPress={() => d.file_path && open(d.file_path, 'the document')}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <IconWell icon={FileText} fg={colors.primary} bg={colors.primarySoft} />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title" numberOfLines={1}>
                    {d.document_type?.document_name ?? d.document_name ?? 'Document'}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {at ? `Added ${formatDay(at)} ${at.getFullYear()}` : 'Added by your company'}
                  </Text>
                </View>
                {d.file_path ? (
                  <Text variant="label" tone="primary">
                    Open
                  </Text>
                ) : null}
              </PressableScale>
            );
          })}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={FileText}
            title="No documents yet"
            message="Documents your company keeps for you, like your offer letter or ID, show here."
          />
        </Card>
      )}
    </SetupScreen>
  );
}

const FAQ = [
  {
    q: 'Why can’t I punch in?',
    a: 'Geo punch-in works only inside your branch’s circle; check location is on and you’re at the office. Selfie and QR punch-ins also need you near the branch. If it still fails, your admin can check your attendance mode.',
  },
  {
    q: 'I changed my phone',
    a: 'Sign in on the new phone with your mobile number. Your company gets a request to allow the new phone; once they approve, you can use it, and the old phone is signed out.',
  },
  {
    q: 'Where’s my payslip?',
    a: 'Payslips appear under Apps → Payslips after your company runs payroll for the month.',
  },
  {
    q: 'I’m not getting notifications',
    a: 'Allow notifications for STAFO in your phone’s Settings, then sign out and back in once so the app is registered for them.',
  },
];

export function HelpSupportScreen(_: AppScreenProps<'HelpSupport'>) {
  const {colors, spacing} = useTheme();
  const [openQ, setOpenQ] = useState<number | null>(null);
  return (
    <SetupScreen title="Help & support">
      <View style={{gap: spacing.md}}>
        <Card style={{gap: spacing.sm}}>
          <Text variant="title">Talk to us</Text>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              title="Call"
              icon={Phone}
              size="sm"
              style={{flex: 1}}
              onPress={() => open(`tel:${SALES.phone}`, 'the dialer')}
            />
            <Button
              title="Email"
              icon={Mail}
              variant="secondary"
              size="sm"
              style={{flex: 1}}
              onPress={() =>
                open(`mailto:${SALES.email}?subject=${encodeURIComponent('STAFO app help')}`, 'email')
              }
            />
          </View>
          <Text variant="caption" tone="subtle" selectable>
            {SALES.email} · {SALES.phoneLabel}
          </Text>
        </Card>
        <Text variant="overline" tone="muted">
          COMMON QUESTIONS
        </Text>
        <Card padded={false}>
          {FAQ.map((f, i) => {
            const on = openQ === i;
            return (
              <PressableScale
                key={f.q}
                onPress={() => setOpenQ(on ? null : i)}
                accessibilityRole="button"
                accessibilityState={{expanded: on}}
                style={{
                  padding: spacing.lg,
                  gap: spacing.sm,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
                  <Text variant="title" style={{flex: 1}}>
                    {f.q}
                  </Text>
                  {on ? (
                    <ChevronUp size={18} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={colors.textMuted} />
                  )}
                </View>
                {on ? (
                  <Text variant="body" tone="muted">
                    {f.a}
                  </Text>
                ) : null}
              </PressableScale>
            );
          })}
        </Card>
        <Card padded={false}>
          {[
            {label: 'About STAFO', url: 'https://stafo.in/about-us'},
            {label: 'Privacy policy', url: 'https://stafo.in/privacy-policy'},
          ].map((l, i) => (
            <PressableScale
              key={l.label}
              onPress={() => open(l.url, 'the page')}
              accessibilityRole="link"
              style={{padding: spacing.lg, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border}}>
              <Text variant="title" tone="primary">
                {l.label}
              </Text>
            </PressableScale>
          ))}
        </Card>
        <Text variant="caption" tone="subtle" align="center">
          STAFO {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
        </Text>
      </View>
    </SetupScreen>
  );
}

const KINDS = ['Suggestion', 'Something’s broken', 'Praise'] as const;
const RATING_WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Great'];

export function FeedbackScreen({navigation}: AppScreenProps<'Feedback'>) {
  const {colors, spacing} = useTheme();
  const send = useSendFeedback();
  const [rating, setRating] = useState(0);
  const [kind, setKind] = useState<string>(KINDS[0]);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const error = !text.trim() ? 'Tell us a little more.' : null;
  return (
    <SetupScreen title="Send feedback">
      <View style={{gap: spacing.lg}}>
        <Card style={{alignItems: 'center', gap: spacing.sm}}>
          <Text variant="title">How’s STAFO working for you?</Text>
          <View style={{flexDirection: 'row', gap: spacing.sm}} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map(n => (
              <PressableScale
                key={n}
                onPress={() => {
                  haptics.select();
                  setRating(n);
                }}
                accessibilityRole="radio"
                accessibilityState={{checked: rating === n}}
                accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                hitSlop={6}>
                <Star
                  size={30}
                  color={n <= rating ? '#FDB022' : colors.borderStrong}
                  fill={n <= rating ? '#FDB022' : 'transparent'}
                />
              </PressableScale>
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {RATING_WORDS[rating] || 'Tap a star'}
          </Text>
        </Card>
        <ChoiceChips
          items={KINDS.map(k => ({value: k as string, label: k}))}
          value={kind}
          onChange={setKind}
        />
        <TextField
          label="Tell us more"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          placeholder="What would make STAFO better for you?"
          error={tried ? error : null}
        />
        <Button
          title="Send"
          icon={Check}
          loading={send.isPending}
          onPress={() => {
            setTried(true);
            if (error) {
              haptics.error();
              return;
            }
            // The server takes one message, so rating and type go in front of it.
            const head = [rating ? `${rating}/5` : null, kind].filter(Boolean).join(' · ');
            send.mutate(`[${head}] ${text.trim()} (app ${DeviceInfo.getVersion()})`, {
              onSuccess: () => navigation.goBack(),
            });
          }}
        />
        <Text variant="caption" tone="muted" align="center">
          Goes to the STAFO team with your app version.
        </Text>
      </View>
    </SetupScreen>
  );
}

export function ReferScreen(_: AppScreenProps<'Refer'>) {
  const {colors, spacing, radius} = useTheme();
  const refs = useReferrals();
  const companyName = useSession(s => s.company?.company_name ?? s.employee?.name);
  const list = refs.data?.list ?? [];
  const share = () => {
    haptics.tap();
    const code = refs.data?.code ? ` Use referral code ${refs.data.code} when you sign up.` : '';
    Share.share({
      message: `${
        companyName ? `${companyName} uses` : 'We use'
      } STAFO for attendance, payroll and field teams. Try it: ${PLAY_STORE}${code}`,
    }).catch(() => {});
  };
  return (
    <SetupScreen title="Refer STAFO" query={refs}>
      <View style={{gap: spacing.md}}>
        <View
          style={{
            borderRadius: radius.xl,
            padding: spacing.lg,
            gap: spacing.sm,
            backgroundColor: colors.heroFrom,
          }}>
          <Gift size={26} color="#FFFFFF" />
          <Text variant="h3" color="#FFFFFF">
            Know a business that needs attendance and payroll?
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            Share STAFO with them.
            {refs.data?.code ? ` Your code: ${refs.data.code}` : ''}
          </Text>
          <Button
            title="Share invite"
            icon={Share2}
            variant="inverse"
            style={{marginTop: spacing.sm}}
            onPress={share}
          />
        </View>
        <Text variant="overline" tone="muted">
          PEOPLE YOU REFERRED · {list.length}
        </Text>
        {list.length ? (
          <Card padded={false}>
            {list.map((r, i) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <Avatar name={r.company_name} size={36} />
                <View style={{flex: 1}}>
                  <Text variant="title">{r.company_name}</Text>
                  {r.company_code ? (
                    <Text variant="caption" tone="muted">
                      {r.company_code}
                    </Text>
                  ) : null}
                </View>
                <Badge label="Joined" tone="success" dot />
              </View>
            ))}
          </Card>
        ) : refs.isPending ? (
          <Skeleton height={80} radius={16} />
        ) : (
          <Card>
            <EmptyState
              compact
              icon={Users}
              title="No referrals yet"
              message="Businesses that join with your invite show here."
            />
          </Card>
        )}
      </View>
    </SetupScreen>
  );
}
