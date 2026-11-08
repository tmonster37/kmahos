import React from 'react';
import { AxiosHeaders } from 'axios';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfilesListScreen from '@/app/(patient)/profiles/index';
import { createApiClient } from '@/lib/api/client';
import { ProfileForm } from '../components/ProfileForm';
import { createProfilesApi } from '../profiles.api';
import { PatientProfile } from '../profiles.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

const SYNTHETIC_PROFILE: PatientProfile = {
  patientProfileId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  fullName: 'Nguyễn Minh An',
  phoneNumber: '0901234567',
  identityNumber: '079090001234',
  healthInsuranceNumber: 'DN4790012345678',
  gender: 'FEMALE',
  dateOfBirth: '1992-08-20',
  streetAddress: '123 Nguyễn Trãi',
  province: 'TP.HCM',
  district: 'Quận 1',
  ward: 'Phường Bến Thành',
  isLinked: false,
  relationship: 'CHILD',
};

describe('profiles.api & family-profile screens', () => {
  it('listsOnlyServerReturnedProfiles', async () => {
    const client = createApiClient({
      baseUrl: 'http://192.168.1.100:8080',
      adapter: async (config) => ({
        data: {
          code: 200,
          message: 'OK',
          data: [SYNTHETIC_PROFILE],
        },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      }),
    });

    const api = createProfilesApi(client);
    const list = await api.listMyProfiles();

    expect(list).toHaveLength(1);
    expect(list[0].patientProfileId).toBe(SYNTHETIC_PROFILE.patientProfileId);
    expect(list[0].fullName).toBe('Nguyễn Minh An');
    expect(list[0].relationship).toBe('CHILD');
  });

  it('submitsRelationshipAndRequiredFields', async () => {
    let submittedBody: Record<string, unknown> | null = null;
    const client = createApiClient({
      baseUrl: 'http://192.168.1.100:8080',
      adapter: async (config) => {
        submittedBody = JSON.parse(String(config.data));
        return {
          data: {
            code: 201,
            message: 'Created',
            data: SYNTHETIC_PROFILE,
          },
          status: 201,
          statusText: 'Created',
          headers: new AxiosHeaders(),
          config,
        };
      },
    });

    const api = createProfilesApi(client);
    const { getByTestId } = render(
      React.createElement(ProfileForm, {
        onSubmit: async (values) => {
          await api.createProfile(values);
        },
      })
    );

    fireEvent.changeText(getByTestId('profile-fullname-input'), '  Nguyễn Minh An  ');
    fireEvent.changeText(getByTestId('profile-dob-input'), '1992-08-20');
    fireEvent.press(getByTestId('profile-gender-FEMALE'));
    fireEvent.changeText(getByTestId('profile-relationship-input'), 'CHILD');
    fireEvent.press(getByTestId('profile-submit-button'));

    await waitFor(() => {
      expect(submittedBody).toMatchObject({
        fullName: 'Nguyễn Minh An',
        dateOfBirth: '1992-08-20',
        gender: 'FEMALE',
        relationship: 'CHILD',
      });
    });
  });

  it('showsProfileLoadAndEmptyStates', async () => {
    const emptyApi = {
      listMyProfiles: jest.fn(async () => []),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteProfile: jest.fn(),
    };

    const { getByTestId } = render(
      React.createElement(ProfilesListScreen, { api: emptyApi })
    );

    await waitFor(() => {
      expect(getByTestId('profiles-empty')).toBeTruthy();
    });
  });
});
