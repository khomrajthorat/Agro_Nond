import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, MapPin, Camera, Save, BadgeCheck, X, Edit3, Mail, Menu, Search, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import NotificationCenter from '../layout/NotificationCenter';
import UniversalSearch from '../common/UniversalSearch';

// Map of paths to page titles
const PAGE_TITLES = {
  '/dashboard/committee': 'Overview',
  '/dashboard/committee/farmers': 'Farmers',
  '/dashboard/committee/traders': 'Traders',
  '/dashboard/committee/daily-rates': 'Daily Rates',
  '/dashboard/committee/lilav': 'Lilav Entry',
  '/dashboard/committee/payments': 'Payments',
  '/dashboard/committee/billing': 'Reports',
  '/dashboard/committee/vegetables': 'Vegetables',
};

export default function CommitteeNavbar({ onMenuClick }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get current page title
  const getPageTitle = () => {
    // Check for exact match first
    if (PAGE_TITLES[location.pathname]) {
      return PAGE_TITLES[location.pathname];
    }
    // Check for partial matches (for nested routes)
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (location.pathname.startsWith(path) && path !== '/dashboard/committee') {
        return title;
      }
    }
    return 'Overview';
  };

  const [profile, setProfile] = useState({
    name: 'Committee User',
    phone: user?.phone || '9876543210',
    email: 'committee@agronond.com',
    location: 'APMC Office',
    role: 'Market Committee',
    photo: '',
    committeeId: user?.customId || 'MCDB-2026-001',
    initials: 'CU'
  });

  const [editForm, setEditForm] = useState({ ...profile });

  useEffect(() => {
    const saved = localStorage.getItem('committee-profile');
    if (saved) {
      const p = JSON.parse(saved);
      p.initials = getInitials(p.name);
      setProfile(p);
      setEditForm(p);
    }
  }, []);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error('Image size must be < 2MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updated = { ...editForm, initials: getInitials(editForm.name) };
    setProfile(updated);
    localStorage.setItem('committee-profile', JSON.stringify(updated));
    setIsEditing(false);
    toast.success("Profile updated!");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <header className="bg-white border-b border-slate-200/80 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Page Title & Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 hidden sm:inline">Committee</span>
              <ChevronDown size={14} className="rotate-[-90deg] text-slate-400 hidden sm:block" />
              <span className="text-slate-700 font-medium">{getPageTitle()}</span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search - Universal */}
            <div className="hidden md:block">
              <UniversalSearch placeholder="Search farmers, traders..." />
            </div>

            {/* Notifications */}
            <NotificationCenter />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {profile.photo ? (
                  <img src={profile.photo} alt="Profile" className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/20" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/20">
                    {profile.initials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.role}</p>
                </div>
                <ChevronDown size={16} className="hidden sm:block text-slate-400" />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[100]"
                  >
                    <AnimatePresence mode="wait">
                      {!isEditing ? (
                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200 text-center">
                            <div className="relative inline-block mb-3">
                              {profile.photo ? (
                                <img src={profile.photo} alt="Profile" className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-white" />
                              ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-4 ring-white">
                                  {profile.initials}
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md">
                                <BadgeCheck className="w-5 h-5 text-emerald-500" />
                              </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{profile.name}</h3>
                            <p className="text-sm text-slate-500">{profile.role}</p>
                            <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-100 py-1 px-3 rounded-full">
                              <span className="text-xs font-bold text-emerald-700">{profile.committeeId}</span>
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-600" /></div>
                              <div><p className="text-xs text-slate-500">Phone</p><p className="text-sm font-medium text-slate-900">{profile.phone}</p></div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Mail className="w-4 h-4 text-emerald-600" /></div>
                              <div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-medium text-slate-900">{profile.email}</p></div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                              <div><p className="text-xs text-slate-500">Location</p><p className="text-sm font-medium text-slate-900">{profile.location}</p></div>
                            </div>
                          </div>
                          <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <button onClick={() => { setEditForm(profile); setIsEditing(true); }} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"><Edit3 size={16} /> Edit Profile</button>
                            <button onClick={handleLogout} className="px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Sign Out</button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"><h3 className="font-bold text-slate-900">Edit Profile</h3><button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400"><X size={18} /></button></div>
                          <div className="p-6 space-y-5 overflow-y-auto max-h-[400px]">
                            <div className="flex justify-center"><div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}><div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-slate-100">{editForm.photo ? <img src={editForm.photo} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><User size={32} /></div>}</div><div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={20} className="text-white" /></div><input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" /></div></div>
                            <div className="space-y-4">
                              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label><input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                            </div>
                          </div>
                          <div className="p-4 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                            <button onClick={handleSave} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"><Save size={16} /> Save</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
