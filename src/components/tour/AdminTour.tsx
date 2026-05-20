'use client';

import dynamic from 'next/dynamic';
import { useTour } from './TourProvider';

// Joyride must be loaded client-side only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Joyride = dynamic<any>(() => import('react-joyride').then((m: any) => ({ default: m.Joyride || m.default })), { ssr: false });

const steps: any[] = [
  {
    target: '[data-tour="dashboard"]',
    content: "The dashboard shows live routes, active buses, and today's attendance at a glance.",
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '[data-tour="students"]',
    content: 'Add students, assign their route and stop, and set the fee structure.',
    placement: 'right',
  },
  {
    target: '[data-tour="routes"]',
    content: 'Create routes and assign them to buses and drivers.',
    placement: 'right',
  },
  {
    target: '[data-tour="buses"]',
    content: 'Add buses here. Set mileage so fuel alerts fire automatically.',
    placement: 'right',
  },
  {
    target: '[data-tour="fees"]',
    content: 'Fees auto-generate based on each student\'s fee structure. Collect online via Razorpay.',
    placement: 'right',
  },
  {
    target: '[data-tour="settings"]',
    content: 'Add your Razorpay keys and notification email here to unlock payments.',
    placement: 'right',
  },
];

export default function AdminTour() {
  const { tourName, startTour } = useTour();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCallback = (data: any) => {
    if (['finished', 'skipped'].includes(data.status as string)) {
      startTour('');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={tourName === 'admin'}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#1e293b',
        },
        tooltip: {
          borderRadius: 16,
          padding: '16px 20px',
        },
        buttonNext: {
          borderRadius: 12,
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: 13,
        },
        buttonBack: {
          color: '#64748b',
          fontWeight: 700,
          fontSize: 13,
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: 12,
        },
      }}
    />
  );
}
