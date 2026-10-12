import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Check} from 'lucide-react-native';
import type {Place} from '../../api/endpoints/trips';
import {Button, Text, TextField, toast} from '../../components/ui';
import {parseServerDate} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {normalizePhone, phoneError} from '../employees/employeeForm';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {useAvailability, useDrivers, useSaveTrip, useTrip, useVehicles} from './queries';
import {DateTimeField, PlacePicker, PlaceRow} from './tripParts';
import {pointOf, toServerDateTime} from './tripLogic';

const placeOf = (address?: string | null, lat?: string | null, lng?: string | null): Place | null => {
  const p = pointOf(lat, lng);
  return p ? {address: address?.trim() ?? '', ...p} : null;
};

/** In 30 minutes, on the half hour. */
function soon() {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

/** Plan a trip, or change one that hasn't started. Employees drive their own trips. */
export function TripFormScreen({navigation, route}: AppScreenProps<'TripForm'>) {
  const editId = route.params?.id;
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const me = useSession(s => s.employee?.id);
  const existing = useTrip(editId ?? 0, !!editId);
  const trip = editId ? existing.data : undefined;
  const vehicles = useVehicles();
  const drivers = useDrivers(isCompany);
  const save = useSaveTrip();

  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [start, setStart] = useState<Date | null>(editId ? null : soon());
  const [end, setEnd] = useState<Date | null>(null);
  const [vehicle, setVehicle] = useState<number | null>(null);
  const [driver, setDriver] = useState<number | null>(isCompany ? null : me ?? null);
  const [notes, setNotes] = useState('');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (trip && !loaded) {
      setTitle(trip.title ?? '');
      setClient(trip.customer_info?.customer_name?.trim() ?? '');
      setPhone(trip.customer_info?.phone ?? '');
      setFrom(placeOf(trip.from_address, trip.start_latitude, trip.start_longitude));
      setTo(placeOf(trip.to_address, trip.end_latitude, trip.end_longitude));
      setStart(parseServerDate(trip.start_time));
      setEnd(parseServerDate(trip.end_time));
      setVehicle(trip.vehicle_id ?? null);
      setDriver(trip.driver_id ?? null);
      setNotes(trip.notes ?? '');
      setLoaded(true);
    }
  }, [trip, loaded]);

  // A trip being edited already holds its own vehicle and driver.
  const vehicleFree = useAvailability('vehicle', vehicle, !!trip && vehicle === trip.vehicle_id);
  const driverFree = useAvailability(
    'driver',
    isCompany ? driver : null,
    !!trip && driver === trip.driver_id,
  );
  const vehicleName = vehicles.data?.find(v => v.id === vehicle)?.vehicle_no ?? 'This vehicle';
  const driverName = drivers.data?.find(d => d.id === driver)?.name ?? 'This driver';

  const errors = {
    title: !title.trim() ? 'Give the trip a name.' : null,
    client: !client.trim() ? 'Add the client’s name.' : null,
    phone: phoneError(phone),
    from: !from ? 'Pick where it starts.' : null,
    to: !to ? 'Pick where it goes.' : null,
    start: !start ? 'Pick when it starts.' : null,
    end: !end
      ? 'Pick when it should end.'
      : start && end && end <= start
      ? 'It has to end after it starts.'
      : null,
    vehicle: !vehicle
      ? 'Pick a vehicle.'
      : vehicleFree.data === false
      ? `${vehicleName} is on another trip. Pick another one.`
      : null,
    driver: !driver
      ? 'Pick a driver.'
      : driverFree.data === false
      ? `${driverName} is on another trip. Pick someone else.`
      : null,
  };
  const hasError = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (tried ? errors[k] : null);
  // Busy vehicles and drivers show straight away, not only after Save.
  const now = (k: 'vehicle' | 'driver') =>
    (k === 'vehicle' ? vehicleFree.data : driverFree.data) === false ? errors[k] : err(k);

  const submit = () => {
    setTried(true);
    if (hasError || save.isPending) {
      if (hasError) {
        haptics.error();
      }
      return;
    }
    save.mutate(
      {
        id: editId,
        input: {
          title,
          notes,
          customer_name: client,
          customer_phone: normalizePhone(phone),
          from: from!,
          to: to!,
          start_time: toServerDateTime(start!),
          end_time: toServerDateTime(end!),
          vehicle_id: vehicle!,
          driver_id: driver!,
        },
      },
      {
        onSuccess: () => {
          toast.success(editId ? 'Trip saved' : 'Trip added');
          navigation.goBack();
        },
      },
    );
  };

  return (
    <SetupScreen
      title={editId ? 'Edit trip' : 'New trip'}
      subtitle={trip?.title}
      query={editId ? existing : undefined}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Trip name"
          placeholder="e.g. Salt Lake to Howrah depot"
          value={title}
          onChangeText={setTitle}
          error={err('title')}
        />
        <TextField
          label="Client"
          placeholder="Who it’s for"
          value={client}
          onChangeText={setClient}
          error={err('client')}
        />
        <TextField
          label="Client mobile"
          placeholder="10 digits"
          keyboardType="phone-pad"
          prefix="+91"
          maxLength={16}
          value={phone}
          onChangeText={setPhone}
          error={err('phone')}
        />
        <View style={{gap: spacing.sm}}>
          <Text variant="label">Route</Text>
          <PlaceRow
            label="From"
            color={colors.success}
            place={from}
            error={err('from')}
            onPress={() => setPicking('from')}
          />
          <PlaceRow
            label="To"
            color={colors.danger}
            place={to}
            error={err('to')}
            onPress={() => setPicking('to')}
          />
        </View>
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <DateTimeField label="Starts" value={start} onChange={setStart} error={err('start')} />
          <DateTimeField
            label="Ends by"
            value={end}
            onChange={setEnd}
            min={start ?? undefined}
            error={err('end')}
          />
        </View>
        <View style={{gap: 6}}>
          {vehicles.data && !vehicles.data.length ? (
            <>
              <Text variant="label">Vehicle</Text>
              <Text variant="caption" tone="muted">
                {isCompany
                  ? 'No vehicles yet. Add one from Vehicles first.'
                  : 'Your company hasn’t added any vehicles yet.'}
              </Text>
            </>
          ) : (
            <ChoiceChips
              label="Vehicle"
              scroll
              items={(vehicles.data ?? []).map(v => ({
                value: v.id,
                label: v.vehicle_type ? `${v.vehicle_no} · ${v.vehicle_type}` : v.vehicle_no,
              }))}
              value={vehicle}
              onChange={setVehicle}
            />
          )}
          {now('vehicle') ? (
            <Text variant="caption" tone="danger">
              {now('vehicle')}
            </Text>
          ) : null}
        </View>
        {isCompany ? (
          <View style={{gap: 6}}>
            {drivers.data && !drivers.data.length ? (
              <>
                <Text variant="label">Driver</Text>
                <Text variant="caption" tone="muted">
                  No drivers yet. Set someone’s position to Driver on their profile.
                </Text>
              </>
            ) : (
              <ChoiceChips
                label="Driver"
                scroll
                items={(drivers.data ?? []).map(d => ({value: d.id, label: d.name}))}
                value={driver}
                onChange={setDriver}
              />
            )}
            {now('driver') ? (
              <Text variant="caption" tone="danger">
                {now('driver')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <TextField
          label="Notes"
          placeholder="Optional: what to carry, who to meet"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
        />
        <Button
          title={editId ? 'Save changes' : 'Save trip'}
          icon={Check}
          loading={save.isPending}
          disabled={save.isPending || !loaded}
          onPress={submit}
        />
      </View>

      <PlacePicker
        visible={picking != null}
        title={picking === 'to' ? 'Where it goes' : 'Where it starts'}
        color={picking === 'to' ? colors.danger : colors.success}
        initial={picking === 'to' ? to : from}
        near={picking === 'to' ? from : to}
        onClose={() => setPicking(null)}
        onPick={p => {
          (picking === 'to' ? setTo : setFrom)(p);
          setPicking(null);
        }}
      />
    </SetupScreen>
  );
}
