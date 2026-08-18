import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ChildProfile from './ChildProfile';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '42' }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('ChildProfile referrals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/children/42/') {
        return Promise.resolve({ data: { id: 42, full_name: 'Nowamani Mark', child_id: 'BK-CH-2024-0001', status: 'ACTIVE', disability_type: 'Cerebral Palsy', severity: 'Moderate', age: 8, date_of_birth: '2016-05-10', caregiver_name: 'Aisha Mark', caregiver_phone: '0777000000', village: 'Kampala', district: 'Kampala', therapist_name: 'Jane', diagnosis: 'Test', medical_history: 'None', current_medication: 'None', allergies: '', notes: '', consent_given: true, consent_date: '2024-01-01', address: 'Test address', caregiver_relationship: 'Mother', caregiver_email: 'aisha@example.com' } });
      }
      if (url === '/children/42/therapy_sessions/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/children/42/assessments/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/children/42/devices/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/children/42/nutrition_records/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/referrals/') {
        return Promise.resolve({ data: [{ id: 7, child: 42, referral_date: '2024-03-01', referral_source: 'Hospital', referred_by: 'Dr. Kato', referral_reason: 'Need therapy support', status: 'PENDING', notes: 'Urgent follow-up' }] });
      }
      if (url === '/users/') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders live referral data for the selected child', async () => {
    render(<ChildProfile />);

    await waitFor(() => {
      expect(screen.getByText('Referral Tracking')).toBeTruthy();
    });

    expect(screen.getByText('Hospital')).toBeTruthy();
    expect(screen.getByText('Need therapy support')).toBeTruthy();
    expect(screen.getByText('Urgent follow-up')).toBeTruthy();
    expect(screen.getByText('PENDING')).toBeTruthy();
  });
});
