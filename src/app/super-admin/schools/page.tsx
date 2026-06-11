'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const LogoCropModal = dynamic(() => import('@/components/ui/LogoCropModal'), { ssr: false });
import {
    Building2, Search, Plus, Loader2, ShieldCheck, Edit, Trash2,
    Globe, ExternalLink, Copy, Truck, Users, GraduationCap,
    X, MapPin, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
    UserPlus, Settings2, Route, UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';

interface School {
    id: string;
    name: string;
    slug: string;
    address?: string;
    logo_url?: string;
    primary_color?: string;
    status: string;
    plan_id?: string;
    permissions?: Record<string, boolean>;
    assigned_sa_id?: string | null;
    assignedSA?: { id: string; name: string; email: string } | null;
    _count?: { buses: number; students: number; drivers: number };
}

interface SAUserBasic {
    id: string;
    name: string;
    email: string;
    is_dev_sa: boolean;
}

// ── Real feature permission keys ────────────────────────────────────────────
const FEATURES: { key: string; label: string; description: string }[] = [
    { key: 'gps_tracking',         label: 'GPS Tracking',          description: 'Live bus location for parents and admin' },
    { key: 'fee_management',       label: 'Fee Management',         description: 'Fee collection, invoices, and payments' },
    { key: 'fuel_management',      label: 'Fuel Management',        description: 'Fuel requests, fills, and cost tracking' },
    { key: 'shift_tracking',       label: 'Shift & KM Tracking',   description: 'Driver shift logs and odometer entries' },
    { key: 'attendance',           label: 'Attendance',             description: 'Driver marks student boarding/drop' },
    { key: 'parent_portal',        label: 'Parent Portal',          description: 'Parent app with tracking and notifications' },
    { key: 'route_management',     label: 'Route Management',       description: 'Create and edit routes and stops' },
    { key: 'student_photos',       label: 'Student Photos',         description: 'Upload and display student profile photos' },
    { key: 'stop_change_requests', label: 'Stop Change Requests',   description: 'Parents can request stop changes' },
    { key: 'absence_reporting',    label: 'Absence Reporting',      description: 'Parents pre-report student absence' },
    { key: 'razorpay_payments',    label: 'Online Payments',        description: 'Razorpay integration for fee payments' },
];

const DEFAULT_PERMISSIONS = Object.fromEntries(
    FEATURES.map(f => [f.key, f.key !== 'razorpay_payments'])
) as Record<string, boolean>;

const inputCls = "w-full bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] transition-all";

function Backdrop({ onClick }: { onClick: () => void }) {
    return (
        <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100]"
            onClick={onClick}
        />
    );
}

export default function SchoolsManagement() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const t = useT();
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // ── Assign SA modal ──────────────────────────────────────────────────────
    const [assignSASchool, setAssignSASchool] = useState<School | null>(null);
    const [saUsers, setSAUsers] = useState<SAUserBasic[]>([]);
    const [selectedSAId, setSelectedSAId] = useState<string>('');
    const [assignSubmitting, setAssignSubmitting] = useState(false);
    const [assignError, setAssignError] = useState('');

    // ── Create/Edit modal ────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const [formData, setFormData] = useState({
        name: '', slug: '', address: '', primary_color: '#3B82F6', logo_url: '',
        phone: '', email_contact: '',
        // First admin (only for new school)
        admin_name: '', admin_email: '', admin_phone: '', admin_password: '',
    });
    const [permissions, setPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // ── Admin modal (for existing schools) ───────────────────────────────────
    const [adminSchool, setAdminSchool] = useState<School | null>(null);
    const [schoolAdmins, setSchoolAdmins] = useState<any[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    const [adminError, setAdminError] = useState('');

    // ── Find & Fix orphaned user ─────────────────────────────────────────────
    const [fixEmail, setFixEmail] = useState('');
    const [fixUserResult, setFixUserResult] = useState<any>(null);
    const [fixUserLoading, setFixUserLoading] = useState(false);
    const [fixUserMsg, setFixUserMsg] = useState('');
    const [fixTargetRole, setFixTargetRole] = useState('driver');

    const handleFindUser = async () => {
        if (!fixEmail.trim()) return;
        setFixUserLoading(true);
        setFixUserResult(null);
        setFixUserMsg('');
        try {
            const { data } = await api.get('/users', { params: { email: fixEmail.trim() } });
            const found = Array.isArray(data) ? data.find((u: any) => u.email.toLowerCase() === fixEmail.trim().toLowerCase()) : null;
            if (found) setFixUserResult(found);
            else setFixUserMsg('No user found with that email.');
        } catch { setFixUserMsg('Search failed.'); }
        finally { setFixUserLoading(false); }
    };

    const handleFixRole = async () => {
        if (!fixUserResult || !adminSchool) return;
        try {
            await api.patch(`/users/${fixUserResult.id}`, { role: fixTargetRole, school_id: adminSchool.id });
            setFixUserMsg(`✓ ${fixUserResult.name} changed to ${fixTargetRole} in ${adminSchool.name}.`);
            setFixUserResult(null);
            setFixEmail('');
        } catch (err: any) { setFixUserMsg(err.response?.data?.error || 'Failed to fix role.'); }
    };

    const handleDeleteFixUser = async () => {
        if (!fixUserResult || !confirm(`Delete user ${fixUserResult.email}? This cannot be undone.`)) return;
        try {
            await api.delete(`/users/${fixUserResult.id}`);
            setFixUserMsg(`✓ User ${fixUserResult.email} deleted.`);
            setFixUserResult(null);
            setFixEmail('');
        } catch (err: any) { setFixUserMsg(err.response?.data?.error || 'Failed to delete user.'); }
    };

    // ── Temp password shown after school creation ────────────────────────────
    const [tempPassword, setTempPassword] = useState('');

    // ── Status toggle loading ────────────────────────────────────────────────
    const [toggleLoading, setToggleLoading] = useState<string | null>(null);

    useEffect(() => { fetchSchools(); }, []);

    const fetchSchools = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/schools');
            setSchools(Array.isArray(data) ? data : []);
        } catch {
            setSchools([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
        setFormData(p => ({ ...p, name, slug }));
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ name: '', slug: '', address: '', primary_color: '#3B82F6', logo_url: '', phone: '', email_contact: '', admin_name: '', admin_email: '', admin_phone: '', admin_password: '' });
        setPermissions(DEFAULT_PERMISSIONS);
        setLogoFile(null);
        setActiveTab('profile');
        setModalError('');
        setModalSuccess('');
        setTempPassword('');
        setIsModalOpen(true);
    };

    const openEdit = (school: School) => {
        setEditingId(school.id);
        setFormData({
            name: school.name || '', slug: school.slug || '',
            address: school.address || '', primary_color: school.primary_color || '#3B82F6',
            logo_url: school.logo_url || '', phone: '', email_contact: '',
            admin_name: '', admin_email: '', admin_phone: '', admin_password: '',
        });
        setPermissions({ ...DEFAULT_PERMISSIONS, ...(school.permissions || {}) });
        setLogoFile(null);
        setActiveTab('profile');
        setModalError('');
        setModalSuccess('');
        setTempPassword('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!formData.name.trim() || !formData.slug.trim()) {
            setModalError('School name and portal URL are required.');
            return;
        }
        if (!editingId && (!formData.admin_name.trim() || !formData.admin_email.trim())) {
            setModalError('First admin name and email are required.');
            setActiveTab('profile');
            return;
        }
        if (!editingId && !formData.admin_password.trim()) {
            setModalError('Admin password is required.');
            setActiveTab('profile');
            return;
        }

        setIsSubmitting(true);
        try {
            // Logo upload via ImageKit
            let finalLogoUrl = formData.logo_url;
            if (logoFile) {
                try {
                    const fd = new FormData();
                    fd.append('file', logoFile);
                    fd.append('folder', 'schools');
                    const { data: uploadData } = await api.post('/upload/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    if (!uploadData?.url) throw new Error('No URL returned');
                    finalLogoUrl = uploadData.url;
                } catch (uploadErr: any) {
                    setModalError('Logo upload failed — ' + (uploadErr?.response?.data?.error || uploadErr?.message || 'check ImageKit env vars') + '. Saving without logo.');
                }
            }

            if (editingId) {
                // Update basic info — send undefined (not '') for blank optional fields
                await api.put(`/schools/${editingId}`, {
                    name: formData.name,
                    address: formData.address || undefined,
                    primary_color: formData.primary_color,
                    logo_url: finalLogoUrl || undefined,
                    phone: formData.phone || undefined,
                    email_contact: formData.email_contact || undefined,
                });
                // Update permissions separately
                await api.put(`/schools/${editingId}/permissions`, { permissions });
                setModalSuccess('School updated successfully.');
            } else {
                // Create school + first admin — send undefined (not '') for blank optional fields
                const { data: created } = await api.post('/schools', {
                    name: formData.name, slug: formData.slug,
                    address: formData.address || undefined,
                    primary_color: formData.primary_color,
                    logo_url: finalLogoUrl || undefined,
                    phone: formData.phone || undefined,
                    email_contact: formData.email_contact || undefined,
                    admin_name: formData.admin_name, admin_email: formData.admin_email,
                    admin_phone: formData.admin_phone || undefined,
                    admin_password: formData.admin_password,
                });
                setTempPassword(created.temp_password || '');
                setModalSuccess(`School created! Admin: ${formData.admin_email}`);
            }

            fetchSchools();
            setTimeout(() => {
                setIsModalOpen(false);
            }, 1500);
        } catch (err: any) {
            setModalError(err.response?.data?.error || err.response?.data?.message || 'Failed to save school.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (school: School) => {
        setToggleLoading(school.id);
        try {
            await api.patch(`/schools/${school.id}/status`, {});
            fetchSchools();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update status.');
        } finally {
            setToggleLoading(null);
        }
    };

    const openAssignSA = async (school: School) => {
        setAssignSASchool(school);
        setSelectedSAId(school.assigned_sa_id || '');
        setAssignError('');
        try {
            const { data } = await api.get('/users/sa');
            setSAUsers((Array.isArray(data) ? data : []).filter((u: SAUserBasic) => !u.is_dev_sa));
        } catch { setSAUsers([]); }
    };

    const handleAssignSA = async () => {
        if (!assignSASchool) return;
        setAssignSubmitting(true);
        setAssignError('');
        try {
            await api.put(`/schools/${assignSASchool.id}/assign-sa`, { sa_id: selectedSAId || null });
            setAssignSASchool(null);
            fetchSchools();
        } catch (err: any) {
            setAssignError(err.response?.data?.error || 'Failed to assign SA');
        } finally {
            setAssignSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this school and all its data? This cannot be undone.')) return;
        try {
            await api.delete(`/schools/${id}`);
            fetchSchools();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete school.');
        }
    };

    const openAdminModal = async (school: School) => {
        setFixEmail(''); setFixUserResult(null); setFixUserMsg('');
        setAdminSchool(school);
        setAdminForm({ name: '', email: '', phone: '', password: '' });
        setAdminError('');
        setLoadingAdmins(true);
        try {
            const { data } = await api.get(`/users?school_id=${school.id}&role=admin`);
            setSchoolAdmins(Array.isArray(data) ? data : []);
        } catch {
            setSchoolAdmins([]);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminSchool) return;
        setAdminError('');
        if (!adminForm.password || adminForm.password.length < 8) {
            setAdminError('Password must be at least 8 characters.');
            return;
        }
        setAdminSubmitting(true);
        try {
            const { data } = await api.post('/users', {
                name: adminForm.name, email: adminForm.email.toLowerCase(),
                phone: adminForm.phone || undefined, password: adminForm.password,
                role: 'admin', school_id: adminSchool.id,
            });
            setSchoolAdmins(p => [...p, data]);
            setAdminForm({ name: '', email: '', phone: '', password: '' });
        } catch (err: any) {
            setAdminError(err.response?.data?.error || err.response?.data?.message || 'Failed to create admin.');
        } finally {
            setAdminSubmitting(false);
        }
    };

    const handleDeleteAdmin = async (userId: string) => {
        if (!confirm('Remove this admin?')) return;
        try {
            await api.delete(`/users/${userId}`);
            setSchoolAdmins(p => p.filter(u => u.id !== userId));
        } catch {
            alert('Failed to remove admin.');
        }
    };

    const handleToggleAdminActive = async (admin: any) => {
        try {
            await api.patch(`/users/${admin.id}/active`, {});
            setSchoolAdmins(p => p.map(u => u.id === admin.id ? { ...u, is_active: !u.is_active } : u));
        } catch {
            alert('Failed to update status.');
        }
    };

    const filtered = schools.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug?.includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-[var(--brand)]" />
                        {t('Schools', 'பள்ளிகள்')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Manage all school networks on the platform', 'அனைத்து பள்ளி நெட்வொர்க்குகளை நிர்வகிக்கவும்')}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all active:scale-95 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> {t('Add School', 'பள்ளி சேர்க்கவும்')}
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('Search schools...', 'பள்ளிகளை தேடுங்கள்...')}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 shrink-0 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Active', 'செயலில்')}</p>
                    <p className="text-xl font-bold text-[var(--brand)]">{schools.filter(s => s.status === 'active').length}</p>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{t('No schools yet', 'இன்னும் பள்ளிகள் இல்லை')}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Add your first school to get started', 'தொடங்க உங்கள் முதல் பள்ளியை சேர்க்கவும்')}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map(school => (
                        <div key={school.id} className={cn(
                            "bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md",
                            school.status !== 'active' && "opacity-60"
                        )}>
                            <div className="h-1.5 w-full" style={{ backgroundColor: school.primary_color || '#3B82F6' }} />
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="relative w-11 h-11 rounded-xl border border-slate-100 dark:border-slate-600 overflow-hidden shrink-0 bg-white dark:bg-white flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-slate-300" />
                                        {school.logo_url && (
                                            <img src={school.logo_url} alt={school.name} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button onClick={() => router.push(`/super-admin/schools/${school.id}`)} title={t('View Details', 'விவரங்கள் காண்க')} className="p-1.5 rounded-lg hover:bg-[var(--brand)]/10 text-slate-400 hover:text-[var(--brand)] transition-all"><Settings2 className="w-4 h-4" /></button>
                                        <button onClick={() => openAdminModal(school)} title="Manage Admins" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"><ShieldCheck className="w-4 h-4" /></button>
                                        <button onClick={() => openEdit(school)} title={t('Edit', 'திருத்து')} className="p-1.5 rounded-lg hover:bg-[var(--brand)]/10 text-slate-400 hover:text-[var(--brand)] transition-all"><Edit className="w-4 h-4" /></button>
                                        <button
                                            onClick={() => handleToggleStatus(school)}
                                            title={school.status === 'active' ? t('Suspend', 'இடைநிறுத்து') : t('Activate', 'செயல்படுத்து')}
                                            disabled={toggleLoading === school.id}
                                            className={cn("p-1.5 rounded-lg transition-all", school.status === 'active' ? "hover:bg-orange-50 dark:hover:bg-orange-900/30 text-slate-400 hover:text-orange-500" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-500")}
                                        >
                                            {toggleLoading === school.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : school.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />
                                            }
                                        </button>
                                        <button onClick={() => handleDelete(school.id)} title={t('Delete', 'நீக்கு')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{school.name}</h3>
                                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                            school.status === 'active' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                                        )}>
                                            <span className={cn("w-1 h-1 rounded-full", school.status === 'active' ? "bg-emerald-500" : "bg-slate-400")} />
                                            {school.status === 'active' ? t('Active', 'செயலில்') : t('Suspended', 'இடைநிறுத்தம்')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">{school.slug}.ddriver365.com</p>
                                </div>

                                {currentUser?.is_dev_sa && (
                                    <div
                                        onClick={() => openAssignSA(school)}
                                        className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl border cursor-pointer transition-all bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                                    >
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                            {school.assignedSA ? (
                                                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 truncate">{school.assignedSA.name}</span>
                                            ) : (
                                                <span className="text-xs font-medium text-violet-400 dark:text-violet-500">No SA assigned</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-semibold text-violet-400 dark:text-violet-500 uppercase tracking-wide shrink-0">
                                            {school.assignedSA ? 'Change' : 'Assign →'}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    {[
                                        { label: t('Buses', 'பேருந்துகள்'), count: school._count?.buses ?? 0, icon: Truck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                                        { label: t('Drivers', 'ஓட்டுனர்கள்'), count: school._count?.drivers ?? 0, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                        { label: t('Students', 'மாணவர்கள்'), count: school._count?.students ?? 0, icon: GraduationCap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                    ].map(stat => (
                                        <div key={stat.label} className={cn("rounded-xl p-2 flex flex-col items-center gap-0.5", stat.bg)}>
                                            <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{stat.count}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── ASSIGN SA MODAL ────────────────────────────────────────────────── */}
            {assignSASchool && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <UserCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assign SA</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{assignSASchool.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setAssignSASchool(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Assign to SA</label>
                                <select
                                    value={selectedSAId}
                                    onChange={e => setSelectedSAId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                                >
                                    <option value="">— Unassigned —</option>
                                    {saUsers.map(sa => (
                                        <option key={sa.id} value={sa.id}>{sa.name} ({sa.email})</option>
                                    ))}
                                </select>
                            </div>
                            {assignError && <p className="text-xs text-red-500">{assignError}</p>}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setAssignSASchool(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button onClick={handleAssignSA} disabled={assignSubmitting} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {assignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {t('Save', 'சேமி')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LOGO CROP MODAL ─────────────────────────────────────────────────── */}
            {cropSrc && (
                <LogoCropModal
                    src={cropSrc}
                    onConfirm={file => { setLogoFile(file); setCropSrc(null); }}
                    onCancel={() => { setCropSrc(null); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                />
            )}

            {/* ── CREATE / EDIT MODAL ────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />

                    {/* Modal card — centered, no scrolling needed */}
                    <div className="relative flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5 text-[var(--brand)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{editingId ? t('Edit School', 'பள்ளியை திருத்து') : t('Add School', 'பள்ளி சேர்க்கவும்')}</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{editingId ? 'Update details and feature permissions' : 'Create school + first admin account'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Tabs — only shown when editing (permissions tab) */}
                            {editingId && (
                                <div className="flex border-b border-slate-100 dark:border-slate-700 px-6">
                                    {(['profile', 'permissions'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-all",
                                                activeTab === tab ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            )}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="px-6 py-5">
                                    {/* Profile tab (always shown on create; shown on edit when tab=profile) */}
                                    {(!editingId || activeTab === 'profile') && (
                                        <div className="space-y-4">
                                            {/* Row 1: Name + Slug */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('School Name', 'பள்ளி பெயர்')} *</label>
                                                    <input type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} placeholder="St. Joseph's School" required className={inputCls} autoFocus />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Portal Slug *</label>
                                                    <div className="flex items-center bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand)]/30 focus-within:border-[var(--brand)] transition-all">
                                                        <input
                                                            type="text"
                                                            value={formData.slug}
                                                            onChange={e => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                                            disabled={!!editingId}
                                                            placeholder="st-josephs"
                                                            className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 disabled:cursor-not-allowed"
                                                        />
                                                        <span className="text-[10px] text-slate-400 pr-2.5 shrink-0 whitespace-nowrap">.ddriver365.com</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 2: Address */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Address</label>
                                                <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, Chennai, Tamil Nadu" className={inputCls} />
                                            </div>

                                            {/* Row 3: Logo + Brand Color */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Logo</label>
                                                    <label className="flex items-center justify-center w-full h-11 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all group">
                                                        <span className="text-xs font-medium text-slate-400 group-hover:text-[var(--brand)] truncate px-4">{logoFile?.name || '+ Upload & crop logo'}</span>
                                                        <input
                                                            ref={logoInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const reader = new FileReader();
                                                                reader.onload = ev => setCropSrc(ev.target?.result as string);
                                                                reader.readAsDataURL(file);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Brand Color</label>
                                                    <div className="flex items-center h-11 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-3 rounded-xl gap-3">
                                                        <input type="color" value={formData.primary_color} onChange={e => setFormData(p => ({ ...p, primary_color: e.target.value }))} className="h-7 w-7 cursor-pointer rounded-md bg-transparent border-0 p-0" />
                                                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{formData.primary_color}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* First admin — only on create */}
                                            {!editingId && (
                                                <>
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-600" />
                                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">First Admin Account</span>
                                                        <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-600" />
                                                    </div>

                                                    {/* Row 4: Admin name + email */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Admin Name *</label>
                                                            <input type="text" value={formData.admin_name} onChange={e => setFormData(p => ({ ...p, admin_name: e.target.value }))} placeholder="John Doe" required className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Admin {t('Email', 'மின்னஞ்சல்')} *</label>
                                                            <input type="email" value={formData.admin_email} onChange={e => setFormData(p => ({ ...p, admin_email: e.target.value }))} placeholder="admin@school.com" required className={inputCls} />
                                                        </div>
                                                    </div>
                                                    {/* Row 5: Admin password */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Admin Password *</label>
                                                        <input type="password" value={formData.admin_password} onChange={e => setFormData(p => ({ ...p, admin_password: e.target.value }))} placeholder="Set admin login password" required className={inputCls} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Permissions tab — edit mode only, scrollable within fixed height */}
                                    {editingId && activeTab === 'permissions' && (
                                        <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Disabled features are hidden from the school's sidebar and API.</p>
                                            {FEATURES.map(f => (
                                                <label key={f.key} className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                    permissions[f.key] ? "bg-[var(--brand)]/5 border-[var(--brand)]/20" : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
                                                )}>
                                                    <div className="flex-1 mr-3">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.label}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{f.description}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPermissions(p => ({ ...p, [f.key]: !p[f.key] }))}
                                                        className={cn("w-10 h-6 rounded-full transition-all shrink-0 relative", permissions[f.key] ? "bg-[var(--brand)]" : "bg-slate-200 dark:bg-slate-600")}
                                                    >
                                                        <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all", permissions[f.key] ? "left-5" : "left-1")} />
                                                    </button>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* Error / Success */}
                                    {modalError && (
                                        <div className="flex items-center gap-2.5 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0" />{modalError}
                                        </div>
                                    )}
                                    {modalSuccess && (
                                        <div className="mt-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                                            <div className="flex items-start gap-2.5 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{modalSuccess}</span>
                                            </div>
                                            {tempPassword && (
                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-700">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wide">Admin Password</p>
                                                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{tempPassword}</p>
                                                    </div>
                                                    <button type="button" onClick={() => navigator.clipboard.writeText(tempPassword)} className="ml-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--brand)] transition-all" title="Copy password">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 pb-6 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        {t('Cancel', 'ரத்து செய்')}
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? t('Save', 'சேமி') : t('Add School', 'பள்ளி சேர்க்கவும்')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADMIN MANAGEMENT MODAL ─────────────────────────────────────────── */}
            {adminSchool && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAdminSchool(null)} />

                    {/* Modal card */}
                    <div className="relative flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Manage Admins</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{adminSchool.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setAdminSchool(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-5">
                                {/* Existing admins */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Current Admins</p>
                                    {loadingAdmins ? (
                                        <div className="flex justify-center py-6">
                                            <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : schoolAdmins.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">No admins yet</p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {schoolAdmins.map(admin => (
                                                <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{admin.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleToggleAdminActive(admin)} className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold transition-all", admin.is_active ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400")}>
                                                            {admin.is_active ? t('Suspend', 'இடைநிறுத்து') : t('Activate', 'செயல்படுத்து')}
                                                        </button>
                                                        <button onClick={() => handleDeleteAdmin(admin.id)} className="p-1.5 text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Add Admin</p>
                                    <form onSubmit={handleCreateAdmin} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                                                <input type="text" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} placeholder="John Doe" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('Email', 'மின்னஞ்சல்')} *</label>
                                                <input type="email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} required className={inputCls} placeholder="admin@school.com" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password * <span className="text-slate-400 font-normal">min. 8 chars</span></label>
                                            <input type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} required minLength={8} className={inputCls} placeholder="••••••••" />
                                        </div>
                                        {adminError && (
                                            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{adminError}
                                            </div>
                                        )}
                                        <div className="flex gap-3 pt-1">
                                            <button type="button" onClick={() => setAdminSchool(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                Close
                                            </button>
                                            <button type="submit" disabled={adminSubmitting} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                {adminSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add Admin</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Find & Fix orphaned user */}
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Find & Fix User</p>
                                    <div className="flex gap-2">
                                        <input type="email" value={fixEmail} onChange={e => { setFixEmail(e.target.value); setFixUserResult(null); setFixUserMsg(''); }} placeholder="Search by email..." className={`${inputCls} flex-1`} onKeyDown={e => e.key === 'Enter' && handleFindUser()} />
                                        <button type="button" onClick={handleFindUser} disabled={fixUserLoading} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50">
                                            {fixUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
                                        </button>
                                    </div>
                                    {fixUserResult && (
                                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{fixUserResult.name}</p>
                                                <p className="text-xs text-slate-500">{fixUserResult.email} · <span className="text-amber-600 dark:text-amber-400 font-medium">{fixUserResult.role}</span> · {fixUserResult.school?.name || <span className="text-red-500">No school (orphaned)</span>}</p>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <select value={fixTargetRole} onChange={e => setFixTargetRole(e.target.value)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none">
                                                    <option value="driver">driver</option>
                                                    <option value="bus_staff">bus_staff</option>
                                                    <option value="parent">parent</option>
                                                    <option value="admin">admin</option>
                                                </select>
                                                <button type="button" onClick={handleFixRole} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap">
                                                    Set Role
                                                </button>
                                                <button type="button" onClick={handleDeleteFixUser} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
                                                    {t('Delete', 'நீக்கு')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {fixUserMsg && <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">{fixUserMsg}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
