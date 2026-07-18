// Structured, fully-editable landing-page content. Stored as one JSON blob in
// PlatformConfig.landing_content. The landing page renders from DEFAULT_LANDING_CONTENT
// deep-merged with whatever the super-admin saved, so empty/partial content still renders
// the original design. The editor (super-admin Settings) writes the whole object back.

import {
    Locate, CheckCircle2, CreditCard, Bell, BarChart3, MapPin, Users, Navigation, Bus,
    ShieldCheck, Clock, Smartphone, Zap, Route, UserCheck, Phone, Mail, Camera, Fuel,
    FileText, Calendar, Star, Heart, Map, Wallet, Send, Gauge, Building2, TrendingUp,
    type LucideIcon,
} from 'lucide-react';

export interface FeatureCard { icon: string; color: string; badge: string; title: string; desc: string }
export interface FeaturePill { icon: string; color: string; label: string; sub: string }
export interface HowStep { icon: string; color: string; title: string; desc: string }
export interface ChallengeItem { title: string; desc: string }
export interface ChallengeGroup { role: string; tagline: string; icon: string; color: string; items: ChallengeItem[] }

export interface SolutionCardC { icon: string; title: string; sub: string }
export interface SmartFeatureC { icon: string; label: string }
export interface HeroStat { icon: string; value: string; label: string }

export interface LandingContent {
    nav: { features: string; how: string; schools: string; signIn: string };
    hero: {
        secondaryCta: string; image_url: string | null;
        // OnLIVE ecosystem-design hero copy (all editable by the super-admin).
        badge: string; title: string; titleAccent: string; subtitle: string;
        primaryCta: string; trustLine: string;
    };
    // Hero stats strip (the "10 Lakh+ Students / 5000+ Schools / …" band under the hero).
    heroStats: HeroStat[];
    // New OnLIVE-design editable marketing sections.
    ecosystemHeading: string;
    solutions: { heading: string; cards: SolutionCardC[] };
    smartFeatures: { heading: string; items: SmartFeatureC[] };
    superAppHeading: string;
    analyticsHeading: string;
    goGreenHeading: string;
    contact: { contactHeading: string; contactSub: string; demoHeading: string; demoBody: string; demoCta: string; followHeading: string };
    // Social links — a platform's icon is shown ONLY when its URL is filled in.
    socials: { facebook: string; instagram: string; linkedin: string; youtube: string; twitter: string; whatsapp: string; telegram: string; website: string };
    statLabels: { schools: string; parents: string; buses_live: string; drivers: string; staff_admins: string };
    features: { badge: string; title: string; subtitle: string; cards: FeatureCard[]; pills: FeaturePill[] };
    how: { badge: string; title: string; subtitle: string; steps: HowStep[] };
    challenges: { badge: string; title: string; subtitle: string; groups: ChallengeGroup[] };
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
    FileText, Calendar, Star, Heart, Map, Wallet, Send, Gauge, Building2, TrendingUp,
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
    hero: {
        secondaryCta: 'Explore Ecosystem', image_url: null,
        badge: "India's First AI-Powered",
        title: 'Smart Transport', titleAccent: 'Ecosystem',
        subtitle: 'One Platform. Every Journey. Every Student. Every Parent. Every School.',
        primaryCta: 'Book a Demo',
        trustLine: 'Trusted by 5000+ Schools & 10 Lakh+ Parents',
    },
    heroStats: [
        { icon: 'Users', value: '10 Lakh+', label: 'Students' },
        { icon: 'Building2', value: '5000+', label: 'Schools' },
        { icon: 'Bus', value: '20,000+', label: 'Buses' },
        { icon: 'MapPin', value: '50+', label: 'Cities' },
        { icon: 'TrendingUp', value: '99.9%', label: 'Uptime' },
    ],
    ecosystemHeading: 'OnLIVE Transport Ecosystem',
    solutions: {
        heading: 'Powerful Solutions for Everyone',
        cards: [
            { icon: 'MapPin', title: 'Live GPS Tracking', sub: 'Real-time location of every vehicle' },
            { icon: 'Route', title: 'Smart Route Optimization', sub: 'AI-powered efficient & safe routes' },
            { icon: 'CheckCircle2', title: 'Attendance Management', sub: 'Automated student & driver attendance' },
            { icon: 'CreditCard', title: 'Cashless Payment', sub: 'Fees, tickets & more — all digital' },
            { icon: 'Heart', title: 'Parent-Student Engagement', sub: 'Connect, engage & grow together' },
            { icon: 'Bell', title: 'Transport Alerts', sub: 'Vehicle Health, Fuel, Reports & more' },
            { icon: 'Users', title: 'School ERP', sub: 'Complete school management' },
            { icon: 'Star', title: 'Student Talent Passport', sub: 'Discover, record & nurture talent' },
            { icon: 'Bus', title: 'Fleet Management', sub: 'Vehicle health, fuel, maintenance & more' },
        ],
    },
    smartFeatures: {
        heading: 'Smart Features at a Glance',
        items: [
            { icon: 'MapPin', label: 'Live Tracking' }, { icon: 'Bell', label: 'ETA & Alerts' },
            { icon: 'CheckCircle2', label: 'Student Attendance' }, { icon: 'FileText', label: 'Digital ID Card' },
            { icon: 'Route', label: 'Route Optimization' }, { icon: 'BarChart3', label: 'Trip Reports' },
            { icon: 'Gauge', label: 'Vehicle Health' }, { icon: 'Navigation', label: 'Driver Behavior' },
            { icon: 'Fuel', label: 'Fuel Monitoring' }, { icon: 'Bell', label: 'Maintenance Alerts' },
            { icon: 'CreditCard', label: 'Cashless Payments' }, { icon: 'ShieldCheck', label: 'SOS Emergency' },
            { icon: 'Heart', label: 'Go Green Initiative' }, { icon: 'Users', label: 'Parent-Student Engagement' },
        ],
    },
    superAppHeading: 'Simple. Smart. Super App Experience',
    analyticsHeading: 'Analytics Dashboard Preview',
    goGreenHeading: 'Go Green Initiative',
    contact: {
        contactHeading: 'CONTACT US',
        contactSub: "Let's Connect & Build the Future of Smart School Mobility",
        demoHeading: 'BOOK A FREE DEMO TODAY!',
        demoBody: 'Our experts are ready to help your school digitize transport management.',
        demoCta: 'Schedule a Free Demo',
        followHeading: 'Follow OnLIVE',
    },
    socials: { facebook: '', instagram: '', linkedin: '', youtube: '', twitter: '', whatsapp: '', telegram: '', website: '' },
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
    challenges: {
        badge: 'The Problem',
        title: 'Challenges Without OnLIVE',
        subtitle: 'Real problems, every day — for drivers on the road, parents waiting at home, and schools drowning in manual work.',
        groups: [
            {
                role: 'Drivers', tagline: 'On the road. Under pressure.', icon: 'Navigation', color: 'blue',
                items: [
                    { title: 'Constant calls from parents', desc: 'Distracted driving every day.' },
                    { title: 'Difficulty finding students', desc: 'Unfamiliar routes and wrong stops.' },
                    { title: 'Manual attendance', desc: 'Time-consuming and error-prone.' },
                    { title: 'No emergency support', desc: 'No help in case of breakdowns.' },
                ],
            },
            {
                role: 'Parents', tagline: 'Worry. Waiting. No updates.', icon: 'MapPin', color: 'orange',
                items: [
                    { title: '“Where is my child?”', desc: 'No real-time information about the bus.' },
                    { title: 'No live bus location', desc: "Can't track the bus in real-time." },
                    { title: 'Driver not answering', desc: 'Calls go unanswered when needed most.' },
                    { title: 'Daily anxiety and stress', desc: 'Worry becomes a routine.' },
                ],
            },
            {
                role: 'Schools', tagline: 'Manual work. More complaints.', icon: 'Users', color: 'purple',
                items: [
                    { title: 'Hundreds of parent calls', desc: 'Front desk overwhelmed all day.' },
                    { title: 'Manual attendance management', desc: 'Time-consuming and prone to errors.' },
                    { title: 'No centralized transport system', desc: 'Information scattered and unorganized.' },
                    { title: 'Poor parent satisfaction', desc: 'Affects trust and school reputation.' },
                ],
            },
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
        heroStats: Array.isArray(s.heroStats) && s.heroStats.length ? s.heroStats : d.heroStats,
        ecosystemHeading: s.ecosystemHeading ?? d.ecosystemHeading,
        solutions: {
            ...d.solutions, ...s.solutions,
            cards: Array.isArray(s.solutions?.cards) && s.solutions.cards.length ? s.solutions.cards : d.solutions.cards,
        },
        smartFeatures: {
            ...d.smartFeatures, ...s.smartFeatures,
            items: Array.isArray(s.smartFeatures?.items) && s.smartFeatures.items.length ? s.smartFeatures.items : d.smartFeatures.items,
        },
        superAppHeading: s.superAppHeading ?? d.superAppHeading,
        analyticsHeading: s.analyticsHeading ?? d.analyticsHeading,
        goGreenHeading: s.goGreenHeading ?? d.goGreenHeading,
        contact: { ...d.contact, ...s.contact },
        socials: { ...d.socials, ...s.socials },
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
        challenges: {
            ...d.challenges, ...s.challenges,
            groups: Array.isArray(s.challenges?.groups) && s.challenges.groups.length ? s.challenges.groups : d.challenges.groups,
        },
        schoolsHeading: s.schoolsHeading ?? d.schoolsHeading,
        partnersHeading: s.partnersHeading ?? d.partnersHeading,
        teamHeading: s.teamHeading ?? d.teamHeading,
        teamSubtitle: s.teamSubtitle ?? d.teamSubtitle,
        cta: { ...d.cta, ...s.cta },
        footer: { ...d.footer, ...s.footer },
    };
}
