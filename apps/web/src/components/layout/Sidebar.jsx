import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Store,
    FileText,
    Calculator,
    Receipt,
    Package,
    ShieldCheck,
    X,
    Wallet,
    ChevronsLeft,
    ChevronsRight,
    IndianRupee,
    Gavel,
    Scale,
    Building2,
    Activity,
    Leaf
} from 'lucide-react';

const NAV_ITEMS = {
    committee: [
        { label: 'Overview', path: '/dashboard/committee', icon: LayoutDashboard },
        { label: 'Farmers', path: '/dashboard/committee/farmers', icon: Users },
        { label: 'Traders', path: '/dashboard/committee/traders', icon: Store },
        { label: 'Weight', path: '/dashboard/committee/weight', icon: Scale },
        { label: 'Weight History', path: '/dashboard/committee/weight-history', icon: Receipt },
        { label: 'Lilav Entry', path: '/dashboard/committee/lilav', icon: Gavel },
        { label: 'Payments', path: '/dashboard/committee/payments', icon: IndianRupee },
        { label: 'Reports', path: '/dashboard/committee/billing', icon: FileText },
        { label: 'Vegetables', path: '/dashboard/committee/vegetables', icon: Leaf },
    ],
    trader: [
        { label: 'Dashboard', path: '/dashboard/trader', icon: LayoutDashboard },
        { label: 'Transactions', path: '/dashboard/trader/transactions', icon: Receipt },

    ],
    admin: [
        { label: 'Overview', path: '/dashboard/admin', icon: LayoutDashboard },
        { label: 'Farmers', path: '/dashboard/admin/farmers', icon: Users },
        { label: 'Traders', path: '/dashboard/admin/traders', icon: Store },
        { label: 'Weight Station', path: '/dashboard/admin/weight', icon: Scale },
        { label: 'Lilav (Auction)', path: '/dashboard/admin/lilav', icon: Gavel },
        { label: 'Committee', path: '/dashboard/admin/committee', icon: Building2 }, // Note: Need to import Building2
        { label: 'Commission', path: '/dashboard/admin/commission', icon: ShieldCheck },
        { label: 'Transactions', path: '/dashboard/admin/transactions', icon: Receipt },
        { label: 'Users', path: '/dashboard/admin/users', icon: Users },
        { label: 'Activity Log', path: '/dashboard/admin/activity-log', icon: Activity },
        { label: 'Vegetables', path: '/dashboard/admin/vegetables', icon: Leaf },
    ],
    lilav: [
        { label: 'Auction Entry', path: '/dashboard/lilav', icon: Gavel },
        { label: 'Transactions', path: '/dashboard/lilav/transactions', icon: Receipt },
    ],
    farmer: [],
    weight: [],
};


export default function Sidebar({ role, isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const location = useLocation();
    const items = NAV_ITEMS[role] || [];

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                    ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
                    w-72`}
            >
                <div className="flex flex-col h-full">
                    {/* Header with Logo and Collapse Toggle */}
                    <div className={`h-16 min-h-[64px] flex items-center justify-between border-b border-slate-200 bg-white px-4
                        ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                    >
                        <Link
                            to={`/dashboard/${role}`}
                            className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'lg:justify-center' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shrink-0">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                                </svg>
                            </div>
                            {!isCollapsed && (
                                <div className="hidden lg:block min-w-0">
                                    <span className="text-lg font-bold text-slate-800">AgroNond</span>
                                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase tracking-wider capitalize">
                                        {role} Panel
                                    </span>
                                </div>
                            )}
                            <div className="lg:hidden min-w-0">
                                <span className="text-lg font-bold text-slate-800">AgroNond</span>
                                <span className="block text-[10px] text-emerald-600 font-semibold uppercase tracking-wider capitalize">
                                    {role} Panel
                                </span>
                            </div>
                        </Link>

                        {/* Right side buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            {/* Desktop Collapse Toggle */}
                            {!isCollapsed && (
                                <button
                                    onClick={onToggleCollapse}
                                    className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Collapse sidebar"
                                >
                                    <ChevronsLeft size={20} />
                                </button>
                            )}

                            {/* Mobile Close Button */}
                            <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Expand Button - Only when collapsed */}
                    {isCollapsed && (
                        <div className="hidden lg:flex justify-center py-3 border-b border-slate-100">
                            <button
                                onClick={onToggleCollapse}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Expand sidebar"
                            >
                                <ChevronsRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* Nav Items */}
                    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style>{`.scrollbar-none::-webkit-scrollbar { display: none; }`}</style>
                        {items.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path !== `/dashboard/${role}` && location.pathname.startsWith(item.path));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => onClose && onClose()}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative
                                        ${isActive
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }
                                        ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    <Icon size={20} className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    {!isCollapsed && (
                                        <span className="hidden lg:inline">{item.label}</span>
                                    )}
                                    <span className="lg:hidden">{item.label}</span>

                                    {/* Tooltip for collapsed state */}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg z-50 hidden lg:block">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer - Only when expanded */}
                    {!isCollapsed && (
                        <div className="p-4 border-t border-slate-100 hidden lg:block">
                            <p className="text-[10px] text-slate-400 text-center">
                                © 2026 All rights reserved
                            </p>
                        </div>
                    )}

                    {/* Mobile Footer */}
                    <div className="border-t border-slate-100 p-4 lg:hidden">
                        <p className="text-[11px] text-slate-400 text-center">
                            © 2026 All rights reserved
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
}
