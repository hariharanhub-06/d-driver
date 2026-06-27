'use client';

import dynamic from 'next/dynamic';
import { useTour } from './TourProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Joyride = dynamic<any>(() => import('react-joyride').then((m: any) => ({ default: m.Joyride || m.default })), { ssr: false });

const steps: any[] = [
    {
        target: '[data-tour="sa-schools"]',
        content: 'Manage all schools here. Enable/disable features per school.',
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="sa-billing"]',
        content: 'Create pricing plans and generate monthly invoices.',
        placement: 'right',
    },
    {
        target: '[data-tour="sa-revenue"]',
        content: 'Track MRR, overdue payments, and per-school billing.',
        placement: 'right',
    },
    {
        target: '[data-tour="sa-expenses"]',
        content: 'Monitor your platform costs vs revenue.',
        placement: 'right',
    },
    {
        target: '[data-tour="sa-settings"]',
        content: 'Configure your Razorpay keys and billing settings.',
        placement: 'right',
    },
];

export default function SuperAdminTour() {
    const { tourName, startTour } = useTour();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCallback = (data: any) => {
        if (['finished', 'skipped'].includes(data.status as string)) {
            startTour('');
        }
    };

    // Only mount Joyride while the tour runs — avoids the overlay flashing on page load.
    if (tourName !== 'superadmin') return null;

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
                options: {
                    primaryColor: '#3B82F6',
                    zIndex: 10000,
                    arrowColor: '#161b22',
                    backgroundColor: '#161b22',
                    textColor: '#e2e8f0',
                },
                tooltip: {
                    borderRadius: 16,
                    padding: '16px 20px',
                    border: '1px solid #30363d',
                },
                buttonNext: {
                    borderRadius: 12,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                },
                buttonBack: {
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: 13,
                },
                buttonSkip: {
                    color: '#64748b',
                    fontSize: 12,
                },
            }}
        />
    );
}
