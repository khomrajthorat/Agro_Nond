import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Phone, MapPin, BadgeCheck, Camera, X, Save, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from "../../lib/api";
import NotificationCenter from '../layout/NotificationCenter';
import UniversalSearch from '../common/UniversalSearch';

export default function FarmerNavbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // UI States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for save button

  // Refs for click outside handling
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Profile State
  const [farmerProfile, setFarmerProfile] = useState({
    name: 'Farmer',
    farmerId: 'AGR-PENDING',
    phone: '',
    location: '',
    photo: '', // Base64 string from DB
    initials: 'FK',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    photo: '',
  });

  const [errors, setErrors] = useState({
    name: false,
    phone: false,
    location: false,
  });

  // --- 1. FETCH PROFILE ON LOAD ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.users.getProfile();
        const profileData = data.user || data.profile || data;

        if (profileData) {
          setFarmerProfile({
            name: profileData.name || profileData.full_name || 'Farmer',
            farmerId: profileData.farmerId || 'AGR-PENDING',
            phone: profileData.phone || '',
            location: profileData.location || '',
            photo: profileData.photo || profileData.profile_picture || '',
            initials: profileData.initials || 'FK',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        // Fallback to local storage if API fails
        const saved = localStorage.getItem('farmer-profile');
        if (saved) setFarmerProfile(JSON.parse(saved));
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);
  useEffect(() => {
    if (isEditing) {
      let cleanPhone = farmerProfile.phone || '';
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      setEditForm({
        name: farmerProfile.name === 'Farmer' ? '' : farmerProfile.name,
        phone: cleanPhone,
        location: farmerProfile.location || '',
        photo: farmerProfile.photo || '',
      });
      setErrors({ name: false, phone: false, location: false });
    }
  }, [isEditing, farmerProfile]);

  const getInitials = (name) => {
    if (!name || name === 'Farmer') return 'FK';
    const words = name
      .trim()
      .split(' ')
      .filter((w) => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const hasCompleteProfile =
    farmerProfile.name !== 'Farmer' && farmerProfile.phone && farmerProfile.location;



  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('farmer-profile');
      localStorage.removeItem('farmer-records');
      toast.success('Logged out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Failed to log out');
      window.location.href = '/';
    }
  };



  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };
  const handleSave = async () => {
    const isNameValid = editForm.name && editForm.name.trim().length > 0;
    const isPhoneEntered = editForm.phone && editForm.phone.trim().length > 0;
    const isPhoneValid = !isPhoneEntered || validatePhone(editForm.phone);

    // Location is Optional (Always valid, even if empty)
    const isLocationValid = true;

    const newErrors = {
      name: !isNameValid,
      phone: !isPhoneValid,
      location: false, // Never show error for location
    };

    setErrors(newErrors);

    if (newErrors.name || newErrors.phone) {
      toast.error('Please enter a valid Name (and 10-digit Phone if provided).');
      return;
    }

    setIsLoading(true);
    try {
      const initials = getInitials(editForm.name.trim());

      const payload = {
        full_name: editForm.name.trim(), // Backend expects full_name
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        profile_picture: editForm.photo, // Backend expects profile_picture
        initials: initials,
      };

      // API Call
      const response = await api.users.updateProfile(payload);

      const userData = response.user || response.profile || response;

      if (!userData) {
        throw new Error('Invalid response received from server');
      }

      // Update UI
      setFarmerProfile({
        name: userData.name || userData.full_name || payload.name,
        phone: userData.phone || payload.phone,
        location: userData.location || payload.location,
        photo: userData.photo || userData.profile_picture || payload.photo,
        initials: userData.initials || payload.initials,
        farmerId: userData.farmerId || farmerProfile.farmerId,
      });

      localStorage.setItem('farmer-profile', JSON.stringify(userData));
      window.dispatchEvent(new CustomEvent('farmerProfileUpdated'));

      toast.success('Profile saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Save Profile Error:', error);
      toast.error('Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({ name: false, phone: false, location: false });
  };

  const openEditForm = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  // --- RENDER HELPERS ---
  const AvatarDisplay = ({ size = 'sm', showBadge = true }) => {
    const sizeClasses = {
      sm: 'w-10 h-10 text-sm',
      md: 'w-14 h-14 text-xl',
      lg: 'w-20 h-20 text-2xl',
    };

    return (
      <div className="relative inline-flex">
        {farmerProfile.photo ? (
          <img
            src={farmerProfile.photo}
            alt="Profile"
            className={`${sizeClasses[size]} rounded-full object-cover shadow-sm border border-emerald-100`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold shadow-sm`}
          >
            {farmerProfile.initials}
          </div>
        )}
        {showBadge && hasCompleteProfile && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
            <BadgeCheck size={size === 'sm' ? 14 : 20} className="text-green-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Logo */}
          <div className="flex items-center">
            <Link to="/dashboard/farmer" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                {/* 'hidden sm:block' hides text on mobile, shows on larger screens */}
                <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  AgroNond
                </span>
                <span className="hidden sm:block text-[9px] sm:text-[10px] text-green-600 font-bold uppercase tracking-wider">
                  Farmer Panel
                </span>
              </div>
            </Link>
          </div>

          {/* Right Side - Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block mr-2">
              <UniversalSearch placeholder="Search your records..." />
            </div>
            {/* Notification Bell */}
            <NotificationCenter />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 p-1 pr-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <AvatarDisplay size="sm" showBadge={true} />
                <div className="hidden md:block text-left ml-1">
                  {' '}
                  {/* Changed sm:block to md:block for better spacing */}
                  {hasCompleteProfile ? (
                    <>
                      <p className="text-sm font-semibold leading-none text-gray-900 max-w-[100px] truncate">
                        {farmerProfile.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{farmerProfile.farmerId}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 font-medium">Farmer</p>
                  )}
                </div>
                <svg
                  className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="fixed left-4 right-4 top-20 sm:absolute sm:right-0 sm:top-full sm:left-auto sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    <AnimatePresence mode="wait">
                      {!isEditing ? (
                        <motion.div
                          key="view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
                            <div className="relative inline-block mb-3">
                              {farmerProfile.photo ? (
                                <img
                                  src={farmerProfile.photo}
                                  alt="Profile"
                                  className="w-20 h-20 rounded-full object-cover shadow-md border-4 border-white"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl font-bold text-white shadow-md border-4 border-white">
                                  {farmerProfile.initials}
                                </div>
                              )}
                              {hasCompleteProfile && (
                                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
                                  <BadgeCheck className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                </div>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {hasCompleteProfile ? farmerProfile.name : 'Farmer'}
                            </h3>
                            <p className="text-sm text-slate-500">Farmer</p>
                            <div className="flex items-center justify-center gap-1 mt-2 bg-emerald-50 py-1 px-3 rounded-full mx-auto w-fit border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-700">
                                {farmerProfile.farmerId}
                              </span>
                              <BadgeCheck className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                              <Phone className="w-4 h-4 text-emerald-600" />
                              <div>
                                <p className="text-xs text-slate-500">Phone</p>
                                <p className="text-sm font-medium text-slate-900">
                                  {farmerProfile.phone || 'Not Set'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <div>
                                <p className="text-xs text-slate-500">Location</p>
                                <p className="text-sm font-medium text-slate-900">
                                  {farmerProfile.location || 'Not Set'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <button
                              onClick={openEditForm}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                              <Edit3 size={16} /> Edit Profile
                            </button>
                            <button
                              onClick={handleLogout}
                              className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                            >
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col h-full bg-white"
                        >
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h3 className="font-bold text-slate-900">
                              {hasCompleteProfile ? 'Edit Profile' : 'Create Profile'}
                            </h3>
                            <button
                              onClick={handleCancel}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div className="p-6 space-y-5 overflow-y-auto max-h-[400px]">
                            <div className="flex justify-center">
                              <div
                                className="relative group cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm">
                                  {editForm.photo ? (
                                    <img
                                      src={editForm.photo}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl">
                                      {getInitials(editForm.name) || 'FK'}
                                    </div>
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera size={24} className="text-white" />
                                </div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => {
                                    setEditForm((prev) => ({ ...prev, name: e.target.value }));
                                    if (e.target.value.trim())
                                      setErrors((prev) => ({ ...prev, name: false }));
                                  }}
                                  placeholder="Enter your full name"
                                  className={`w-full px-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                                />
                                {errors.name && (
                                  <p className="text-xs text-red-500 mt-1">Name is required</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Phone Number
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                    +91
                                  </span>
                                  <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      setEditForm((prev) => ({ ...prev, phone: value }));
                                      // Validate only if value exists
                                      if (value === '' || validatePhone(value))
                                        setErrors((prev) => ({ ...prev, phone: false }));
                                    }}
                                    placeholder="9876543210"
                                    className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                                  />
                                </div>
                                {errors.phone && (
                                  <p className="text-xs text-red-500 mt-1">
                                    Valid 10-digit number required
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Location
                                </label>
                                <div className="relative">
                                  <MapPin
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => {
                                      setEditForm((prev) => ({
                                        ...prev,
                                        location: e.target.value,
                                      }));
                                      setErrors((prev) => ({ ...prev, location: false })); // Always valid
                                    }}
                                    placeholder="Village, District"
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-slate-300"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Farmer ID
                                </label>
                                <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium flex justify-between items-center">
                                  {farmerProfile.farmerId}
                                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                            <button
                              onClick={handleCancel}
                              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={isLoading}
                              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                'Saving...'
                              ) : (
                                <>
                                  <Save size={16} /> Save Changes
                                </>
                              )}
                            </button>
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
    </nav>
  );
}
