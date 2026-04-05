'use client';

import { Ticket, Search, MoreHorizontal, Eye, Trash, Edit, Filter, Download } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';

const mockBookings = [
    { id: '1', bookingNo: 'T20C8PCPWJ', passenger: 'Arun', bus: 'Coach 1', route: 'Chennai → Bangalore', seat: 'A1, A2', payment: 'Paid', status: 'Confirmed', date: '2026-04-05' },
    { id: '2', bookingNo: 'T20A8NCBNN', passenger: 'Rajesh', bus: 'Coach 2', route: 'Bangalore → Hyderabad', seat: 'B3', payment: 'Pending', status: 'Pending', date: '2026-04-06' },
    { id: '3', bookingNo: 'T20X5MKLPP', passenger: 'Meera', bus: 'Coach 1', route: 'Chennai → Pondicherry', seat: 'C5', payment: 'Paid', status: 'Confirmed', date: '2026-04-05' },
];

export default function BookingsPage() {
    const headers = ['Booking #', 'Passenger', 'Bus/Coach', 'Route', 'Seat', 'Payment', 'Status', 'Date', 'Action'];

    const renderRow = (item: any) => (
        <>
            <td className="px-4 py-3 text-[11px] font-black text-primary-600 uppercase tracking-tighter">{item.bookingNo}</td>
            <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{item.passenger}</td>
            <td className="px-4 py-3 text-xs font-medium text-slate-500">{item.bus}</td>
            <td className="px-4 py-3 text-xs font-medium text-slate-600">{item.route}</td>
            <td className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.seat}</td>
            <td className="px-4 py-3 text-xs">
                <span className={item.payment === 'Paid' ? 'text-emerald-600 font-black' : 'text-orange-500 font-black'}>
                    {item.payment}
                </span>
            </td>
            <td className="px-4 py-3 text-xs">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                    {item.status}
                </span>
            </td>
            <td className="px-4 py-3 text-[10px] text-slate-400 font-bold">{item.date}</td>
            <td className="px-4 py-3 text-right">
                <button className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <MoreHorizontal size={14} />
                </button>
            </td>
        </>
    );

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900 dark:text-white">Transit Bookings</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-primary-500" /> Comprehensive ticket history and revenue ledger.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600">
                        <Filter className="w-3.5 h-3.5 mr-2" /> Filter
                    </button>
                    <button className="flex-1 sm:flex-none btn-primary text-[10px] font-black uppercase tracking-widest py-2 px-4 shadow-primary-100">
                        <Download className="w-3.5 h-3.5 mr-2" /> Export
                    </button>
                </div>
            </div>

            <DataTable
                title="Active Manifest"
                headers={headers}
                data={mockBookings}
                renderRow={renderRow}
            />
        </div>
    );
}
