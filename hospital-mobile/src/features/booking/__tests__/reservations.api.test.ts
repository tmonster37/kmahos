import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SlotReservationScreen from '@/app/(patient)/booking/slot/[timeSlotId]';
import { ApiClientError } from '@/lib/api/types';
import { ProfilesApi } from '@/features/profiles/profiles.api';
import { ReservationsApi } from '../reservations.api';
import { BookingApi } from '../booking.api';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ timeSlotId: 'slot-100' }),
}));

describe('reservations.api & SlotReservationScreen', () => {
  const sampleProfilesService: ProfilesApi = {
    listMyProfiles: jest.fn().mockResolvedValue([
      {
        patientProfileId: 'prof-owned-1',
        fullName: 'Lê Văn C',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        relationship: 'SELF',
        isLinked: false,
      },
    ]),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  };

  it('showsSlotConflictAndRefreshesSchedule', async () => {
    const onConflictRefresh = jest.fn().mockResolvedValue(undefined);
    const reservationsService: ReservationsApi = {
      reserveSlot: jest
        .fn()
        .mockRejectedValue(new ApiClientError('Khung giờ này vừa hết chỗ.', 409)),
      releaseSlot: jest.fn().mockResolvedValue(undefined),
    };
    const bookingService: BookingApi = {
      createBooking: jest.fn(),
      listMyBookings: jest.fn(),
      cancelBooking: jest.fn(),
    };

    const { findByTestId, getByTestId } = render(
      React.createElement(SlotReservationScreen, {
        timeSlotIdOverride: 'slot-100',
        profilesService: sampleProfilesService,
        reservationsService,
        bookingService,
        onConflictRefresh,
      })
    );

    await findByTestId('select-profile-prof-owned-1');
    fireEvent.press(getByTestId('reserve-slot-button'));

    const conflictBanner = await findByTestId('slot-conflict-banner');
    expect(conflictBanner).toBeTruthy();
    expect(onConflictRefresh).toHaveBeenCalledTimes(1);
  });

  it('releasesReservationOnAbandonedFlow', async () => {
    const releaseSlotMock = jest.fn().mockResolvedValue(undefined);
    const reservationsService: ReservationsApi = {
      reserveSlot: jest.fn().mockResolvedValue({
        reservationId: 'res-active-999',
        timeSlotId: 'slot-100',
        expiresAt: '2026-11-07T10:05:00',
        ttlSeconds: 300,
        message: 'Đã giữ chỗ',
      }),
      releaseSlot: releaseSlotMock,
    };
    const bookingService: BookingApi = {
      createBooking: jest.fn(),
      listMyBookings: jest.fn(),
      cancelBooking: jest.fn(),
    };

    const { findByTestId, getByTestId, unmount } = render(
      React.createElement(SlotReservationScreen, {
        timeSlotIdOverride: 'slot-100',
        profilesService: sampleProfilesService,
        reservationsService,
        bookingService,
      })
    );

    await findByTestId('select-profile-prof-owned-1');
    fireEvent.press(getByTestId('reserve-slot-button'));

    await findByTestId('active-reservation-box');
    expect(reservationsService.reserveSlot).toHaveBeenCalledWith('slot-100', 'prof-owned-1');

    unmount();

    await waitFor(() => {
      expect(releaseSlotMock).toHaveBeenCalledWith('res-active-999');
    });
  });
});
