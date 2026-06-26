// Redirect hub — the Gate in _layout decides where to go based on auth + role.
import { Loader } from '@/components/ui';

export default function Index() {
    return <Loader label="Loading…" />;
}
