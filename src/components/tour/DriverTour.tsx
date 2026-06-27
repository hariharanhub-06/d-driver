'use client';

import dynamic from 'next/dynamic';
import { useTour } from './TourProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Joyride = dynamic<any>(() => import('react-joyride').then((m: any) => ({ default: m.Joyride || m.default })), { ssr: false });

const steps: any[] = [
  {
    target: '[data-tour="driver-dashboard"]',
    content: "Your dashboard shows today's route, current trip status, and any pending actions.",
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="driver-attendance"]',
    content: 'Mark each student as present or absent at their stop. Parents are notified instantly.',
    placement: 'right',
  },
  {
    target: '[data-tour="driver-route"]',
    content: 'View your assigned route, all stops, and the expected timeline for the day.',
    placement: 'right',
  },
  {
    target: '[data-tour="driver-sos"]',
    content: 'In an emergency, tap SOS — your school admin is alerted immediately.',
    placement: 'top',
  },
];

export default function DriverTour() {
  const { tourName, startTour } = useTour();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCallback = (data: any) => {
    if (['finished', 'skipped'].includes(data.status as string)) {
      startTour('');
    }
  };

  // Only mount Joyride while the tour runs — avoids the overlay flashing on page load.
  if (tourName !== 'driver') return null;

  return (
    <Joyride
      steps={steps}
      run
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleCallback}
      styles={{
        options: { primaryColor: '#10B981', zIndex: 10000 },
        tooltip: { borderRadius: 16 },
        buttonNext: { borderRadius: 12, fontWeight: 700, fontSize: 13 },
        buttonBack: { color: '#64748b', fontWeight: 700, fontSize: 13 },
        buttonSkip: { color: '#94a3b8', fontSize: 12 },
      }}
    />
  );
}
