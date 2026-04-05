'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'indigo' | 'red' | 'blue' | 'cyan';
    href?: string;
}

const colorMap = {
    indigo: 'bg-stat-indigo',
    red: 'bg-stat-red',
    blue: 'bg-stat-blue',
    cyan: 'bg-stat-cyan',
};

export default function StatCard({ title, value, icon: Icon, color, href }: StatCardProps) {
    const bgColor = colorMap[color];

    const content = (
        <div className={cn("dashboard-stat-card text-white h-full", bgColor)}>
            <div className="p-5 flex items-center justify-between">
                <div className="flex flex-col">
                    <h3 className="text-3xl font-bold mb-1">{value}</h3>
                    <p className="text-sm font-medium opacity-80 uppercase tracking-wider">{title}</p>
                </div>
                <div className="opacity-30">
                    <Icon size={48} strokeWidth={1.5} />
                </div>
            </div>
            <div className="bg-black/10 px-5 py-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest hover:bg-black/20 transition-colors cursor-pointer">
                <span>View All</span>
                <span className="ml-1">→</span>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
}
