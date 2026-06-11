// Full bilingual translation set for all D-Driver portals
// Usage: const { label } = useLabel();  →  label(en, ta)
//
// `ta.*` still exported for direct inline use where needed (legacy pattern).

export const ta = {
  // Roles
  parent: 'பெற்றோர்',
  driver: 'ஓட்டுநர்',
  admin: 'நிர்வாகி',
  busStaff: 'பேருந்து ஊழியர்',

  // Navigation tabs
  track: 'கண்காணிப்பு',
  fees: 'கட்டணம்',
  requests: 'கோரிக்கைகள்',
  attendance: 'வருகை பதிவு',
  alerts: 'அறிவிப்புகள்',
  profile: 'சுயவிவரம்',
  myTrip: 'என் பயணம்',
  students: 'மாணவர்கள்',
  maintenance: 'பராமரிப்பு',

  // Greeting
  goodMorning: 'வணக்கம்',
  helloUser: 'வணக்கம்',

  // Status
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

  // Trip
  startTrip: 'பயணம் தொடங்கு',
  endTrip: 'பயணம் முடிவு',
  tripInProgress: 'பயணம் நடக்கிறது',
  tripNotStarted: 'பயணம் தொடங்கவில்லை',
  todayRoute: 'இன்றைய வழி',
  busStops: 'நிறுத்தங்கள்',
  myBus: 'என் பேருந்து',
  yourStop: 'உங்கள் நிறுத்தம்',
  school: 'பள்ளி',

  // Attendance
  studentAttendance: 'மாணவர் வருகை பதிவு',
  thisMonthAttendance: 'இந்த மாதம் வருகை சதவீதம்',
  today: 'இன்று',
  history: 'வரலாறு',
  boarded: 'ஏறியவர்',
  dropped: 'இறங்கினர்',
  notBoarded: 'ஏறவில்லை',
  markAll: 'அனைவரும் குறிக்கவும்',
  markPresent: 'வந்ததாக குறிக்கவும்',
  markDropped: 'இறங்கியதாக குறிக்கவும்',
  markAbsent: 'வரவில்லை என குறிக்கவும்',

  // Profile
  myChild: 'என் குழந்தை',
  myStats: 'என் புள்ளிவிவரம்',
  settings: 'அமைப்புகள்',
  logout: 'வெளியேறு',
  changePassword: 'கடவுச்சொல் மாற்று',
  language: 'மொழி',
  helpSupport: 'உதவி & ஆதரவு',
  notificationPreferences: 'அறிவிப்பு விருப்பங்கள்',

  // Alerts & Notifications
  todayAlerts: 'இன்றைய அறிவிப்புகள்',
  markAllRead: 'அனைத்தையும் படித்ததாக குறிக்கவும்',
  noNotifications: 'அறிவிப்புகள் இல்லை',
  unread: 'படிக்காதவை',

  // Fees
  transportFee: 'போக்குவரத்து கட்டணம்',
  dueDate: 'கட்டண தேதி',
  payNow: 'இப்போது செலுத்து',
  requestDelay: 'தேதி தள்ளிவைக்கவும்',
  reason: 'காரணம்',
  submit: 'சமர்ப்பி',
  cancel: 'ரத்து செய்',
  totalDue: 'மொத்த நிலுவை',
  collectedThisMonth: 'இந்த மாதம் வசூல்',

  // Requests (leave + stop change)
  leaveRequest: 'விடுப்பு கோரிக்கை',
  stopChange: 'நிறுத்தம் மாற்று',
  reportAbsent: 'வராமல் தெரிவிக்கவும்',
  changeStop: 'நிறுத்தம் மாற்று',

  // SOS
  sos: 'அவசரநிலை',
  sosActive: 'அவசர நிலை செயல்பாட்டில்',
  cancelSos: 'அவசர நிலை ரத்து செய்',
  resolve: 'தீர்க்கவும்',

  // Maintenance
  addExpense: 'செலவு சேர்க்கவும்',
  partName: 'பாகம் பெயர்',
  cost: 'விலை',
  totalCost: 'மொத்த விலை',
  description: 'விவரம்',
  date: 'தேதி',
  status: 'நிலை',

  // Driver
  callDriver: 'ஓட்டுநரை அழைக்கவும்',
  busNumber: 'பேருந்து எண்',
  route: 'வழி',
  grade: 'வகுப்பு',
  monthly: 'மாதாந்திர',
  days: 'நாட்கள்',
  absences: 'வராத நாட்கள்',

  // Misc
  speed: 'வேகம்',
  updated: 'புதுப்பிக்கப்பட்டது',
  onBoard: 'பேருந்தில் உள்ளவர்',
  missing: 'இல்லாதவர்',
  total: 'மொத்தம்',
  loading: 'ஏற்றுகிறது...',
  error: 'பிழை',
  retry: 'மீண்டும் முயற்சி',
  save: 'சேமி',
  edit: 'திருத்து',
  delete: 'நீக்கு',
  add: 'சேர்',
  search: 'தேடு',
  filter: 'வடிகட்டு',
  noData: 'தரவு இல்லை',
  selectChild: 'குழந்தையை தேர்வு செய்யுங்கள்',
  waitingForTrip: 'பயணம் தொடங்குவதற்காக காத்திருக்கிறோம்...',
} as const;

// Hook to return a bilingual label based on current language setting
// Import separately since this depends on the language context
export function biLabel(lang: 'en' | 'ta' | 'both', en: string, tamil: string): string {
  if (lang === 'en') return en;
  if (lang === 'ta') return tamil;
  return `${en} / ${tamil}`;
}
