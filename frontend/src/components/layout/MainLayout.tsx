import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[var(--background)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
