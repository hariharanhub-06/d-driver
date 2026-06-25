import { ShieldAlert } from "lucide-react";

export default function AccessDenied403() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md w-full text-center bg-white border border-gray-200 rounded-2xl shadow-sm p-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                    <ShieldAlert size={32} className="text-red-500" />
                </div>
                <p className="mt-5 text-xs font-semibold tracking-widest text-red-500 uppercase">Error 403</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="mt-3 text-sm text-gray-500">
                    This site has been disabled by the administrator and is currently unavailable.
                </p>
            </div>
        </div>
    );
}
