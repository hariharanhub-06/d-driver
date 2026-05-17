'use client';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: string;
    variant?: 'filled' | 'default';
    href?: string;
    color?: string; // legacy support
}

export default function StatCard({ title, value, subtitle, icon, trend, variant = 'default', href, color }: StatCardProps) {
    const isFilled = variant === 'filled';
    const content = (
        <div className={cn(
            'rounded-2xl p-6 transition-all duration-200',
            isFilled
                ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20'
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md'
        )}>
            <div className="flex items-start justify-between mb-4">
                <p className={cn('text-sm font-medium', isFilled ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>{title}</p>
                <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center',
                    isFilled ? 'bg-white/20' : 'bg-[var(--brand)]/10'
                )}>
                    {icon && <span className={isFilled ? 'text-white' : 'text-[var(--brand)]'}>{icon}</span>}
                    {!icon && href && <ArrowUpRight className={cn('w-4 h-4', isFilled ? 'text-white' : 'text-[var(--brand)]')} />}
                </div>
            </div>
            <p className={cn('text-3xl font-bold tracking-tight', isFilled ? 'text-white' : 'text-slate-900 dark:text-white')}>{value}</p>
            {(subtitle || trend) && (
                <div className="mt-2 flex items-center gap-1.5">
                    {trend && <TrendingUp className={cn('w-3.5 h-3.5', isFilled ? 'text-white/70' : 'text-emerald-500')} />}
                    <p className={cn('text-xs font-medium', isFilled ? 'text-white/70' : 'text-slate-500 dark:text-slate-400')}>{trend || subtitle}</p>
                </div>
            )}
        </div>
    );
    return href ? <Link href={href} className="block">{content}</Link> : content;
}
