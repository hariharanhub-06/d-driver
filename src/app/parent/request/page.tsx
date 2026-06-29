import { redirect } from 'next/navigation';

// Legacy route — the stop-change/leave request UI now lives at /parent/requests (plural).
// Kept as a permanent redirect so any old bookmarks still land on the current page.
export default function LegacyParentRequestRedirect() {
    redirect('/parent/requests');
}
