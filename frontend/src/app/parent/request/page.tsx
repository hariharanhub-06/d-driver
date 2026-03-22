'use client';

import { useState } from 'react';
import { MapPin, Calendar, Clock, ArrowRight, CheckCircle, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StopChangeRequest() {
    const [step, setStep] = useState(1);
    const router = useRouter();

    const handleNext = () => setStep(s => s + 1);

    return (
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full">
            <div className="mb-8 mt-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Change Request</h2>
                <p className="text-slate-500 text-sm">Request a temporary or permanent stop modification.</p>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-primary-500" /> Current Stop
                        </h3>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                            <p className="font-bold text-slate-700 dark:text-slate-200">Central Library Main Gate</p>
                            <p className="text-xs text-slate-500 mt-1">Route A - Morning Dispatch</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center">
                            <Navigation className="w-5 h-5 mr-2 text-emerald-500" /> New Stop Location
                        </h3>
                        <select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500">
                            <option>City Park North</option>
                            <option>Main Market Cross</option>
                            <option>Tech Park Tower A</option>
                            <option>Old Station Gate</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-3 px-1 italic">* Only verified safe stops are listed here.</p>
                    </div>

                    <button onClick={handleNext} className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center group">
                        Next Step <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-orange-500" /> Effective Date
                        </h3>
                        <input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-purple-500" /> Request Type
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-4 border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-sm font-bold">Temporary</button>
                            <button className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500">Permanent</button>
                        </div>
                    </div>

                    <button onClick={handleNext} className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-600/20 active:scale-95 transition-all">
                        Submit Request
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-12 h-12 animate-in zoom-in" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Request Sent!</h3>
                    <p className="text-slate-500 text-sm max-w-[240px] mb-8">
                        Your stop change request has been forwarded to the transport admin. You will be notified once approved.
                    </p>
                    <button onClick={() => router.push('/parent/dashboard')} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-300">
                        Back to Home
                    </button>
                </div>
            )}
        </div>
    );
}
