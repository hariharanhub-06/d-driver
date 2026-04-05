'use client';

import { Ticket, Search, MoreHorizontal, Eye, Trash, Edit } from 'lucide-react';
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
            <td className="px-4 py-4 text-sm font-bold text-primary-600">{item.bookingNo}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{item.passenger}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{item.bus}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{item.route}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{item.seat}</td>
            <td className="px-4 py-4 text-sm">
                <span className={item.payment === 'Paid' ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}>
                    {item.payment}
                </span>
            </td>
            <td className="px-4 py-4 text-sm">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                    {item.status}
                </span>
            </td>
            <td className="px-4 py-4 text-sm text-gray-500">{item.date}</td>
            <td className="px-4 py-4 text-right">
                <button className="p-1 px-2 border border-gray-200 rounded text-gray-400 hover:text-primary-500 transition-colors">
                    <MoreHorizontal size={14} />
                </button>
            </td>
        </>
    );

    return (
        <div className="space-y-6 animate-in">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-700">Ticket List</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="hover:text-primary-500 cursor-pointer">Dashboard</span>
                    <span>/</span>
                    <span className="font-semibold text-gray-700">Ticket List</span>
                </div>
            </div>

            <DataTable
                title="Latest Bookings"
                headers={headers}
                data={mockBookings}
                renderRow={renderRow}
            />
        </div>
    );
}
