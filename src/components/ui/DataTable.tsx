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
        <div className="card-premium">
            {title && (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-lg font-bold text-gray-700">{title}</h2>
                    <div className="flex flex-wrap gap-2">
                        <ExportButton icon={Copy} label="Copy" />
                        <ExportButton icon={FileText} label="CSV" />
                        <ExportButton icon={FileSpreadsheet} label="Excel" />
                        <ExportButton icon={Download} label="PDF" />
                        <ExportButton icon={Printer} label="Print" />
                    </div>
                </div>
            )}

            <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-y border-gray-200">
                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                            {headers.map((header) => (
                                <th key={header} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-4 text-sm text-gray-500">{index + 1}</td>
                                {renderRow(item, index)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-gray-500">
                <p>Showing 1 to {data.length} of {data.length} entries</p>
                <div className="flex gap-1">
                    <button className="px-3 py-1 border rounded hover:bg-gray-50">Previous</button>
                    <button className="px-3 py-1 bg-primary-500 text-white rounded">1</button>
                    <button className="px-3 py-1 border rounded hover:bg-gray-50">Next</button>
                </div>
            </div>
        </div>
    );
}

function ExportButton({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
            <Icon size={14} />
            {label}
        </button>
    );
}
