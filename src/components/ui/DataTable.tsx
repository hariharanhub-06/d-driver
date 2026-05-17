'use client';

import { cn } from '@/lib/utils';
import { Download, Copy, FileText, Printer, FileSpreadsheet } from 'lucide-react';

interface DataTableProps {
    title?: string;
    headers: string[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
}

export default function DataTable({ title, headers, data, renderRow }: DataTableProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            {title && (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                    <div className="flex flex-wrap gap-2">
                        <ExportButton icon={Copy} label="Copy" primary={false} />
                        <ExportButton icon={FileText} label="CSV" primary={false} />
                        <ExportButton icon={FileSpreadsheet} label="Excel" primary={false} />
                        <ExportButton icon={Download} label="PDF" primary />
                        <ExportButton icon={Printer} label="Print" primary={false} />
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <th className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider w-12">#</th>
                            {headers.map((header) => (
                                <th key={header} className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700/50">
                                <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{index + 1}</td>
                                {renderRow(item, index)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                <p>Showing 1 to {data.length} of {data.length} entries</p>
                <div className="flex gap-1">
                    <button className="px-3 py-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Previous</button>
                    <button className="px-3 py-1 bg-[var(--brand)] text-white rounded-xl text-sm">1</button>
                    <button className="px-3 py-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Next</button>
                </div>
            </div>
        </div>
    );
}

function ExportButton({ icon: Icon, label, primary }: { icon: any; label: string; primary: boolean }) {
    return primary ? (
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--brand)] text-white rounded-xl hover:opacity-90 transition-all active:scale-95">
            <Icon size={13} />
            {label}
        </button>
    ) : (
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Icon size={13} />
            {label}
        </button>
    );
}
