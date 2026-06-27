// Structured, fully-editable landing-page content. Stored as one JSON blob in
// PlatformConfig.landing_content. The landing page renders from DEFAULT_LANDING_CONTENT
// deep-merged with whatever the super-admin saved, so empty/partial content still renders
// the original design. The editor (super-admin Settings) writes the whole object back.

import {
    Locate, CheckCircle2, CreditCard, Bell, BarChart3, MapPin, Users, Navigation, Bus,
    ShieldCheck, Clock, Smartphone, Zap, Route, UserCheck, Phone, Mail, Camera, Fuel,
    FileText, Calendar, Star, Heart, Map, Wallet, Send, Gauge, type LucideIcon,
} from 'lucide-react';

export interface FeatureCard { icon: string; color: string; badge: string; title: string; desc: string }
export interface FeaturePill { icon: string; color: string; label: string; sub: string }
export interface HowStep { icon: string; color: string; title: string; desc: string }

export interface LandingContent {
    nav: { features: string; how: string; schools: string; signIn: string };
    hero: { secondaryCta: string; image_url: string | null };
    statLabels: { schools: string; parents: string; buses_live: string; drivers: string; staff_admins: string };
    features: { badge: string; title: string; subtitle: string; cards: FeatureCard[]; pills: FeaturePill[] };
    how: { badge: string; title: string; subtitle: string; steps: HowStep[] };
    schoolsHeading: string;
    partnersHeading: string;
    teamHeading: string;
    teamSubtitle: string; // "{product}" is replaced with the product name
    cta: { eyebrow: string; title: string; body: string; primary: string; secondary: string };
    footer: { portalHeading: string; schoolAdmin: string; driverApp: string; parentApp: string; contactHeading: string };
}

// Curated icon set offered in the editor's icon picker.
export const ICON_MAP: Record<string, LucideIcon> = {
    Locate, CheckCircle2, CreditCard, Bell, BarChart3, MapPin, Users, Navigation, Bus,
    ShieldCheck, Clock, Smartphone, Zap, Route, UserCheck, Phone, Mail, Camera, Fuel,
    FileText, Calendar, Star, Heart, Map, Wallet, Send, Gauge,
};
export const ICON_OPTIONS = Object.keys(ICON_MAP);

// Curated colour themes for icon chips (light landing page).
export const COLOR_MAP: Record<string, { bg: string; text: string }> = {
    green:  { bg: 'bg-green-100',  text: 'text-[#22c55e]' },
    blue:   { bg: 'bg-blue-50',    text: 'text-blue-500' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-500' },
    purple: { bg: 'bg-purple-50',  text: 'text-purple-500' },
    teal:   { bg: 'bg-teal-50',    text: 'text-teal-500' },
    red:    { bg: 'bg-red-50',     text: 'text-red-500' },
    indigo: { bg: 'bg-indigo-50',  text: 'text-indigo-500' },
    slate:  { bg: 'bg-slate-100',  text: 'text-slate-600' },
};
export const COLOR_OPTIONS = Object.keys(COLOR_MAP);

export const iconFor = (name?: string): LucideIcon => ICON_MAP[name || ''] || Star;
export const colorFor = (name?: string) => COLOR_MAP[name || ''] || COLOR_MAP.green;

export const DEFAULT_LANDING_CONTENT: LandingContent = {
    nav: { features: 'Features', how: 'How It Works', schools: 'Schools', signIn: 'Sign In' },
    hero: { secondaryCta: 'See How It Works', image_url: null },
    statLabels: {
        schools: 'Schools', parents: 'Parents Enrolled', buses_live: 'Buses Live Now',
        drivers: 'Drivers', staff_admins: 'Staff & Admins',
    },
    features: {
        badge: 'Platform Features',
        title: 'Built for the road ahead',
        subtitle: 'Every feature designed for the real-world needs of school transport operations.',
        cards: [
            { icon: 'Locate', color: 'green', badge: 'Real-time', title: 'Live GPS Tracking', desc: "Parents watch their child's bus on a live map. Auto-alert when bus is 1 km from their stop — no more waiting outside." },
            { icon: 'CheckCircle2', color: 'blue', badge: 'Stop by stop', title: 'Smart Attendance', desc: "Driver sees each student's photo card at every stop. One tap to mark present or absent. Parents notified instantly on any changes." },
            { icon: 'CreditCard', color: 'orange', badge: 'Automated', title: 'Fee Management', desc: 'Auto-generate fees per student schedule. Online payments, cash recording, and instant digital receipts — all in one place.' },
        ],
        pills: [
            { icon: 'Bell', color: 'purple', label: 'Push Notifications', sub: 'Bus approaching, boarded, arrived' },
            { icon: 'BarChart3', color: 'teal', label: 'Reports & Analytics', sub: 'Attendance, fuel, shift logs' },
            { icon: 'MapPin', color: 'red', label: 'Stop Management', sub: 'Sequence, timing, requests' },
            { icon: 'Users', color: 'indigo', label: 'Multi-role Access', sub: 'Admin, Driver, Parent' },
        ],
    },
    how: {
        badge: 'The Journey',
        title: 'From setup to live in minutes',
        subtitle: 'Three simple steps to transform how your school manages student transport.',
        steps: [
            { icon: 'Bus', color: 'green', title: 'Admin Sets Up Routes', desc: 'Add buses, assign drivers, create routes with stops in order. Students are linked to their boarding stop automatically.' },
            { icon: 'Navigation', color: 'blue', title: 'Driver Starts Trip', desc: 'Driver selects Morning or Evening route and starts the trip. GPS goes live — parents receive a "Bus Started" notification instantly.' },
            { icon: 'Bell', color: 'orange', title: 'Parents Track Live', desc: 'Parents watch the bus on a real-time map. Get a "Bus 1 km away" alert. See their child marked as boarded — every mile, every child.' },
        ],
    },
    schoolsHeading: 'Trusted by Schools',
    partnersHeading: 'Our Partners',
    teamHeading: 'Meet the Team',
    teamSubtitle: 'The people building {product}.',
    cta: {
        eyebrow: 'Ready to roll?',
        title: "Transform your school's transport today",
        body: 'Join schools running safer, smarter bus operations with {product}.',
        primary: 'Sign In',
        secondary: 'Explore Features',
    },
    footer: {
        portalHeading: 'Portal', schoolAdmin: 'School Admin', driverApp: 'Driver App',
        parentApp: 'Parent App', contactHeading: 'Contact',
    },
};

// Deep-merge saved content over the defaults so partial/older saves still render fully.
export function mergeLandingContent(saved: any): LandingContent {
    const d = DEFAULT_LANDING_CONTENT;
    const s = saved && typeof saved === 'object' ? saved : {};
    return {
        nav: { ...d.nav, ...s.nav },
        hero: { ...d.hero, ...s.hero },
        statLabels: { ...d.statLabels, ...s.statLabels },
        features: {
            ...d.features, ...s.features,
            cards: Array.isArray(s.features?.cards) && s.features.cards.length ? s.features.cards : d.features.cards,
            pills: Array.isArray(s.features?.pills) && s.features.pills.length ? s.features.pills : d.features.pills,
        },
        how: {
            ...d.how, ...s.how,
            steps: Array.isArray(s.how?.steps) && s.how.steps.length ? s.how.steps : d.how.steps,
        },
        schoolsHeading: s.schoolsHeading ?? d.schoolsHeading,
        partnersHeading: s.partnersHeading ?? d.partnersHeading,
        teamHeading: s.teamHeading ?? d.teamHeading,
        teamSubtitle: s.teamSubtitle ?? d.teamSubtitle,
        cta: { ...d.cta, ...s.cta },
        footer: { ...d.footer, ...s.footer },
    };
}
