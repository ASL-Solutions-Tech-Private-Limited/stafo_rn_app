import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Camera, Check, CircleAlert, FileText, Gauge, Trash2, Truck, UserRound} from 'lucide-react-native';
import type {UploadFile} from '../../api/endpoints/tasks';
import type {Vehicle} from '../../api/endpoints/trips';
import {Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {pickFiles} from '../tasks/pickFiles';
import {ChoiceChips, FormSection, IconWell, SetupScreen} from '../setup/parts';
import {takePhoto, useDeleteVehicle, useDrivers, useSaveVehicle, useVehicles} from './queries';
import {formatKm, FUEL_TYPES, toNumber, VEHICLE_TYPES} from './tripLogic';

/** The company's vehicles, and the people who can drive them. */
export function VehiclesScreen({navigation}: AppScreenProps<'Vehicles'>) {
  const {colors, spacing} = useTheme();
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const list = vehicles.data ?? [];
  const people = drivers.data ?? [];

  return (
    <SetupScreen
      title="Vehicles"
      subtitle={
        vehicles.data
          ? `${list.length} ${list.length === 1 ? 'vehicle' : 'vehicles'}${
              drivers.data ? ` · ${people.length} ${people.length === 1 ? 'driver' : 'drivers'}` : ''
            }`
          : null
      }
      onAdd={() => navigation.navigate('VehicleForm', {})}
      addLabel="Vehicle"
      query={vehicles}>
      {list.length ? (
        list.map(v => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            onPress={() => navigation.navigate('VehicleForm', {id: v.id})}
          />
        ))
      ) : (
        <Card>
          <EmptyState
            compact
            icon={Truck}
            title="No vehicles yet"
            message="Add the vehicles your drivers take on trips."
          />
        </Card>
      )}

      <Text variant="overline" tone="muted" style={{marginTop: spacing.md}}>
        DRIVERS
      </Text>
      {people.length ? (
        <Card padded={false}>
          {people.map((d, i) => (
            <View
              key={d.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <Avatar name={d.name} size={36} />
              <View style={{flex: 1}}>
                <Text variant="title">{d.name}</Text>
                <Text variant="caption" tone="muted">
                  {[d.emp_id, d.position].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : drivers.isPending ? null : (
        <Card>
          <EmptyState compact icon={UserRound} title="No drivers yet" />
        </Card>
      )}
      <Text variant="caption" tone="muted">
        Anyone whose position is “Driver” shows here. Change it on their profile.
      </Text>
    </SetupScreen>
  );
}

function VehicleCard({vehicle: v, onPress}: {vehicle: Vehicle; onPress: () => void}) {
  const {colors, spacing} = useTheme();
  const km = toNumber(v.km_travelled);
  const active = (v.status ?? 'active').toLowerCase() === 'active';
  return (
    <Card onPress={onPress} accessibilityLabel={`${v.vehicle_no}, ${v.vehicle_type ?? ''}`}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <IconWell icon={Truck} fg={colors.primary} bg={colors.primarySoft} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="h3" style={{letterSpacing: 0.8}}>
            {v.vehicle_no}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[v.vehicle_type, v.fuel, toNumber(v.load_capacity) ? `${toNumber(v.load_capacity)} kg` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Badge label={active ? 'Active' : v.status ?? 'Inactive'} tone={active ? 'success' : 'neutral'} dot />
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        {km != null ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
            <Gauge size={13} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {formatKm(km)}
            </Text>
          </View>
        ) : null}
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          {v.rc_upload_path ? (
            <FileText size={13} color={colors.textMuted} />
          ) : (
            <CircleAlert size={13} color={colors.warning} />
          )}
          <Text variant="caption" color={v.rc_upload_path ? colors.textMuted : colors.warning}>
            {v.rc_upload_path ? `RC ${v.rc_number ?? 'on file'}` : 'No RC on file'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Add a vehicle, or edit one. An RC photo or file is needed when adding. */
export function VehicleFormScreen({navigation, route}: AppScreenProps<'VehicleForm'>) {
  const editId = route.params?.id;
  const {colors, spacing} = useTheme();
  const vehicles = useVehicles();
  const existing = editId ? vehicles.data?.find(v => v.id === editId) : undefined;
  const save = useSaveVehicle();
  const remove = useDeleteVehicle();

  const [number, setNumber] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [fuel, setFuel] = useState<string | null>(null);
  const [rcNumber, setRcNumber] = useState('');
  const [rc, setRc] = useState<UploadFile | null>(null);
  const [speedometer, setSpeedometer] = useState('');
  const [load, setLoad] = useState('');
  const [km, setKm] = useState('');
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setNumber(existing.vehicle_no);
      setType(existing.vehicle_type ?? null);
      setFuel(existing.fuel ?? null);
      setRcNumber(existing.rc_number ?? '');
      setSpeedometer(existing.speedometer != null ? String(existing.speedometer) : '');
      setLoad(toNumber(existing.load_capacity) != null ? String(toNumber(existing.load_capacity)) : '');
      setKm(existing.km_travelled != null ? String(existing.km_travelled) : '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  const whole = (v: string, what: string) =>
    !v.trim() ? `Enter the ${what}.` : !/^\d+(\.\d+)?$/.test(v.trim()) ? 'Numbers only.' : null;
  const errors = {
    number: !/^[A-Z0-9 -]{4,15}$/i.test(number.trim()) ? 'Enter the number plate, like WB02K7781.' : null,
    type: type ? null : 'Pick a type.',
    fuel: fuel ? null : 'Pick the fuel.',
    rcNumber: !rcNumber.trim() ? 'Enter the RC number.' : null,
    rc: rc || existing?.rc_upload_path || editId ? null : 'Add a photo or file of the RC.',
    speedometer: whole(speedometer, 'top speed on the speedometer'),
    load: whole(load, 'load capacity'),
    km: whole(km, 'km travelled so far'),
  };
  const hasError = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (tried ? errors[k] : null);

  const submit = () => {
    setTried(true);
    if (hasError || save.isPending) {
      haptics.error();
      return;
    }
    save.mutate(
      {
        id: editId,
        input: {
          vehicle_no: number.replace(/\s+/g, ''),
          vehicle_type: type!,
          fuel: fuel!,
          rc_number: rcNumber,
          speedometer: speedometer.trim(),
          load_capacity: load.trim(),
          km_travelled: km.trim(),
          rc,
        },
      },
      {onSuccess: () => navigation.goBack()},
    );
  };

  const chooseFile = async () => {
    const [f] = await pickFiles();
    if (f) {
      setRc(f);
    }
  };

  return (
    <SetupScreen
      title={editId ? 'Edit vehicle' : 'New vehicle'}
      subtitle={existing?.vehicle_no}
      query={editId ? vehicles : undefined}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Number plate"
          placeholder="e.g. WB02K7781"
          autoCapitalize="characters"
          value={number}
          onChangeText={setNumber}
          error={err('number')}
        />
        <View style={{gap: 6}}>
          <ChoiceChips
            label="Type"
            items={VEHICLE_TYPES.map(t => ({value: t as string, label: t}))}
            value={type}
            onChange={setType}
          />
          {err('type') ? (
            <Text variant="caption" tone="danger">
              {err('type')}
            </Text>
          ) : null}
        </View>
        <View style={{gap: 6}}>
          <ChoiceChips
            label="Fuel"
            items={FUEL_TYPES.map(t => ({value: t as string, label: t}))}
            value={fuel}
            onChange={setFuel}
          />
          {err('fuel') ? (
            <Text variant="caption" tone="danger">
              {err('fuel')}
            </Text>
          ) : null}
        </View>
        <FormSection title="REGISTRATION">
          <TextField
            label="RC number"
            autoCapitalize="characters"
            value={rcNumber}
            onChangeText={setRcNumber}
            error={err('rcNumber')}
          />
          <Text variant="caption" color={err('rc') ? colors.danger : colors.textMuted}>
            {rc
              ? `Added ${rc.name}`
              : existing?.rc_upload_path
              ? 'An RC is on file. Add a new one to replace it.'
              : err('rc') ?? (editId ? 'No RC on file yet.' : 'A photo or PDF of the RC is needed.')}
          </Text>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              title="Take photo"
              icon={Camera}
              variant="secondary"
              size="sm"
              style={{flex: 1}}
              onPress={async () => {
                const p = await takePhoto('rc');
                if (p) {
                  setRc(p);
                }
              }}
            />
            <Button
              title="Choose file"
              icon={FileText}
              variant="ghost"
              size="sm"
              style={{flex: 1}}
              onPress={chooseFile}
            />
          </View>
        </FormSection>
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <TextField
            label="Load (kg)"
            keyboardType="decimal-pad"
            value={load}
            onChangeText={setLoad}
            error={err('load')}
            containerStyle={{flex: 1}}
          />
          <TextField
            label="Top speed"
            keyboardType="number-pad"
            value={speedometer}
            onChangeText={setSpeedometer}
            error={err('speedometer')}
            containerStyle={{flex: 1}}
          />
        </View>
        <TextField
          label="Km travelled so far"
          keyboardType="number-pad"
          value={km}
          onChangeText={setKm}
          error={err('km')}
          hint="The odometer reading today."
        />
        <Button
          title={editId ? 'Save vehicle' : 'Add vehicle'}
          icon={Check}
          loading={save.isPending}
          disabled={save.isPending || !loaded}
          onPress={submit}
        />
        {editId ? (
          <Button
            title="Remove vehicle"
            icon={Trash2}
            variant="ghost"
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Remove ${existing?.vehicle_no ?? 'this vehicle'}?`}
        message="This can’t be undone."
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          editId &&
          remove.mutate(editId, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigation.goBack();
            },
          })
        }
      />
    </SetupScreen>
  );
}
