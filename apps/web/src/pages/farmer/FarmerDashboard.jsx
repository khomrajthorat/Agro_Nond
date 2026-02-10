import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import FarmerNavbar from '../../components/navigation/FarmerNavbar';
import { Toaster, toast } from 'react-hot-toast';
import api from '../../lib/api';
import { MARKET_CONFIG } from '../../config/market';
import SoldRecordCard from '../../components/farmer/SoldRecordCard';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';
import BillingInvoice from '../../components/committee/BillingInvoice';
import {
  Plus, TrendingUp, Clock, Package, X, Eye, ArrowLeft,
  Trash2, CheckCircle, Calendar, MapPin, ChevronRight, Edit, FileText, ChevronDown, ChevronUp, AlertTriangle, History, Download
} from 'lucide-react';
import { getInvoiceData as getInvoiceDataHelper } from '../../lib/invoiceUtils';


// ✅ HELPER: Format Time from Date
const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// --- MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} border border-gray-200 max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-6 sm:px-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- ADD NEW RECORD SECTION ---
const AddNewRecordSection = ({ onBack, onSave }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [selectedVegetable, setSelectedVegetable] = useState('');
  const [selectedVegetableData, setSelectedVegetableData] = useState(null); // Track full vegetable object
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Dynamic vegetables from API
  const [vegetables, setVegetables] = useState([]);
  const [vegetableCategories, setVegetableCategories] = useState([]);
  const [isLoadingVegetables, setIsLoadingVegetables] = useState(true);

  const [quantities, setQuantities] = useState({
    kg: '',
    ton: '',
    quintal: ''
  });

  // Nag field state
  const [nag, setNag] = useState('');

  const [addedItems, setAddedItems] = useState([]);

  // Fetch vegetables from API
  useEffect(() => {
    const fetchVegetables = async () => {
      try {
        setIsLoadingVegetables(true);
        const data = await api.vegetables.list();
        setVegetables(data.vegetables || []);

        // Transform to category format for UI
        const grouped = data.grouped || {};
        const categories = Object.entries(grouped).map(([categoryName, items]) => ({
          id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: categoryName,
          items: items.map(item => ({
            _id: item._id,
            english: item.name,
            marathi: item.marathiName,
            units: item.units || ['kg']
          }))
        }));
        setVegetableCategories(categories);
      } catch (error) {
        console.error('Failed to fetch vegetables:', error);
        toast.error('Failed to load vegetables');
      } finally {
        setIsLoadingVegetables(false);
      }
    };
    fetchVegetables();
  }, []);

  // Use Centralized Market Configuration
  useEffect(() => {
    setSelectedMarket(MARKET_CONFIG.MARKET_NAME);
    setIsLoadingMarket(false);
  }, []);

  // Filter logic
  const isSearching = searchTerm.length > 0 && selectedVegetable !== searchTerm;

  const filteredCategories = vegetableCategories.map(cat => {
    const matchingItems = isSearching
      ? cat.items.filter(item =>
        item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marathi.toLowerCase().includes(searchTerm.toLowerCase())
      )
      : cat.items;

    return { ...cat, items: matchingItems };
  }).filter(cat => cat.items.length > 0 || !isSearching);

  const handleVegetableSelect = (item, categoryName) => {
    const display = `${item.english} (${item.marathi})`;
    setSelectedVegetable(display);
    setSelectedVegetableData(item); // Store full item with units
    setSearchTerm(display);
    setIsDropdownOpen(false);
    // Clear inputs when changing vegetable
    setQuantities({ kg: '', ton: '', quintal: '' });
    setNag('');
  };

  const clearSelection = () => {
    setSelectedVegetable('');
    setSelectedVegetableData(null);
    setSearchTerm('');
    setQuantities({ kg: '', ton: '', quintal: '' });
    setNag('');
    setIsDropdownOpen(false);
  };

  // Check if selected vegetable allows kg or nag
  const allowsKg = selectedVegetableData?.units?.includes('kg') ?? true;
  const allowsNag = selectedVegetableData?.units?.includes('nag') ?? false;

  const handleQuantityChange = (value, type) => {
    if (value) {
      setNag('');
    }

    if (value === '') {
      setQuantities({ kg: '', ton: '', quintal: '' });
      return;
    }

    const val = parseFloat(value);
    if (isNaN(val)) return;

    let newKg, newTon, newQuintal;

    if (type === 'kg') {
      newKg = value;
      newTon = (val / 1000).toFixed(3);
      newQuintal = (val / 100).toFixed(2);
    } else if (type === 'ton') {
      newTon = value;
      newKg = (val * 1000).toFixed(2);
      newQuintal = (val * 10).toFixed(2);
    } else if (type === 'quintal') {
      newQuintal = value;
      newKg = (val * 100).toFixed(2);
      newTon = (val / 10).toFixed(3);
    }

    setQuantities({
      kg: type === 'kg' ? value : parseFloat(newKg).toString(),
      ton: type === 'ton' ? value : parseFloat(newTon).toString(),
      quintal: type === 'quintal' ? value : parseFloat(newQuintal).toString()
    });
  };

  const handleNagChange = (value) => {
    setNag(value);
    if (value) {
      setQuantities({ kg: '', ton: '', quintal: '' });
    }
  };

  const handleAddItem = () => {
    if (!selectedVegetable) {
      toast.error('Please select a vegetable');
      return;
    }

    const hasQuantity = quantities.kg && parseFloat(quantities.kg) > 0;
    const hasNag = nag && parseFloat(nag) > 0;

    // Validation based on allowed units
    if (allowsKg && allowsNag) {
      // Both allowed - user must fill one
      if (!hasQuantity && !hasNag) {
        toast.error('Please enter either Quantity (Kg) or Nag');
        return;
      }
      if (hasQuantity && hasNag) {
        toast.error('Please enter only Quantity OR Nag, not both.');
        return;
      }
    } else if (allowsKg && !allowsNag) {
      // Only kg allowed
      if (!hasQuantity) {
        toast.error('Please enter Quantity (Kg)');
        return;
      }
    } else if (!allowsKg && allowsNag) {
      // Only nag allowed
      if (!hasNag) {
        toast.error('Please enter Nag count');
        return;
      }
    }

    // Check for negative values
    if ((hasQuantity && parseFloat(quantities.kg) < 0) || (hasNag && parseFloat(nag) < 0)) {
      toast.error('Quantity cannot be negative');
      return;
    }

    const isDuplicate = addedItems.some(item => item.vegetable === selectedVegetable);
    if (isDuplicate) {
      toast.error('This vegetable is already added. Remove it first to change quantity.');
      return;
    }

    const newItem = {
      id: Date.now(),
      vegetable: selectedVegetable,
      quantity: parseFloat(quantities.kg) || 0,
      nag: parseFloat(nag) || 0
    };

    setAddedItems([...addedItems, newItem]);
    toast.success('Item added to list');
    clearSelection();
  };

  const handleRemoveItem = (id) => {
    setAddedItems(addedItems.filter(item => item.id !== id));
    toast.success('Item removed');
  };

  const handleSaveAll = () => {
    if (!selectedMarket) {
      toast.error('Please select a market');
      return;
    }

    if (addedItems.length === 0) {
      toast.error('Please add at least one vegetable');
      return;
    }

    onSave({
      market: selectedMarket,
      items: addedItems
    });

    clearSelection();
    setAddedItems([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Add New Record</h2>

          <div className="space-y-6">
            {/* Market Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Market Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={isLoadingMarket ? "Loading..." : selectedMarket}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-700 font-medium outline-none cursor-not-allowed"
                />
                {!isLoadingMarket && selectedMarket && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600" size={20} />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Automatically assigned to registered market committee</p>
            </div>

            {/* Added Items List (Top Green Section) */}
            {addedItems.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold text-gray-900">Added Items ({addedItems.length}):</p>
                  <button
                    onClick={() => setAddedItems([])}
                    className="text-xs text-red-600 hover:underline font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addedItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{item.vegetable}</p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {item.quantity > 0 ? (
                            <p>Qty: {item.quantity} kg</p>
                          ) : (
                            <p>Nag: {item.nag}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 ml-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition flex-shrink-0"
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vegetable Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Vegetable Name *</label>

              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={isLoadingVegetables ? "Loading vegetables..." : "Search or Select..."}
                    disabled={isLoadingVegetables}
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white text-gray-900 disabled:bg-gray-100"
                  />

                  {searchTerm ? (
                    <button
                      onClick={clearSelection}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition"
                      title="Clear Selection"
                    >
                      <X size={14} className="text-gray-600" />
                    </button>
                  ) : (
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={20}
                    />
                  )}
                </div>

                {/* Dropdown Menu - Flat List */}
                {isDropdownOpen && !isLoadingVegetables && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-96 overflow-y-auto custom-scrollbar">
                      {(() => {
                        const allItems = filteredCategories.flatMap(cat =>
                          cat.items.map(item => ({ ...item, categoryName: cat.name }))
                        );

                        if (allItems.length === 0) {
                          return (
                            <div className="p-4 text-center text-gray-500">
                              No vegetables found
                            </div>
                          );
                        }

                        return allItems.map((item, idx) => (
                          <button
                            key={item._id || idx}
                            onClick={() => handleVegetableSelect(item, item.categoryName)}
                            className="w-full px-4 py-3 text-left hover:bg-green-50 transition border-b border-gray-100 last:border-0 flex justify-between items-center group"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">{item.english}</p>
                              <p className="text-xs text-gray-500 group-hover:text-green-600">{item.marathi}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Show unit badges */}
                              <div className="flex gap-1">
                                {item.units?.includes('kg') && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">KG</span>
                                )}
                                {item.units?.includes('nag') && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">NAG</span>
                                )}
                              </div>
                              {selectedVegetable.includes(item.english) && (
                                <CheckCircle size={16} className="text-green-600" />
                              )}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>

              {selectedVegetable && (
                <div className="mt-3 flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Currently Selected:</p>
                    <p className="font-bold text-gray-900 text-sm">{selectedVegetable}</p>
                    <div className="flex gap-1 mt-1">
                      {allowsKg && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">KG</span>
                      )}
                      {allowsNag && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">NAG</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                    title="Change Selection"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Quantity and Nag Inputs - Conditionally shown based on vegetable units */}
            {selectedVegetable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity Input - Show only if kg is allowed */}
                {allowsKg && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Quantity {allowsNag ? '(Leave empty if using Nag)' : '*'}
                    </label>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Kilograms (Kg)</label>
                    <input
                      type="number"
                      value={quantities.kg}
                      onChange={(e) => handleQuantityChange(e.target.value, 'kg')}
                      onWheel={(e) => e.target.blur()}
                      placeholder="0"
                      step="10"
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none bg-green-50/50 text-gray-900 font-semibold"
                    />
                  </div>
                )}

                {/* Nag Input - Show only if nag is allowed */}
                {allowsNag && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nag {allowsKg ? '(Leave empty if using Quantity)' : '*'}
                    </label>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Nag Count</label>
                    <input
                      type="number"
                      value={nag}
                      onChange={(e) => handleNagChange(e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="Enter count (e.g. 5, 50, 100)"
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none bg-purple-50/50 text-gray-900 font-semibold"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Info note - only show if both units are allowed */}
            {selectedVegetable && allowsKg && allowsNag && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p><strong>Note:</strong> Enter value in <strong>either</strong> Quantity <strong>OR</strong> Nag. Filling one will automatically clear the other.</p>
              </div>
            )}

            {/* Prompt to select vegetable first */}
            {!selectedVegetable && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 text-center">
                <Package size={24} className="mx-auto text-gray-400 mb-2" />
                <p>Please select a vegetable first to see quantity options</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddItem}
                disabled={!selectedVegetable}
                className={`px-4 py-3 font-semibold rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${!selectedVegetable ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                <Plus size={20} />
                Add Item
              </button>

              <button
                onClick={handleSaveAll}
                disabled={addedItems.length === 0}
                className={`px-4 py-3 font-semibold rounded-xl transition shadow-lg hover:shadow-xl ${addedItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                Save Records ({addedItems.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- MAIN DASHBOARD COMPONENT ---
const FarmerDashboard = () => {
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalRecords: 0
  });
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalVolumeKg: 0,
    totalVolumeNag: 0,
    totalSalesCount: 0,
    pendingLotsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dailyToken, setDailyToken] = useState(null); // Daily Token for today
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    farmerId: '',
    location: '',
    initials: 'FK'
  });

  const [modals, setModals] = useState({
    editProfile: false,
    details: false,
    editRecord: false,
    deleteConfirm: false
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState(''); // ✅ NEW: Date Filter State
  const [profileForm, setProfileForm] = useState({ ...profile });

  // EDIT FORM STATE
  const [editFormData, setEditFormData] = useState({
    id: null,
    market: '',
    vegetable: '',
    quantities: { kg: '', ton: '', quintal: '' },
    nag: '' // ✅ Add nag to edit form
  });

  // --- FETCH DATA FROM BACKEND ---
  const [markets, setMarkets] = useState([]); // ✅ State for markets list

  const fetchRecords = useCallback(async (showLoading = true, page = 1, status = 'All', date = '') => {
    try {
      if (showLoading) setIsLoading(true);
      const params = {
        page,
        limit: 10
      };
      // Only add status if it's not 'All'
      if (status && status !== 'All') {
        params.status = status;
      }
      // ✅ Add date param if present
      if (date) {
        params.date = date;
      }

      const data = await api.records.myRecords(params);

      if (data.records) {
        setRecords(data.records);
        setPagination(prev => ({
          ...prev,
          ...data.pagination,
          page: data.pagination.currentPage || data.pagination.page || prev.page
        }));
      } else {
        // Fallback if backend response structure varies/fails
        setRecords([]);
      }
    } catch (error) {
      console.error(error);
      // Only show error on initial load, not on background refresh
      if (showLoading) toast.error('Failed to fetch records');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.records.myStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // ✅ Auto-refresh records and stats every 30 seconds
  // Pass current page and filter to keep view consistent
  useAutoRefresh(() => {
    fetchRecords(false, pagination.page, filterStatus, selectedDate);
    fetchStats();
  }, { interval: 30000 });

  const loadProfile = () => {
    const prof = localStorage.getItem('farmer-profile');
    if (prof) {
      const p = JSON.parse(prof);
      setProfile(p);
      setProfileForm(p);
    }
  };

  // Fetch daily token
  const fetchDailyToken = useCallback(async () => {
    try {
      const data = await api.records.myToken();
      setDailyToken(data.token);
    } catch (error) {
      console.error('Failed to fetch token:', error);
    }
  }, []);

  // ✅ NEW: Fetch records on mount
  useEffect(() => {
    fetchRecords(true, 1, 'All', '');
    fetchStats();
    fetchDailyToken();
    loadProfile();
  }, []);

  useEffect(() => {
    const handleOpenEditProfile = () => {
      setModals(prev => ({ ...prev, editProfile: true }));
    };
    window.addEventListener('openEditProfile', handleOpenEditProfile);
    return () => window.removeEventListener('openEditProfile', handleOpenEditProfile);
  }, []);

  // --- COMPUTED VALUES ---
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchRecords(true, newPage, filterStatus, selectedDate);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    fetchRecords(true, 1, status, selectedDate); // Reset to page 1 on filter
  };

  const handleDateFilterChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchRecords(true, 1, filterStatus, date); // Fetch with new date
  };

  const soldRecords = records.filter(r => ['Sold', 'Completed', 'Partial'].includes(r.display_status || r.status));
  const pendingRecords = records.filter(r => (r.display_status || r.status) === 'Pending');

  // We no longer client-side sort or filter the main list, as the backend does it.
  const displayRecords = records;





  // --- HANDLERS ---
  const handleAddRecord = async (data) => {
    try {
      await api.post('/api/records/add', data);
      toast.success('Records saved to database!');
      setView('dashboard');
      fetchRecords(true, 1, filterStatus, selectedDate); // Refresh and go to page 1
      fetchStats();
      fetchDailyToken(); // Refresh token after adding record
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to save record');
    }
  };

  const initiateDelete = (id) => {
    setRecordToDelete(id);
    setModals(prev => ({ ...prev, deleteConfirm: true }));
  };

  // --- CONFIRM DELETE (Called from Modal) ---
  const confirmDelete = async () => {
    try {
      await api.delete(`/api/records/${recordToDelete}`);
      toast.success('Record deleted successfully');
      fetchRecords(true, pagination.page, filterStatus, selectedDate); // Refresh current page
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setModals(prev => ({ ...prev, deleteConfirm: false }));
      setRecordToDelete(null);
    }
  };

  const handleEditClick = (record) => {
    const qty = record.quantity;
    setEditFormData({
      id: record._id,
      market: record.market,
      vegetable: record.vegetable,
      quantities: {
        kg: qty > 0 ? qty.toString() : '',
        ton: qty > 0 ? (qty / 1000).toFixed(3) : '',
        quintal: qty > 0 ? (qty / 100).toFixed(2) : ''
      },
      nag: record.nag ? record.nag.toString() : '' // ✅ Load nag value
    });
    setModals({ ...modals, editRecord: true });
  };

  const handleEditQuantityChange = (value, type) => {
    // If typing in Quantity, clear Nag
    if (value) {
      setEditFormData(prev => ({ ...prev, nag: '' }));
    }

    if (value === '') {
      setEditFormData(prev => ({
        ...prev,
        quantities: { kg: '', ton: '', quintal: '' }
      }));
      return;
    }

    const val = parseFloat(value);
    if (isNaN(val)) return;

    let newKg, newTon, newQuintal;

    if (type === 'kg') {
      newKg = value;
      newTon = (val / 1000).toFixed(3);
      newQuintal = (val / 100).toFixed(2);
    } else if (type === 'ton') {
      newTon = value;
      newKg = (val * 1000).toFixed(2);
      newQuintal = (val * 10).toFixed(2);
    } else if (type === 'quintal') {
      newQuintal = value;
      newKg = (val * 100).toFixed(2);
      newTon = (val / 10).toFixed(3);
    }

    setEditFormData(prev => ({
      ...prev,
      quantities: {
        kg: type === 'kg' ? value : parseFloat(newKg).toString(),
        ton: type === 'ton' ? value : parseFloat(newTon).toString(),
        quintal: type === 'quintal' ? value : parseFloat(newQuintal).toString()
      }
    }));
  };

  const handleEditNagChange = (value) => {
    // If typing in Nag, clear Quantities
    if (value) {
      setEditFormData(prev => ({
        ...prev,
        quantities: { kg: '', ton: '', quintal: '' },
        nag: value
      }));
    } else {
      setEditFormData(prev => ({ ...prev, nag: value }));
    }
  };

  const handleUpdateRecord = async () => {
    const newKg = parseFloat(editFormData.quantities.kg) || 0;
    const newNag = parseFloat(editFormData.nag) || 0;

    // ✅ VALIDATION: At least one field must be filled
    if (newKg <= 0 && newNag <= 0) {
      toast.error("Please enter either Quantity (Kg) or Nag");
      return;
    }

    if (!editFormData.market) {
      toast.error("Please select a market");
      return;
    }

    try {
      await api.put(`/api/records/${editFormData.id}`, {
        market: editFormData.market,
        quantity: newKg,
        nag: newNag // ✅ Send nag to backend
      });

      toast.success("Record updated successfully!");
      setModals({ ...modals, editRecord: false });
      fetchRecords(true, pagination.page, filterStatus, selectedDate);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update record');
    }
  };


  const getInvoiceData = (record) => {
    // Use shared utility for consistent logic across Dashboard and History
    return getInvoiceDataHelper(record, profile.name);
  };



  const saveProfile = () => {
    const initials = profileForm.name.slice(0, 2).toUpperCase() || 'FK';
    const updatedProfile = { ...profileForm, initials };
    setProfile(updatedProfile);
    localStorage.setItem('farmer-profile', JSON.stringify(updatedProfile));
    setModals({ ...modals, editProfile: false });
    window.dispatchEvent(new CustomEvent('farmerProfileUpdated'));
    toast.success('Profile updated successfully!');
  };

  if (view === 'addRecord') {
    return (
      <div className="min-h-screen bg-white">

        <FarmerNavbar />
        <div className="mt-16">
          <AddNewRecordSection
            onBack={() => setView('dashboard')}
            onSave={handleAddRecord}
          />
        </div>
      </div>
    );
  }

  const handleDownloadReport = async () => {
    try {
      const blob = await api.get('/api/records/download-report', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `farmer_report_${profile.name || 'user'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-white">

        <FarmerNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 mt-16">
          <div className="mb-8">
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-medium"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
            <p className="text-gray-500 mt-2">View all your completed transactions and download bills.</p>
          </div>

          {soldRecords.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No sales history yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {soldRecords.map(record => (
                <SoldRecordCard key={record._id} record={record} farmerName={profile.name} />
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS FOR HISTORY */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`px-6 py-2 rounded-xl font-medium transition ${pagination.page === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Previous
              </button>
              <div className="flex items-center px-4 bg-white rounded-xl border border-gray-200 text-gray-600 font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className={`px-6 py-2 rounded-xl font-medium transition ${pagination.page >= pagination.totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <FarmerNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 mt-16">

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">Farmer Dashboard</h1>
              <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Token Badge - Only show if token exists */}
            {dailyToken && (
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-200 animate-pulse-once">
                <div className="text-white">
                  <p className="text-xs font-medium opacity-90">Your Token Today</p>
                  <p className="text-3xl font-black">#{dailyToken}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto mt-4">
            <button
              onClick={handleDownloadReport}
              className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm"
            >
              <Download size={20} className="text-gray-500" />
              Download Report
            </button>
            <button
              onClick={() => setView('history')}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition hover:shadow-md"
            >
              <History size={20} />
              Sales History
            </button>
            <button
              onClick={() => setView('addRecord')}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl sm:rounded-full shadow-lg shadow-green-200 transition hover:shadow-xl hover:-translate-y-1"
            >
              <Plus size={20} />
              New Record
            </button>
          </div>
        </div>

        {/* Stats Cards - Updated to use Server Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                +12%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Earnings</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-gray-400 mt-1">Gross Income</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <Package className="text-blue-600" size={24} />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-100">
                {stats.totalSalesCount} sales
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalSalesCount}</h3>
              <p className="text-xs text-gray-400 mt-1">All transactions</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
                <Clock className="text-amber-600" size={24} />
              </div>
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                Active
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Pending Lots</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.pendingLotsCount}</h3>
              <p className="text-xs text-gray-400 mt-1">Awaiting sale</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 rounded-2xl group-hover:bg-purple-100 transition-colors">
                <Package className="text-purple-600" size={24} />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-100">
                &infin; items
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Volume</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex flex-wrap gap-x-2 gap-y-1 items-baseline">
                {stats.totalVolumeKg > 0 && (
                  <span>{stats.totalVolumeKg.toFixed(2)} <span className="text-xs font-semibold text-gray-400">kg</span></span>
                )}
                {stats.totalVolumeKg > 0 && stats.totalVolumeNag > 0 && (
                  <span className="text-gray-300 text-lg font-light">|</span>
                )}
                {stats.totalVolumeNag > 0 && (
                  <span>{stats.totalVolumeNag} <span className="text-xs font-semibold text-gray-400">Nag</span></span>
                )}
                {!(stats.totalVolumeKg > 0) && !(stats.totalVolumeNag > 0) && (
                  <span>0.00 <span className="text-xs font-semibold text-gray-400">kg</span></span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Lifetime quantity</p>
            </div>
          </div>
        </div>{/* Records Table */}
        {/* Records Table */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Records</h2>
              <p className="text-sm text-gray-600 mt-1">Manage and track all transactions</p>
            </div>

            <div className="flex w-full sm:w-auto gap-3 items-center">
              {/* ✅ NEW: Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateFilterChange}
                  className="px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      fetchRecords(true, 1, filterStatus, '');
                    }}
                    className="absolute -right-2 -top-2 bg-gray-200 hover:bg-gray-300 rounded-full p-0.5"
                    title="Clear Date"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:border-green-500 text-sm"
              >
                <option>All</option>
                <option value="WeightPending">Weight Pending</option>
                <option>Sold</option>
                <option>Payment Pending</option>
                <option>Partial</option>
              </select>
              {/* Sort removed temporary as it requires backend support for 'amount' sort with pagination. Default is 'Recent' */}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading records...</div>
          ) : (
            <>
              {/* Mobile View */}
              {/* Mobile View */}
              <div className="block sm:hidden">
                {displayRecords.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No records found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {displayRecords.map((record) => (
                      <MobileRecordCard
                        key={record._id}
                        record={record}
                        handleEditClick={handleEditClick}
                        initiateDelete={initiateDelete}
                        getInvoiceData={getInvoiceData}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-16">Token</th>
                      <th className="px-4 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-24">Date</th>
                      <th className="px-4 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-40">Item</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-48">Sales Progress</th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-36">Rate Details</th>
                      <th className="px-4 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-28">Total Amount</th>
                      <th className="px-4 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-24">Status</th>
                      <th className="px-4 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayRecords.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-8 py-16 text-center">
                          <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-600 font-medium">No records found</p>
                          <p className="text-gray-500 text-sm mt-1">Click "New Record" to add your first entry</p>
                        </td>
                      </tr>
                    ) : (
                      displayRecords.map((record) => (
                        <RecordRow
                          key={record._id}
                          record={record}
                          handleEditClick={handleEditClick}
                          initiateDelete={initiateDelete}
                          getInvoiceData={getInvoiceData}
                        />
                      )))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION CONTROLS */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50">
                  <span className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.totalRecords)}</span> of <span className="font-semibold">{pagination.totalRecords}</span> results
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${pagination.page === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${pagination.page >= pagination.totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main >

      {/* Details Modal */}
      < Modal
        isOpen={modals.details}
        onClose={() => setModals({ ...modals, details: false })}
        title="Record Details"
        size="md"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">DATE</p>
                <p className="font-bold text-gray-900">{new Date(selectedRecord.createdAt).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">TIME</p>
                <p className="font-bold text-gray-900">{formatTime(selectedRecord.createdAt)}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold mb-1">MARKET</p>
              <p className="font-bold text-gray-900">{selectedRecord.market}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold mb-1">VEGETABLE</p>
              <p className="font-bold text-gray-900">{selectedRecord.vegetable}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold mb-1">TOTAL QTY</p>
              {/* UPDATED LOGIC FOR DETAILS MODAL */}
              <p className="font-bold text-gray-900">
                {selectedRecord.quantity > 0
                  ? `${selectedRecord.quantity} kg`
                  : selectedRecord.nag > 0
                    ? `${selectedRecord.nag} Nag`
                    : '-'}
              </p>
            </div>

            {['Sold', 'Completed'].includes(selectedRecord.status) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">RATE</p>
                    <p className="font-bold text-gray-900">₹{selectedRecord.sale_rate || selectedRecord.rate}/kg</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">TOTAL AMOUNT</p>
                    <p className="font-bold text-green-600">₹{(selectedRecord.sale_amount || (selectedRecord.sale_rate * selectedRecord.quantity) || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <PDFDownloadLink
                    document={<BillingInvoice data={getInvoiceData(selectedRecord)} type="farmer" />}
                    fileName={`invoice-${selectedRecord._id.slice(-6)}.pdf`}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {({ loading }) => (
                      <>
                        <Download size={18} className={loading ? 'animate-pulse' : ''} />
                        {loading ? 'Generating...' : 'Download Invoice'}
                      </>
                    )}
                  </PDFDownloadLink>
                </div>
              </>
            )}
          </div>
        )}
      </Modal >

      {/* Edit Record Modal */}
      < Modal
        isOpen={modals.editRecord}
        onClose={() => setModals({ ...modals, editRecord: false })}
        title="Edit Record"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Editing Item:</p>
            <p className="font-bold text-gray-900 text-lg">{editFormData.vegetable}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Market Name</label>
            <select
              value={editFormData.market}
              onChange={(e) => setEditFormData({ ...editFormData, market: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white text-gray-900"
            >
              <option value="">Select Market</option>
              {markets.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {/* Fallback if the saved market isn't in the list */}
              {!markets.includes(editFormData.market) && editFormData.market && (
                <option value={editFormData.market}>{editFormData.market}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Update Total Quantity</label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Kilograms (Kg)</label>
                <input
                  type="number"
                  value={editFormData.quantities.kg}
                  onChange={(e) => handleEditQuantityChange(e.target.value, 'kg')}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0"
                  step="10"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none bg-green-50/50 text-gray-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Tons</label>
                  <input
                    type="number"
                    value={editFormData.quantities.ton}
                    onChange={(e) => handleEditQuantityChange(e.target.value, 'ton')}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Quintals</label>
                  <input
                    type="number"
                    value={editFormData.quantities.quintal}
                    onChange={(e) => handleEditQuantityChange(e.target.value, 'quintal')}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* ✅ NEW: Nag Edit Field */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Nag (multiples of 100)</label>
              <input
                type="number"
                value={editFormData.nag}
                onChange={(e) => handleEditNagChange(e.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="100, 200, 300..."
                step="100"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-purple-300 focus:border-green-600 focus:ring-2 focus:ring-purple-100 outline-none bg-purple-50/30 text-gray-900 font-semibold"
              />
            </div>

          </div>

          <button
            onClick={handleUpdateRecord}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition shadow-lg"
          >
            Update Record
          </button>
        </div>
      </Modal >

      {/* --- CONFIRM DELETE MODAL --- */}
      < Modal
        isOpen={modals.deleteConfirm}
        onClose={() => setModals({ ...modals, deleteConfirm: false })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Are you sure?</h3>
          <p className="text-gray-500 text-sm mb-6">
            Do you really want to delete this record? This process cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setModals({ ...modals, deleteConfirm: false })}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-md transition"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal >

      {/* Profile Edit Modal */}
      < Modal
        isOpen={modals.editProfile}
        onClose={() => setModals({ ...modals, editProfile: false })}
        title="Edit Profile"
        size="md"
      >
        <div className="space-y-5">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
              {profileForm.name ? profileForm.name.slice(0, 2).toUpperCase() : 'FK'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="Enter phone number"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Farmer ID</label>
            <input
              type="text"
              value={profileForm.farmerId}
              onChange={(e) => setProfileForm({ ...profileForm, farmerId: e.target.value })}
              placeholder="e.g., AGR-1234"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
            <input
              type="text"
              value={profileForm.location}
              onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
              placeholder="Enter your location"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <button
            onClick={saveProfile}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
          >
            Save Changes
          </button>
        </div>
      </Modal >
    </div >
  );
};

// --- HELPER --
// formatTime is already defined above or imported


// --- MEMOIZED COMPONENTS ---
const DownloadInvoiceButton = memo(({ record, getInvoiceData }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const invoiceData = getInvoiceData(record);
      const doc = <BillingInvoice data={invoiceData} type="farmer" />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${record._id.slice(-6)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
      title="Download Invoice"
    >
      <Download size={16} className={isGenerating ? 'animate-pulse' : ''} />
    </button>
  );
});

const RecordRow = memo(({ record, handleEditClick, initiateDelete, getInvoiceData }) => {
  // Logic Scope via Shared Helper
  const invoiceData = getInvoiceData(record);

  const hasQuantity = record.quantity > 0;

  const unit = hasQuantity ? 'kg' : 'Nag';
  const totalQty = (hasQuantity ? record.quantity : record.nag) || 0;

  // Extract values for UI display from the unified data
  const soldQty = (invoiceData.qty > 0 ? invoiceData.qty : invoiceData.nag) || 0;
  const avgRate = invoiceData.rate;
  const netPayable = invoiceData.finalAmount;
  const totalSaleAmount = invoiceData.baseAmount;
  const splits = invoiceData.splits || [];

  // Computed status for UI rendering (Sold/Partial/Pending)
  // We can rely on invoiceData.status mostly, but invoiceData.status has 'Full' instead of 'Sold'
  // Let's re-map or keep basic logic if simpler

  let computedStatus = record.display_status || 'Pending';
  if (!record.display_status) {
    if (soldQty > 0 && totalQty - soldQty <= 0.01) computedStatus = 'Sold';
    else if (soldQty > 0) computedStatus = 'Partial';
  }

  // Payment Status Logic
  let isPaymentPending = false;
  if (computedStatus === 'Sold') {
    const paymentStatus = record.is_parent
      ? (record.aggregated_payment_status || 'Pending')
      : (record.farmer_payment_status || 'Pending');
    if (paymentStatus === 'Pending') isPaymentPending = true;
  }

  const awaitingQty = Math.max(0, totalQty - soldQty);
  const progressPercent = Math.min(100, (soldQty / totalQty) * 100);

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      {/* Token */}
      <td className="px-3 py-4 align-top text-center">
        {record.token ? (
          <span className="text-green-700 font-bold text-sm">
            #{record.token}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>

      {/* Date */}
      <td className="px-6 py-4 align-top">
        <div className="text-gray-900 font-medium">{new Date(record.createdAt).toLocaleDateString('en-GB')}</div>
        <div className="text-xs text-gray-400 mt-1">{formatTime(record.createdAt)}</div>
      </td>

      {/* Market / Item */}
      <td className="px-4 py-4 align-top">
        <div className="text-gray-900 font-bold">{record.vegetable}</div>
      </td>

      {/* Sales Progress */}
      <td className="px-6 py-4 align-top">
        <div className="w-full min-w-[160px]">
          <div className="flex justify-between text-xs mb-1.5 font-semibold">
            <span className={soldQty > 0 ? "text-green-600" : "text-gray-400"}>
              Sold: {parseFloat((soldQty || 0).toFixed(2))} {unit}
            </span>
            <span className="text-gray-600">
              / {parseFloat((totalQty || 0).toFixed(2))} {unit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isPaymentPending ? 'bg-orange-500' :
                computedStatus === 'Sold' ? 'bg-green-500' :
                  computedStatus === 'Partial' ? 'bg-blue-500' :
                    computedStatus === 'WeightPending' ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {computedStatus === 'WeightPending' && (
            <p className="text-xs text-amber-600 font-medium">
              Weight Pending
            </p>
          )}
          {isPaymentPending && (
            <p className="text-xs text-orange-600 font-bold">
              Payment Pending
            </p>
          )}
          {awaitingQty > 0.01 && computedStatus !== 'WeightPending' && (
            <p className="text-xs text-amber-600 font-medium">
              {parseFloat((awaitingQty || 0).toFixed(2))} {unit} remaining
            </p>
          )}
        </div>
      </td>

      {/* Rate Details */}
      <td className="px-6 py-4 align-top text-center">
        {splits.length > 0 ? (
          <div className="space-y-1.5 inline-flex flex-col items-center">
            {splits.slice(0, 2).map((s, idx) => (
              <div key={idx} className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 inline-block">
                <span className="font-bold text-gray-800">₹{s.rate}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-600">
                  {unit === 'Nag' ? (s.nag || s.qty) : parseFloat((s.qty || 0).toFixed(1))}
                  {unit}
                </span>
              </div>
            ))}
            {splits.length > 2 && (
              <div className="text-xs text-gray-400">+ {splits.length - 2} more</div>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-sm">-</span>
        )}
      </td>

      {/* Total Amount */}
      <td className="px-4 py-4 align-middle text-center">
        <span className={`font-bold ${totalSaleAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
          {totalSaleAmount > 0 ? `₹${totalSaleAmount.toLocaleString('en-IN')}` : '-'}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-4 align-middle">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${isPaymentPending
          ? 'bg-orange-100 text-orange-700 border-orange-200'
          : computedStatus === 'Sold'
            ? 'bg-green-100 text-green-700 border-green-200'
            : computedStatus === 'Partial'
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : computedStatus === 'WeightPending'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
          {isPaymentPending && <Clock size={12} />}
          {!isPaymentPending && computedStatus === 'Sold' && <CheckCircle size={12} />}
          {computedStatus === 'Partial' && <Clock size={12} />}
          {computedStatus === 'WeightPending' && <Clock size={12} />}
          {computedStatus === 'Pending' && <Clock size={12} />}

          {isPaymentPending ? 'Payment Pending' : (computedStatus === 'WeightPending' ? 'Weight Pending' : computedStatus)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right align-middle">
        <div className="flex justify-end gap-2 text-right">
          <DownloadInvoiceButton record={record} getInvoiceData={getInvoiceData} />

          <button
            onClick={() => handleEditClick(record)}
            // Can only edit if NO sales have happened yet
            disabled={soldQty > 0}
            className={`p-2 rounded-lg transition border ${soldQty > 0
              ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed'
              : 'border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}
            title={soldQty > 0 ? "Cannot edit sold/partial item" : "Edit"}
          >
            <Edit size={16} />
          </button>

          <button
            onClick={() => initiateDelete(record._id)}
            disabled={soldQty > 0}
            className={`p-2 rounded-lg transition border ${soldQty > 0
              ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed'
              : 'border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
            title={soldQty > 0 ? "Cannot delete sold/partial item" : "Delete"}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

const MobileRecordCard = memo(({ record, handleEditClick, initiateDelete, getInvoiceData }) => {
  // Logic Scope via Shared Helper
  const invoiceData = getInvoiceData(record);

  const hasQuantity = record.quantity > 0;
  const unit = hasQuantity ? 'kg' : 'Nag';
  const totalQty = (hasQuantity ? record.quantity : record.nag) || 0;

  // Extract values for UI display
  const soldQty = (invoiceData.qty > 0 ? invoiceData.qty : invoiceData.nag) || 0;
  const totalSaleAmount = invoiceData.baseAmount;
  const splits = invoiceData.splits || [];

  // Status Logic
  let computedStatus = record.display_status || 'Pending';
  if (!record.display_status) {
    if (soldQty > 0 && totalQty - soldQty <= 0.01) computedStatus = 'Sold';
    else if (soldQty > 0) computedStatus = 'Partial';
  }

  // Payment Status Logic
  let isPaymentPending = false;
  if (computedStatus === 'Sold') {
    const paymentStatus = record.is_parent
      ? (record.aggregated_payment_status || 'Pending')
      : (record.farmer_payment_status || 'Pending');
    if (paymentStatus === 'Pending') isPaymentPending = true;
  }

  const awaitingQty = Math.max(0, totalQty - soldQty);
  const progressPercent = Math.min(100, (soldQty / totalQty) * 100);

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-gray-900 text-lg">
            {record.token && (
              <span className="mr-2 text-green-700 font-bold text-sm">
                #{record.token}
              </span>
            )}
            {record.vegetable}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {new Date(record.createdAt).toLocaleDateString('en-GB')} at {formatTime(record.createdAt)}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${isPaymentPending
          ? 'bg-orange-100 text-orange-700 border-orange-200'
          : computedStatus === 'Sold'
            ? 'bg-green-100 text-green-700 border-green-200'
            : computedStatus === 'Partial'
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : computedStatus === 'WeightPending'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
          {isPaymentPending && <Clock size={12} />}
          {!isPaymentPending && computedStatus === 'Sold' && <CheckCircle size={12} />}
          {computedStatus === 'Partial' && <Clock size={12} />}
          {computedStatus === 'WeightPending' && <Clock size={12} />}
          {computedStatus === 'Pending' && <Clock size={12} />}

          {isPaymentPending ? 'Payment Pending' : (computedStatus === 'WeightPending' ? 'Weight Pending' : computedStatus)}
        </span>
      </div>

      {/* Progress Bar Section */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5 font-medium">
          <span className={soldQty > 0 ? "text-green-700" : "text-gray-500"}>
            Sold: {parseFloat((soldQty || 0).toFixed(2))} {unit}
          </span>
          <span className="text-gray-900">
            Total: {parseFloat((totalQty || 0).toFixed(2))} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isPaymentPending ? 'bg-orange-500' :
              computedStatus === 'Sold' ? 'bg-green-500' :
                computedStatus === 'Partial' ? 'bg-blue-500' :
                  computedStatus === 'WeightPending' ? 'bg-amber-500' : 'bg-gray-400'
              }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        {isPaymentPending && (
          <p className="text-[10px] text-orange-600 mt-1 font-medium text-right font-bold">
            Payment Pending
          </p>
        )}
        {computedStatus === 'WeightPending' && (
          <p className="text-[10px] text-amber-600 mt-1 font-medium text-right">
            Awaiting weighing at market
          </p>
        )}
        {awaitingQty > 0.01 && computedStatus !== 'WeightPending' && (
          <p className="text-[10px] text-amber-600 mt-1 font-medium text-right">
            {parseFloat((awaitingQty || 0).toFixed(2))} {unit} remaining
          </p>
        )}
      </div>

      {/* Sale Details (Collapsible-ish feel) */}
      <div className="space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase">Revenue</span>
          <span className="text-sm font-bold text-gray-900">₹{totalSaleAmount.toLocaleString('en-IN')}</span>
        </div>

        {splits.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {splits.map((split, idx) => (
              <div key={idx} className="flex justify-between text-xs text-gray-600">
                <span>
                  {unit === 'Nag' ? (split.nag || split.qty) : parseFloat(split.qty.toFixed(2))} {unit}
                  <span className="text-gray-400 mx-1">×</span>
                  ₹{split.rate}
                </span>
                <span className="font-medium">₹{split.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pt-1 text-center text-xs text-gray-400 italic">
            No sales yet
          </div>
        )}
      </div>



      {/* Actions */}
      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <div className="flex-1">
          <DownloadInvoiceButton record={record} getInvoiceData={getInvoiceData} />
        </div>

        <button
          onClick={() => handleEditClick(record)}
          disabled={soldQty > 0}
          className={`p-2 rounded-lg flex items-center justify-center ${soldQty > 0
            ? 'bg-gray-100 text-gray-300'
            : 'bg-white border border-gray-200 text-gray-600 shadow-sm'
            }`}
        >
          <Edit size={16} />
        </button>

        <button
          onClick={() => initiateDelete(record._id)}
          disabled={soldQty > 0}
          className={`p-2 rounded-lg flex items-center justify-center ${soldQty > 0
            ? 'bg-gray-100 text-gray-300'
            : 'bg-red-50 text-red-600 border border-red-100'
            }`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
});





export default FarmerDashboard;