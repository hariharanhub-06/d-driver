// Full bilingual translation set for all D-Driver portals
// Usage: const t = useT();  →  t('English text', 'தமிழ் உரை')

import { useLang } from '@/context/LanguageContext';

// ─── Core translator function ─────────────────────────────────────────────────
export function biLabel(lang: 'en' | 'ta' | 'both', en: string, tamil: string): string {
  if (lang === 'en') return en;
  if (lang === 'ta') return tamil;
  return `${en} / ${tamil}`;
}

// ─── Hook — use this in all page components ───────────────────────────────────
export function useT() {
  const { lang } = useLang();
  return (en: string, ta: string) => biLabel(lang, en, ta);
}

// ─── Tamil translations object (direct access where needed) ───────────────────
export const ta = {
  // Roles
  parent: 'பெற்றோர்',
  driver: 'ஓட்டுநர்',
  admin: 'நிர்வாகி',
  busStaff: 'பேருந்து ஊழியர்',
  superAdmin: 'தள நிர்வாகி',

  // Navigation
  dashboard: 'டாஷ்போர்டு',
  track: 'கண்காணிப்பு',
  fees: 'கட்டணம்',
  requests: 'கோரிக்கைகள்',
  attendance: 'வருகை பதிவு',
  alerts: 'அறிவிப்புகள்',
  profile: 'சுயவிவரம்',
  myTrip: 'என் பயணம்',
  students: 'மாணவர்கள்',
  maintenance: 'பராமரிப்பு',
  settings: 'அமைப்புகள்',
  schools: 'பள்ளிகள்',
  billing: 'கட்டணப் பட்டியல்',
  revenue: 'வருவாய்',
  expenses: 'செலவுகள்',
  buses: 'பேருந்துகள்',
  routes: 'வழிகள்',
  drivers: 'ஓட்டுநர்கள்',
  tracking: 'கண்காணிப்பு',
  notifications: 'அறிவிப்புகள்',
  reports: 'அறிக்கைகள்',
  logout: 'வெளியேறு',

  // Dashboard — Super Admin
  platformDashboard: 'தளக் கட்டுப்பாட்டகம்',
  totalSchools: 'மொத்த பள்ளிகள்',
  totalStudents: 'மொத்த மாணவர்கள்',
  totalBuses: 'மொத்த பேருந்துகள்',
  monthlyRevenue: 'மாதாந்திர வருவாய்',
  totalOverdue: 'மொத்த நிலுவை',
  recentInvoices: 'சமீபத்திய விலைப்பட்டியல்கள்',
  noInvoicesYet: 'விலைப்பட்டியல்கள் இல்லை',
  liveData: 'நேரடி தரவு',
  viewAll: 'அனைத்தையும் காண்க',

  // Dashboard — Admin
  adminDashboard: 'நிர்வாக டாஷ்போர்டு',
  totalDrivers: 'மொத்த ஓட்டுநர்கள்',
  totalRoutes: 'மொத்த வழிகள்',
  activeBuses: 'செயல்பாட்டில் பேருந்துகள்',
  feesCollected: 'வசூல் கட்டணம்',
  attendanceToday: 'இன்றைய வருகை',
  activeRoutes: 'செயல்பாட்டில் வழிகள்',
  todayTrips: 'இன்றைய பயணங்கள்',

  // Dashboard — Driver
  driverDashboard: 'ஓட்டுநர் டாஷ்போர்டு',
  welcomeBack: 'மீண்டும் வருக',
  currentRoute: 'தற்போதைய வழி',
  startShift: 'பணி தொடங்கு',
  endShift: 'பணி முடிவு',
  noActiveRoute: 'செயல்பாட்டில் வழி இல்லை',
  tripInProgress: 'பயணம் நடக்கிறது',
  tripNotStarted: 'பயணம் தொடங்கவில்லை',
  startTrip: 'பயணம் தொடங்கு',
  endTrip: 'பயணம் முடிவு',
  todayRoute: 'இன்றைய வழி',

  // Dashboard — Parent
  parentDashboard: 'பெற்றோர் டாஷ்போர்டு',
  yourChild: 'உங்கள் குழந்தை',
  busStatus: 'பேருந்து நிலை',
  nextStop: 'அடுத்த நிறுத்தம்',
  busOnWay: 'பேருந்து வருகிறது',
  busArrived: 'பேருந்து வந்தது',
  busNotStarted: 'பயணம் தொடங்கவில்லை',
  myChild: 'என் குழந்தை',
  selectChild: 'குழந்தையை தேர்வு செய்யுங்கள்',
  waitingForTrip: 'பயணம் தொடங்குவதற்காக காத்திருக்கிறோம்...',
  busStops: 'நிறுத்தங்கள்',
  yourStop: 'உங்கள் நிறுத்தம்',
  myBus: 'என் பேருந்து',

  // Status
  active: 'செயல்பாட்டில்',
  inactive: 'செயலற்றது',
  suspended: 'இடைநிறுத்தப்பட்டது',
  present: 'வந்தனர்',
  absent: 'வரவில்லை',
  late: 'தாமதம்',
  moving: 'நகர்கிறது',
  stopped: 'நிறுத்தப்பட்டது',
  pending: 'நிலுவையில்',
  paid: 'செலுத்தப்பட்டது',
  overdue: 'தாமதமானது',
  approved: 'அனுமதிக்கப்பட்டது',
  rejected: 'நிராகரிக்கப்பட்டது',
  completed: 'முடிந்தது',
  running: 'இயங்குகிறது',
  boarded: 'ஏறியவர்',
  dropped: 'இறங்கினர்',
  notBoarded: 'ஏறவில்லை',

  // Table / List headers
  name: 'பெயர்',
  email: 'மின்னஞ்சல்',
  phone: 'தொலைபேசி',
  actions: 'செயல்கள்',
  status: 'நிலை',
  date: 'தேதி',
  amount: 'தொகை',
  description: 'விவரம்',
  grade: 'வகுப்பு',
  route: 'வழி',
  stop: 'நிறுத்தம்',
  busNumber: 'பேருந்து எண்',
  licenseNo: 'உரிம எண்',
  capacity: 'இடக்கொள்ளல்',
  registration: 'பதிவு எண்',
  assignedBus: 'ஒதுக்கப்பட்ட பேருந்து',
  startPoint: 'தொடக்க புள்ளி',
  endPoint: 'இறுதி புள்ளி',
  sequence: 'வரிசை',
  pickupTime: 'ஏறும் நேரம்',
  school: 'பள்ளி',

  // Buttons & Actions
  add: 'சேர்',
  edit: 'திருத்து',
  delete: 'நீக்கு',
  save: 'சேமி',
  cancel: 'ரத்து செய்',
  submit: 'சமர்ப்பி',
  search: 'தேடு',
  filter: 'வடிகட்டு',
  create: 'உருவாக்கு',
  update: 'புதுப்பி',
  close: 'மூடு',
  confirm: 'உறுதிப்படுத்து',
  back: 'திரும்பு',
  retry: 'மீண்டும் முயற்சி',
  export: 'ஏற்றுமதி',
  import: 'இறக்குமதி',
  approve: 'அனுமதி',
  reject: 'நிராகரி',
  resolve: 'தீர்க்கவும்',
  assign: 'ஒதுக்கு',
  unassign: 'நீக்கு',
  addExpense: 'செலவு சேர்க்கவும்',
  addStudent: 'மாணவர் சேர்',
  addBus: 'பேருந்து சேர்',
  addRoute: 'வழி சேர்',
  addDriver: 'ஓட்டுநர் சேர்',

  // Labels
  today: 'இன்று',
  history: 'வரலாறு',
  thisMonth: 'இந்த மாதம்',
  thisWeek: 'இந்த வாரம்',
  total: 'மொத்தம்',
  loading: 'ஏற்றுகிறது...',
  error: 'பிழை',
  noData: 'தரவு இல்லை',
  updated: 'புதுப்பிக்கப்பட்டது',
  onBoard: 'பேருந்தில் உள்ளவர்',
  missing: 'இல்லாதவர்',
  speed: 'வேகம்',

  // Attendance
  studentAttendance: 'மாணவர் வருகை பதிவு',
  thisMonthAttendance: 'இந்த மாதம் வருகை சதவீதம்',
  markAll: 'அனைவரும் குறிக்கவும்',
  markPresent: 'வந்ததாக குறிக்கவும்',
  markDropped: 'இறங்கியதாக குறிக்கவும்',
  markAbsent: 'வரவில்லை என குறிக்கவும்',
  noStudents: 'மாணவர்கள் இல்லை',

  // Profile
  myStats: 'என் புள்ளிவிவரம்',
  changePassword: 'கடவுச்சொல் மாற்று',
  language: 'மொழி',
  helpSupport: 'உதவி & ஆதரவு',
  notificationPreferences: 'அறிவிப்பு விருப்பங்கள்',
  editProfile: 'சுயவிவரம் திருத்து',
  saveChanges: 'மாற்றங்கள் சேமி',
  currentPassword: 'தற்போதைய கடவுச்சொல்',
  newPassword: 'புதிய கடவுச்சொல்',
  confirmPassword: 'கடவுச்சொல் உறுதிப்படுத்து',

  // Alerts & Notifications
  todayAlerts: 'இன்றைய அறிவிப்புகள்',
  markAllRead: 'அனைத்தையும் படித்ததாக குறிக்கவும்',
  noNotifications: 'அறிவிப்புகள் இல்லை',
  unread: 'படிக்காதவை',
  liveAlerts: 'நேரடி அறிவிப்புகள்',
  systemUpdates: 'கணினி புதுப்பிப்புகள்',

  // Fees
  transportFee: 'போக்குவரத்து கட்டணம்',
  dueDate: 'கட்டண தேதி',
  payNow: 'இப்போது செலுத்து',
  requestDelay: 'தேதி தள்ளிவைக்கவும்',
  reason: 'காரணம்',
  totalDue: 'மொத்த நிலுவை',
  collectedThisMonth: 'இந்த மாதம் வசூல்',
  feeAmount: 'கட்டண தொகை',
  receipt: 'ரசீது',
  paymentHistory: 'செலுத்தல் வரலாறு',

  // Requests
  leaveRequest: 'விடுப்பு கோரிக்கை',
  stopChange: 'நிறுத்தம் மாற்று',
  reportAbsent: 'வராமல் தெரிவிக்கவும்',
  changeStop: 'நிறுத்தம் மாற்று',
  permanentChange: 'நிரந்தர மாற்றம்',
  temporaryChange: 'தற்காலிக மாற்றம்',
  requestPending: 'கோரிக்கை நிலுவையில்',
  requestApproved: 'கோரிக்கை அனுமதிக்கப்பட்டது',
  requestRejected: 'கோரிக்கை நிராகரிக்கப்பட்டது',
  noRequests: 'கோரிக்கைகள் இல்லை',

  // SOS
  sos: 'அவசரநிலை',
  sosActive: 'அவசர நிலை செயல்பாட்டில்',
  cancelSos: 'அவசர நிலை ரத்து செய்',
  triggerSos: 'அவசர உதவி அழைக்கவும்',

  // Maintenance
  partName: 'பாகம் பெயர்',
  cost: 'விலை',
  totalCost: 'மொத்த விலை',
  addRecord: 'பதிவு சேர்',
  noRecords: 'பதிவுகள் இல்லை',

  // Fuel
  fuelRequests: 'எரிபொருள் கோரிக்கைகள்',
  fuelFill: 'எரிபொருள் நிரப்பல்',
  litres: 'லிட்டர்',
  odometer: 'ஒடோமீட்டர்',

  // Shifts
  shiftLogs: 'பணி பதிவுகள்',
  startKm: 'தொடக்க கி.மீ',
  endKm: 'இறுதி கி.மீ',
  totalKm: 'மொத்த கி.மீ',

  // Tracking
  liveTracking: 'நேரடி கண்காணிப்பு',
  busLocation: 'பேருந்து இருப்பிடம்',
  noActiveTrips: 'செயல்பாட்டில் பயணங்கள் இல்லை',
  lastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது',

  // Billing / Invoice
  invoice: 'விலைப்பட்டியல்',
  invoices: 'விலைப்பட்டியல்கள்',
  billingMonth: 'பில்லிங் மாதம்',
  subscriptionPlan: 'சந்தா திட்டம்',
  paymentMethod: 'செலுத்தல் முறை',
  downloadReceipt: 'ரசீது பதிவிறக்கம்',

  // Greetings
  goodMorning: 'வணக்கம்',
  helloUser: 'வணக்கம்',

  // Misc
  days: 'நாட்கள்',
  absences: 'வராத நாட்கள்',
  monthly: 'மாதாந்திர',
  callDriver: 'ஓட்டுநரை அழைக்கவும்',
  noSchoolsFound: 'பள்ளிகள் இல்லை',
  noStudentsFound: 'மாணவர்கள் இல்லை',
  noBusesFound: 'பேருந்துகள் இல்லை',
  noDriversFound: 'ஓட்டுநர்கள் இல்லை',
  noRoutesFound: 'வழிகள் இல்லை',
  addNew: 'புதிதாக சேர்',
  yes: 'ஆம்',
  no: 'இல்லை',
  of: 'இல்',
  page: 'பக்கம்',
  rows: 'வரிசைகள்',
  allStatus: 'அனைத்து நிலை',
  allRoles: 'அனைத்து பதவிகள்',
  searchPlaceholder: 'தேடுக...',
  confirmDelete: 'நீக்க உறுதிப்படுத்து',
  deleteWarning: 'இந்த நடவடிக்கையை செயல்தவிர்க்க முடியாது.',
  successSaved: 'வெற்றிகரமாக சேமிக்கப்பட்டது',
  errorOccurred: 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
} as const;
