import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import WeightNavbar from '../../components/navigation/WeightNavbar';
import { Toaster, toast } from 'react-hot-toast';
import {
  CheckCircle, Clock, X, Eye,
  Trash2, Calendar, Package, Scale, MapPin, User, Phone, Loader2
} from 'lucide-react';
import { api } from '../../lib/api';

// --- MODAL COMPONENT (Only for View Details & Profile) ---
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${sizes[size]} border border-gray-100 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// --- INLINE WEIGHT INPUT COMPONENT ---
const InlineWeightInput = ({ record, onWeightSave, disabled }) => {
  const [weight, setWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  const isNagBased = record.est_nag > 0;
  const unit = isNagBased ? 'Nag' : 'kg';

  const handleSave = async () => {
    const value = parseFloat(weight);
    if (!weight || isNaN(value) || value <= 0) return;

    setIsSaving(true);
    try {
      await onWeightSave(record.id, value, isNagBased);
      setWeight('');
    } catch (err) {
      // Error handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleBlur = () => {
    if (weight && parseFloat(weight) > 0) {
      handleSave();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onWheel={(e) => e.target.blur()}
          disabled={disabled || isSaving}
          placeholder="0.00"
          className={`w-24 sm:w-28 px-3 py-2 text-center font-semibold rounded-lg border-2 transition-all outline-none
            ${isSaving
              ? 'bg-gray-50 border-gray-200 text-gray-400'
              : isNagBased
                ? 'border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-purple-700'
                : 'border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 text-green-700'
            }`}
        />
        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <Loader2 size={18} className="animate-spin text-green-600" />
          </div>
        )}
      </div>
      <span className={`text-sm font-medium w-10 shrink-0 ${isNagBased ? 'text-purple-600' : 'text-green-600'}`}>
        {unit}
      </span>
    </div>
  );
};

// --- HELPER ---
const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const WeightDashboard = () => {
  // --- STATE ---
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    weightId: '',
    location: '',
    initials: 'WO'
  });

  const [modals, setModals] = useState({
    editProfile: false,
    details: false,
    delete: false
  });

  const [deleteId, setDeleteId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [profileForm, setProfileForm] = useState({ ...profile });
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenSearchResult, setTokenSearchResult] = useState(null);
  const [isSearchingToken, setIsSearchingToken] = useState(false);
  const [tokenFilterFarmerId, setTokenFilterFarmerId] = useState(null);

  // --- DATA FETCHING ---
  const loadProfile = async () => {
    try {
      const data = await api.weight.getProfile();
      if (data) {
        setProfile({
          name: data.full_name || '',
          phone: data.phone || '',
          location: data.location || '',
          initials: data.initials || 'WO',
          weightId: data.customId || ''
        });
        setProfileForm({
          name: data.full_name || '',
          phone: data.phone || '',
          location: data.location || '',
          initials: data.initials || 'WO'
        });
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const fetchAllRecords = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [done, pending] = await Promise.all([
        api.weight.records(),
        api.weight.pendingRecords()
      ]);

      const mapRecord = (r) => ({
        id: r._id,
        date: r.createdAt,
        farmer_id: r.farmer_id?.farmerId || r.farmer_id || 'Unknown',
        farmer_ref_id: r.farmer_id?._id || r.farmer_id,
        item: r.vegetable,
        est_weight: r.quantity,
        est_nag: r.nag,
        updated_weight: r.official_qty,
        updated_nag: r.official_nag,
        status: r.status,
        record_ref_id: r._id
      });

      // Separate completed and pending
      const completedList = done.map(mapRecord);
      const pendingList = pending.map(mapRecord);

      setRecords(completedList);
      setPendingRecords(pendingList);
    } catch (err) {
      console.error('Error fetching records:', err);
      if (showLoading) toast.error('Failed to fetch records');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRecords();
    loadProfile();
  }, [fetchAllRecords]);

  // Auto-refresh every 30 seconds
  useAutoRefresh(() => {
    fetchAllRecords(false);
  }, { interval: 30000 });

  // Listen for navbar profile edit events
  useEffect(() => {
    const handleOpenEditProfile = () => {
      setModals(prev => ({ ...prev, editProfile: true }));
    };
    window.addEventListener('openEditProfile', handleOpenEditProfile);
    return () => window.removeEventListener('openEditProfile', handleOpenEditProfile);
  }, []);

  // --- CALCULATIONS ---
  const completedCount = records.filter(r => ['Done', 'Sold', 'Weighed'].includes(r.status)).length;
  const pendingCount = pendingRecords.length;
  const todayCount = [...records, ...pendingRecords].filter(r => {
    const recordDate = new Date(r.date).toLocaleDateString('en-GB');
    const today = new Date().toLocaleDateString('en-GB');
    return recordDate === today;
  }).length;

  // --- FILTER COMPLETED RECORDS ---
  const filteredRecords = records.filter(r => {
    const statusMatch = filterStatus === 'All' ? true : r.status === filterStatus;

    // Filter by Token Search
    const tokenMatch = tokenFilterFarmerId
      ? String(r.farmer_ref_id) === String(tokenFilterFarmerId)
      : true;

    let dateMatch = true;
    if (selectedDate) {
      const rDate = new Date(r.date).toLocaleDateString('en-CA');
      dateMatch = rDate === selectedDate;
    }
    return statusMatch && dateMatch && tokenMatch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- HANDLERS ---

  // Auto-save weight handler
  const handleWeightSave = async (recordId, value, isNagBased) => {
    // Optimistic update
    setPendingRecords(prev => prev.filter(r => r.id !== recordId));

    try {
      await api.weight.createRecord({
        recordRefId: recordId,
        updatedWeight: isNagBased ? null : value,
        updatedNag: isNagBased ? value : null
      });

      toast.success('Weight saved!', { duration: 2000, position: 'bottom-center' });

      // Refresh to get updated data
      fetchAllRecords(false);
    } catch (err) {
      toast.error('Failed to save weight');
      // Revert optimistic update
      fetchAllRecords(false);
      throw err;
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setModals(prev => ({ ...prev, delete: true }));
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.weight.deleteRecord(deleteId);
      toast.success('Record deleted');
      fetchAllRecords(false);
      setModals(prev => ({ ...prev, delete: false }));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleTokenSearch = async () => {
    if (!tokenSearch) return;
    setIsSearchingToken(true);
    setTokenSearchResult(null);
    try {
      const result = await api.records.searchByToken(tokenSearch);
      setTokenSearchResult(result);
      // Auto-filter pending records to this farmer
      if (result?.farmer?._id) {
        setTokenFilterFarmerId(result.farmer._id);
      }
      toast.success(`Found farmer: ${result.farmer?.full_name}`, { duration: 2000 });
    } catch (err) {
      toast.error(err.message || 'No farmer found with this token today');
      setTokenSearchResult(null);
      setTokenFilterFarmerId(null);
    } finally {
      setIsSearchingToken(false);
    }
  };

  const clearTokenFilter = () => {
    setTokenSearchResult(null);
    setTokenFilterFarmerId(null);
    setTokenSearch('');
  };

  const saveProfile = async () => {
    try {
      const data = await api.weight.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        location: profileForm.location
      });

      setProfile({
        ...profile,
        name: data.full_name,
        phone: data.phone,
        location: data.location
      });
      setModals(prev => ({ ...prev, editProfile: false }));
      window.dispatchEvent(new CustomEvent('weightProfileUpdated'));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <WeightNavbar />

      <main className="max-w-6xl mx-auto px-4 py-6 mt-16">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Weight Dashboard</h1>
          <div className="flex items-center gap-1.5 text-gray-500 mt-1 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Today</p>
                <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Quick Search */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">Quick Token Search</p>
              <p className="text-xs text-gray-500">Enter farmer's token number to find their records</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="number"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTokenSearch();
                }}
                placeholder="Token #"
                className="w-24 px-3 py-2 rounded-lg border border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-center font-bold text-lg"
              />
              <button
                onClick={handleTokenSearch}
                disabled={!tokenSearch || isSearchingToken}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearchingToken ? 'Searching...' : 'Find'}
              </button>
            </div>
          </div>
          {tokenSearchResult && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{tokenSearchResult.farmer?.full_name}</p>
                  <p className="text-xs text-gray-500">{tokenSearchResult.farmer?.farmerId} • Token #{tokenSearchResult.farmer?.token}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    {tokenSearchResult.records?.length || 0} Records Today
                  </span>
                  <button
                    onClick={clearTokenFilter}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Clear Filter"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: Ready to Weigh (Pending Records with Inline Input) */}
        {(() => {
          let displayPending = [];

          if (tokenSearchResult && tokenSearchResult.records && tokenSearchResult.records.length > 0) {
            // ✅ STRICT: Show ONLY searched records
            displayPending = tokenSearchResult.records
              .filter(r => ['Pending', 'RateAssigned'].includes(r.status))
              .map(r => ({
                id: r._id,
                date: r.createdAt,
                farmer_id: tokenSearchResult.farmer.farmerId,
                farmer_ref_id: tokenSearchResult.farmer._id,
                item: r.vegetable,
                est_weight: r.quantity,
                est_nag: r.nag,
                updated_weight: r.official_qty,
                updated_nag: r.official_nag,
                status: r.status,
                record_ref_id: r._id
              }));
          } else if (tokenFilterFarmerId) {
            // Logic when filter is active but maybe search result state is lost/different?
            // Stick to the filter ID
            displayPending = pendingRecords.filter(r => String(r.farmer_ref_id) === String(tokenFilterFarmerId));
          } else {
            // Default: Show all pending (rate assigned) records
            displayPending = pendingRecords;
          }
          return displayPending.length > 0 && (
            <div className="bg-white border border-green-100 rounded-xl mb-6 overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <Scale size={40} className="text-green-600" />
                  <h2 className="font-semibold text-gray-900">Ready to Weight</h2>
                  {tokenFilterFarmerId && (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Filtered by Token
                    </span>
                  )}
                  <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {displayPending.length} pending
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter weight and press Enter or click outside to auto-save</p>
              </div>

              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-gray-50">
                {displayPending.map((record) => (
                  <div key={record.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs text-gray-400">{formatDate(record.date)}</span>
                        <p className="font-semibold text-gray-900">{record.farmer_id}</p>
                        <p className="text-sm text-gray-600">{record.item}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Estimated</p>
                        <p className="font-medium text-gray-600">
                          {record.est_weight > 0 ? `${record.est_weight} kg` : `${record.est_nag} Nag`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500">Enter Official Weight:</span>
                      <InlineWeightInput record={record} onWeightSave={handleWeightSave} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop View */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Farmer</th>
                      <th className="px-4 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Estimated</th>
                      <th className="px-4 py-3 text-center font-medium">Enter Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayPending.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="text-gray-900">{formatDate(record.date)}</span>
                          <span className="block text-xs text-gray-400">{formatTime(record.date)}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{record.farmer_id}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 text-xs font-medium">
                            {record.item}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.est_weight > 0 ? `${record.est_weight} kg` : `${record.est_nag} Nag`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <InlineWeightInput record={record} onWeightSave={handleWeightSave} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div >
          );
        })()}

        {/* SECTION 2: Completed Records */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={40} className="text-green-600" />
              <h2 className="font-semibold text-gray-900">Completed Records</h2>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="absolute -right-1 -top-1 bg-gray-300 hover:bg-gray-400 rounded-full p-0.5"
                  >
                    <X size={10} className="text-white" />
                  </button>
                )}
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-sm"
              >
                <option value="All">All Status</option>
                <option value="Sold">Sold</option>
                <option value="Weighed">Weighed</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 size={32} className="animate-spin text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Scale size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-900 font-medium">No records found</p>
              <p className="text-gray-400 text-sm mt-1">Completed weights will appear here</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-gray-50">
                {filteredRecords.map((record) => {
                  const isSold = ['Sold', 'Completed'].includes(record.status);

                  return (
                    <div key={record.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs text-gray-400">{formatDate(record.date)} • {formatTime(record.date)}</span>
                          <p className="font-semibold text-gray-900">{record.farmer_id}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${['Done', 'Sold', 'Weighed'].includes(record.status)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}>
                          {record.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-xs text-gray-400 block">Item</span>
                          <span className="text-sm text-gray-700">{record.item}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block">Official</span>
                          <span className={`text-lg font-bold ${record.updated_weight ? 'text-green-600' :
                            record.updated_nag ? 'text-purple-600' : 'text-gray-400'
                            }`}>
                            {record.updated_weight ? `${record.updated_weight} kg` :
                              record.updated_nag ? `${record.updated_nag} Nag` : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-gray-100">
                        <button
                          onClick={() => { setSelectedRecord(record); setModals(prev => ({ ...prev, details: true })); }}
                          className="p-2 bg-gray-50 text-gray-600 rounded-lg active:scale-95"
                        >
                          <Eye size={16} />
                        </button>
                        {!isSold && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Farmer</th>
                      <th className="px-4 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Estimated</th>
                      <th className="px-4 py-3 text-left font-medium">Official</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.map((record) => {
                      const isSold = ['Sold', 'Completed'].includes(record.status);

                      return (
                        <tr key={record.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{formatDate(record.date)}</span>
                            <span className="block text-xs text-gray-400">{formatTime(record.date)}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{record.farmer_id}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 text-xs font-medium">
                              {record.item}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {record.est_weight > 0 ? `${record.est_weight} kg` :
                              record.est_nag > 0 ? `${record.est_nag} Nag` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${record.updated_weight ? 'text-green-600' :
                              record.updated_nag ? 'text-purple-600' : 'text-gray-400'
                              }`}>
                              {record.updated_weight ? `${record.updated_weight} kg` :
                                record.updated_nag ? `${record.updated_nag} Nag` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${['Done', 'Sold', 'Weighed'].includes(record.status)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                              }`}>
                              {['Done', 'Sold', 'Weighed'].includes(record.status)
                                ? <CheckCircle size={12} />
                                : <Clock size={12} />}
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => { setSelectedRecord(record); setModals(prev => ({ ...prev, details: true })); }}
                                className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              {!isSold && (
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg transition"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            <strong>Note:</strong> Weight edits are disabled at this level. For corrections, please contact the Committee Office.
          </p>
        </div>
      </main >

      {/* --- MODALS --- */}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modals.delete}
        onClose={() => setModals(prev => ({ ...prev, delete: false }))}
        title="Delete Record"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this record?</h3>
          <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>

          <div className="flex gap-3">
            <button
              onClick={() => setModals(prev => ({ ...prev, delete: false }))}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={modals.details}
        onClose={() => setModals(prev => ({ ...prev, details: false }))}
        title="Record Details"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${['Done', 'Sold', 'Weighed'].includes(selectedRecord.status)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
                  }`}>
                  {['Done', 'Sold', 'Weighed'].includes(selectedRecord.status)
                    ? <CheckCircle size={14} />
                    : <Clock size={14} />}
                  {selectedRecord.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedRecord.date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Estimated</p>
                <p className="text-xl font-bold text-gray-400">
                  {selectedRecord.est_weight > 0 ? `${selectedRecord.est_weight} kg` : `${selectedRecord.est_nag} Nag`}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-green-100 bg-green-50">
                <p className="text-xs text-green-600 mb-1">Official</p>
                <p className="text-xl font-bold text-green-700">
                  {selectedRecord.updated_weight ? `${selectedRecord.updated_weight} kg` :
                    selectedRecord.updated_nag ? `${selectedRecord.updated_nag} Nag` : '-'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Farmer ID</span>
                <span className="font-semibold text-gray-900">{selectedRecord.farmer_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Item</span>
                <span className="font-semibold text-gray-900">{selectedRecord.item}</span>
              </div>
              {(selectedRecord.updated_weight || selectedRecord.updated_nag) && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Difference</span>
                  <span className={`font-semibold ${(selectedRecord.updated_weight || selectedRecord.updated_nag) >=
                    (selectedRecord.est_weight || selectedRecord.est_nag)
                    ? 'text-green-600'
                    : 'text-red-500'
                    }`}>
                    {(
                      (selectedRecord.updated_weight || selectedRecord.updated_nag) -
                      (selectedRecord.est_weight || selectedRecord.est_nag)
                    ).toFixed(2)} {selectedRecord.updated_weight ? 'kg' : 'Nag'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        isOpen={modals.editProfile}
        onClose={() => setModals(prev => ({ ...prev, editProfile: false }))}
        title="Station Profile"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {profileForm.name ? profileForm.name.slice(0, 2).toUpperCase() : 'WO'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
                placeholder="Enter name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
                placeholder="Enter phone"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
                placeholder="Enter location"
              />
            </div>
          </div>

          <button
            onClick={saveProfile}
            className="w-full mt-2 px-4 py-3 bg-gray-900 hover:bg-black text-white font-medium rounded-lg transition"
          >
            Save Changes
          </button>
        </div>
      </Modal>
    </div >
  );
};

export default WeightDashboard;