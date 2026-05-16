'use client';

import dynamic from 'next/dynamic';
import { useTour } from './TourProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Joyride = dynamic<any>(() => import('react-joyride').then((m: any) => ({ default: m.Joyride || m.default })), { ssr: false });

const steps: any[] = [
  {
    target: '[data-tour="parent-dashboard"]',
    content: "See your child's live bus status right here — boarding, in transit, or arrived at school.",
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="parent-track"]',
    content: 'Track the bus in real time on a live map so you always know where your child is.',
    placement: 'top',
  },
  {
    target: '[data-tour="parent-attendance"]',
    content: "View your child's monthly attendance calendar — tap any day for full details.",
    placement: 'top',
  },
  {
    target: '[data-tour="parent-fees"]',
    content: 'Check outstanding fees and pay instantly via Razorpay — no cash needed.',
    placement: 'top',
  },
];

export default function ParentTour() {
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
      run={tourName === 'parent'}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleCallback}
      styles={{
        options: { primaryColor: '#3B82F6', zIndex: 10000 },
        tooltip: { borderRadius: 16 },
        buttonNext: { borderRadius: 12, fontWeight: 700, fontSize: 13 },
        buttonBack: { color: '#64748b', fontWeight: 700, fontSize: 13 },
        buttonSkip: { color: '#94a3b8', fontSize: 12 },
      }}
    />
  );
}
