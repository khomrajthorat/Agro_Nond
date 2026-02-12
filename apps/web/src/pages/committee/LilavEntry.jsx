import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search,
    User,
    Users,
    Package,
    Check,
    Loader2,
    RefreshCw,
    X,
    Trash2,
    ChevronDown,
    Save,
    Plus,
    ShoppingBasket,
    Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { api as apiNamed } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function LilavEntry() {
    // --- Data (Pre-loaded) ---
    const [farmers, setFarmers] = useState([]);
    const [traders, setTraders] = useState([]);
    const [dailyRates, setDailyRates] = useState([]);
    const [pendingCrops, setPendingCrops] = useState([]);

    // --- Loading ---
    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // --- Selections ---
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [selectedCrops, setSelectedCrops] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState(null); // Single crop dropdown selection

    // --- Multi-Trader Allocations ---
    const [traderAllocations, setTraderAllocations] = useState([]);
    // Format: [{ trader, crop, cropId, rate, baseRate, qty, unit, amount }]

    // --- Dropdown States ---
    const [farmerSearch, setFarmerSearch] = useState('');
    const [traderSearch, setTraderSearch] = useState('');
    const [showFarmerList, setShowFarmerList] = useState(false);
    const [showTraderList, setShowTraderList] = useState(false);
    const [showCropDropdown, setShowCropDropdown] = useState(false);

    // --- Add User Modals ---
    const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
    const [showAddTraderModal, setShowAddTraderModal] = useState(false);
    const [newFarmer, setNewFarmer] = useState({ full_name: '', phone: '' });
    const [newTrader, setNewTrader] = useState({ full_name: '', phone: '', business_name: '' });
    const [addingUser, setAddingUser] = useState(false);

    // --- Item Table ---
    const [itemDetails, setItemDetails] = useState({});

    // --- Token Search ---
    const [tokenSearch, setTokenSearch] = useState('');
    const [isSearchingToken, setIsSearchingToken] = useState(false);

    // --- Auth ---
    const { user } = useAuth();
    const canAddUsers = ['admin', 'committee', 'lilav'].includes(user?.role);

    // --- Refs for click-outside ---
    const farmerDropdownRef = useRef(null);
    const traderDropdownRef = useRef(null);
    const cropDropdownRef = useRef(null);

    // --- Click outside to close dropdowns ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target)) {
                setShowFarmerList(false);
            }
            if (traderDropdownRef.current && !traderDropdownRef.current.contains(event.target)) {
                setShowTraderList(false);
            }
            if (cropDropdownRef.current && !cropDropdownRef.current.contains(event.target)) {
                setShowCropDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Load ALL data on mount ---
    useEffect(() => {
        fetchAllData();
    }, []);

    // --- Auto-refresh every 30 seconds ---
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAllData(true); // silent refresh
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async (silent = false) => {
        try {
            if (!silent) setInitialLoading(true);
            const [farmersRes, tradersRes, ratesRes] = await Promise.all([
                api.get('/api/users?role=farmer'),
                api.get('/api/users?role=trader'),
                api.get('/api/daily-rates/today')
            ]);
            setFarmers(farmersRes?.data || farmersRes || []);
            setTraders(tradersRes?.data || tradersRes || []);
            setDailyRates(ratesRes || []);
        } catch (error) {
            if (!silent) console.error('Failed to load data', error);
        } finally {
            if (!silent) setInitialLoading(false);
        }
    };

    // --- Fetch pending crops when farmer selected ---
    useEffect(() => {
        if (selectedFarmer?._id) {
            fetchPendingCrops(selectedFarmer._id);
        } else {
            setPendingCrops([]);
            setSelectedCrops([]);
            setItemDetails({});
        }
    }, [selectedFarmer]);

    const fetchPendingCrops = async (farmerId) => {
        try {
            const response = await api.get(`/api/records/pending/${farmerId}`);
            const crops = response || [];
            setPendingCrops(crops);

            const details = {};
            crops.forEach(crop => {
                const rate = dailyRates.find(r => r.vegetable.toLowerCase() === crop.vegetable.toLowerCase());
                const { nagValue, qtyValue } = getEffectiveValues(crop);
                const totalQty = nagValue > 0 ? nagValue : qtyValue;
                details[crop._id] = {
                    baseRate: '',
                    rate: '',
                    qty: totalQty
                };
            });
            setItemDetails(details);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const getEffectiveValues = (record) => {
        if (record.has_remaining) {
            return {
                nagValue: record.remaining_nag || 0,
                qtyValue: record.remaining_qty || 0
            };
        }
        const nagValue = (record.official_nag > 0) ? record.official_nag : (record.nag || 0);
        const qtyValue = (record.official_qty > 0) ? record.official_qty : (record.quantity || 0);
        return { nagValue, qtyValue };
    };

    // Helper to calculate remaining available quantity for a crop
    const getRemainingQty = (cropId, excludeTraderId = null) => {
        const crop = pendingCrops.find(c => c._id === cropId);
        if (!crop) return 0;
        const { nagValue, qtyValue } = getEffectiveValues(crop);
        const totalAvailable = nagValue > 0 ? nagValue : qtyValue;

        const allocatedToOthers = traderAllocations
            .filter(a => a.cropId === cropId && a.traderId !== excludeTraderId)
            .reduce((sum, a) => sum + a.qty, 0);

        return Math.max(0, totalAvailable - allocatedToOthers);
    };

    // --- Token Search Handler ---
    const handleTokenSearch = async () => {
        if (!tokenSearch.trim()) return;
        setIsSearchingToken(true);
        try {
            const result = await apiNamed.records.searchByToken(tokenSearch.trim());
            if (result?.farmer) {
                const farmer = result.farmer;
                setSelectedFarmer(farmer);
                setFarmerSearch('');
                setShowFarmerList(false);
                setSelectedCrops([]);
                setSelectedCrop(null);
                setTraderAllocations([]);
                setTokenSearch('');
                toast.success(`Farmer Found: ${farmer.full_name} (Token #${farmer.token})`);
            }
        } catch (error) {
            toast.error(error.message || 'No farmer found with this token today');
        } finally {
            setIsSearchingToken(false);
        }
    };

    // --- Farmer Selection ---
    const handleSelectFarmer = (farmer) => {
        setSelectedFarmer(farmer);
        setFarmerSearch('');
        setShowFarmerList(false);
        setSelectedCrops([]);
        setSelectedCrop(null);
        setTraderAllocations([]);
    };

    const clearFarmer = () => {
        setSelectedFarmer(null);
        setPendingCrops([]);
        setSelectedCrops([]);
        setSelectedCrop(null);
        setItemDetails({});
        setTraderAllocations([]);
        setSelectedTrader(null);
    };

    // --- Trader Selection ---
    const handleSelectTrader = (trader) => {
        setSelectedTrader(trader);
        setTraderSearch('');
        setShowTraderList(false);
    };

    const clearTrader = () => {
        setSelectedTrader(null);
    };

    // --- Crop Selection (Dropdown) ---
    const handleSelectCrop = (crop) => {
        setSelectedCrop(crop);
        setShowCropDropdown(false);
        // Also add to selectedCrops for table display
        if (!selectedCrops.includes(crop._id)) {
            setSelectedCrops([crop._id]);
        }
    };

    // --- Add Trader Allocation (Multi-Trader Feature) ---
    const handleAddTraderAllocation = () => {
        if (!selectedTrader) return toast.error('Select a trader first');
        if (!selectedCrop) return toast.error('Select a crop first');

        const detail = itemDetails[selectedCrop._id];
        if (!detail?.rate || parseFloat(detail.rate) <= 0) {
            return toast.error('Enter rate for the item');
        }
        if (!detail?.qty || parseFloat(detail.qty) <= 0) {
            return toast.error('Enter quantity for the item');
        }

        const remaining = getRemainingQty(selectedCrop._id, selectedTrader._id);
        const inputQty = parseFloat(detail.qty);
        if (inputQty > remaining) {
            return toast.error(`Cannot allocate ${inputQty}. Only ${remaining} available.`);
        }

        const { nagValue, qtyValue } = getEffectiveValues(selectedCrop);
        const unit = nagValue > 0 ? 'Nag' : 'Kg';
        const baseRate = parseFloat(detail.baseRate) || 0;
        const calculatedRate = unit === 'Nag' ? baseRate / 100 : baseRate / 10;
        const amount = parseFloat(detail.qty) * calculatedRate;

        // Check if allocation already exists for this trader + crop combination
        const existingIndex = traderAllocations.findIndex(
            a => a.traderId === selectedTrader._id && a.cropId === selectedCrop._id
        );

        if (existingIndex > -1) {
            // Update existing allocation
            setTraderAllocations(prev => {
                const updated = [...prev];
                updated[existingIndex] = {
                    traderId: selectedTrader._id,
                    traderName: selectedTrader.full_name,
                    traderBusiness: selectedTrader.business_name,
                    cropId: selectedCrop._id,
                    crop: selectedCrop.vegetable,
                    baseRate: baseRate,
                    rate: calculatedRate,
                    qty: parseFloat(detail.qty),
                    unit,
                    amount
                };
                return updated;
            });
        } else {
            // Add new allocation
            setTraderAllocations(prev => [...prev, {
                traderId: selectedTrader._id,
                traderName: selectedTrader.full_name,
                traderBusiness: selectedTrader.business_name,
                cropId: selectedCrop._id,
                crop: selectedCrop.vegetable,
                baseRate: baseRate,
                rate: calculatedRate,
                qty: parseFloat(detail.qty),
                unit,
                amount
            }]);
        }

        // Reset trader selection for next allocation
        setSelectedTrader(null);
        toast.success(`Added allocation for ${selectedTrader.full_name}`);
    };

    // --- Remove Trader Allocation ---
    const removeTraderAllocation = (index) => {
        setTraderAllocations(prev => prev.filter((_, i) => i !== index));
    };

    // --- Add Farmer ---
    const handleAddFarmer = async () => {
        if (!newFarmer.full_name.trim() || newFarmer.full_name.length < 3) {
            return toast.error('Name must be at least 3 characters');
        }

        const phoneRegex = /^\d{10}$/;
        if (!newFarmer.phone.trim() || !phoneRegex.test(newFarmer.phone)) {
            return toast.error('Enter valid 10-digit phone number');
        }

        // Duplicate Check
        const existingFarmer = farmers.find(f => f.phone === newFarmer.phone);
        if (existingFarmer) {
            return toast.error(`Farmer already exists: ${existingFarmer.full_name}`);
        }

        try {
            setAddingUser(true);
            const result = await api.users.create({
                full_name: newFarmer.full_name.trim(),
                phone: newFarmer.phone.trim(),
                role: 'farmer'
            });
            toast.success('Farmer added successfully!');
            setShowAddFarmerModal(false);
            setNewFarmer({ full_name: '', phone: '' });
            await fetchAllData(true);
            if (result?._id) {
                setSelectedFarmer(result);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to add farmer');
        } finally {
            setAddingUser(false);
        }
    };

    // --- Add Trader ---
    const handleAddTrader = async () => {
        if (!newTrader.full_name.trim() || newTrader.full_name.length < 3) {
            return toast.error('Name must be at least 3 characters');
        }

        const phoneRegex = /^\d{10}$/;
        if (!newTrader.phone.trim() || !phoneRegex.test(newTrader.phone)) {
            return toast.error('Enter valid 10-digit phone number');
        }

        // Duplicate Check
        const existingTrader = traders.find(t => t.phone === newTrader.phone);
        if (existingTrader) {
            return toast.error(`Trader already exists: ${existingTrader.full_name}`);
        }

        try {
            setAddingUser(true);
            const result = await api.users.create({
                full_name: newTrader.full_name.trim(),
                phone: newTrader.phone.trim(),
                business_name: newTrader.business_name.trim() || undefined,
                role: 'trader'
            });
            toast.success('Trader added successfully!');
            setShowAddTraderModal(false);
            setNewTrader({ full_name: '', phone: '', business_name: '' });
            await fetchAllData(true);
            if (result?._id) {
                setSelectedTrader(result);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to add trader');
        } finally {
            setAddingUser(false);
        }
    };

    // --- Crop Selection ---
    const toggleCropSelection = (cropId) => {
        setSelectedCrops(prev =>
            prev.includes(cropId)
                ? prev.filter(id => id !== cropId)
                : [...prev, cropId]
        );
    };

    const selectAllCrops = () => {
        setSelectedCrops(pendingCrops.map(c => c._id));
    };

    // --- Item Details Update ---
    const updateItemDetail = (cropId, field, value) => {
        setItemDetails(prev => ({
            ...prev,
            [cropId]: { ...prev[cropId], [field]: value }
        }));
    };

    // Helper to update multiple fields safely
    const updateItemFields = (cropId, updates) => {
        setItemDetails(prev => ({
            ...prev,
            [cropId]: { ...prev[cropId], ...updates }
        }));
    };

    // --- Remove from selection ---
    const removeFromSelection = (cropId) => {
        setSelectedCrops(prev => prev.filter(id => id !== cropId));
    };

    // --- Save Sale (Multi-Trader Support) ---
    const handleSave = async () => {
        if (!selectedFarmer) return toast.error('Select a farmer');

        // Collect all allocations: saved ones + current form if filled
        let allAllocations = [...traderAllocations];

        // Add current form values if trader and crop are selected with valid data
        if (selectedTrader && selectedCrop) {
            const detail = itemDetails[selectedCrop._id];
            if (detail?.rate && parseFloat(detail.rate) > 0 && detail?.qty && parseFloat(detail.qty) > 0) {
                const { nagValue } = getEffectiveValues(selectedCrop);
                const unit = nagValue > 0 ? 'Nag' : 'Kg';
                const baseRate = parseFloat(detail.baseRate) || 0;
                const calculatedRate = unit === 'Nag' ? baseRate / 100 : baseRate / 10;
                const inputQty = parseFloat(detail.qty);

                // Final check against remaining qty
                const remaining = getRemainingQty(selectedCrop._id, selectedTrader._id);
                if (inputQty > remaining) {
                    return toast.error(`Over-allocated ${selectedCrop.vegetable}. Max available: ${remaining} ${unit}`);
                }

                // Check if already exists and update, or add new
                const existingIndex = allAllocations.findIndex(
                    a => a.traderId === selectedTrader._id && a.cropId === selectedCrop._id
                );

                const currentAllocation = {
                    traderId: selectedTrader._id,
                    traderName: selectedTrader.full_name,
                    cropId: selectedCrop._id,
                    crop: selectedCrop.vegetable,
                    baseRate: baseRate,
                    rate: calculatedRate,
                    qty: inputQty,
                    unit: unit.toLowerCase()
                };

                if (existingIndex > -1) {
                    allAllocations[existingIndex] = currentAllocation;
                } else {
                    allAllocations.push(currentAllocation);
                }
            }
        }

        if (allAllocations.length === 0) {
            return toast.error('Add at least one trader allocation');
        }

        try {
            setSaving(true);

            // Group allocations by cropId
            const allocationsByCrop = {};
            allAllocations.forEach(a => {
                if (!allocationsByCrop[a.cropId]) {
                    allocationsByCrop[a.cropId] = [];
                }
                allocationsByCrop[a.cropId].push({
                    trader_id: a.traderId,
                    quantity: a.qty,
                    rate: a.rate
                });
            });

            // Process each crop with its allocations
            for (const cropId of Object.keys(allocationsByCrop)) {
                const crop = pendingCrops.find(c => c._id === cropId);
                const { nagValue } = getEffectiveValues(crop);
                const sale_unit = nagValue > 0 ? 'nag' : 'kg';

                await api.patch(`/api/records/${cropId}/sell`, {
                    allocations: allocationsByCrop[cropId],
                    sale_unit
                });
            }

            const traderCount = new Set(allAllocations.map(a => a.traderId)).size;
            toast.success(`Sale created for ${traderCount} trader(s)!`);

            // Reset all state
            if (selectedFarmer?._id) {
                await fetchPendingCrops(selectedFarmer._id);
            }
            setSelectedCrops([]);
            setSelectedCrop(null);
            setSelectedTrader(null);
            setTraderAllocations([]);
            setItemDetails({});
        } catch (error) {
            toast.error('Sale failed');
        } finally {
            setSaving(false);
        }
    };

    // --- Filtered Lists ---
    const filteredFarmers = useMemo(() => {
        if (!farmerSearch.trim()) return farmers;
        const search = farmerSearch.toLowerCase();
        return farmers.filter(f =>
            f.full_name?.toLowerCase().includes(search) ||
            f.phone?.includes(farmerSearch) ||
            f.farmerId?.toLowerCase().includes(search)
        );
    }, [farmers, farmerSearch]);

    const filteredTraders = useMemo(() => {
        if (!traderSearch.trim()) return traders;
        return traders.filter(t =>
            t.full_name?.toLowerCase().includes(traderSearch.toLowerCase()) ||
            t.business_name?.toLowerCase().includes(traderSearch.toLowerCase())
        );
    }, [traders, traderSearch]);

    // --- Selected crops data ---
    const selectedCropsData = useMemo(() => {
        return pendingCrops.filter(c => selectedCrops.includes(c._id));
    }, [pendingCrops, selectedCrops]);

    // --- Total Amount ---
    const totalAmount = useMemo(() => {
        return selectedCropsData.reduce((sum, crop) => {
            const detail = itemDetails[crop._id] || {};
            // Using calculated rate if available in state, otherwise 0
            return sum + (parseFloat(detail.qty) || 0) * (parseFloat(detail.rate) || 0);
        }, 0);
    }, [selectedCropsData, itemDetails]);

    // --- Loading Screen ---
    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">Lilav Entry</h1>
                    <button
                        onClick={() => fetchAllData()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <div className="px-6 py-6">
                {/* === TOKEN QUICK SEARCH === */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <Hash size={18} className="text-green-600" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Quick Token Search</p>
                                <p className="text-xs text-gray-500">Enter farmer's daily token to auto-select</p>
                            </div>
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
                                disabled={!tokenSearch.trim() || isSearchingToken}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearchingToken ? <Loader2 size={18} className="animate-spin" /> : 'Find'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* === SELECTION BOXES (Vertical Layout) === */}
                <div className="grid grid-cols-1 gap-6 mb-8 max-w-2xl">

                    {/* BOX 1: Farmer */}
                    <div ref={farmerDropdownRef} className="relative group">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                            Farmer Details <span className="text-red-400">*</span>
                        </label>
                        {selectedFarmer ? (
                            <div className="relative flex items-start gap-4 p-5 bg-white border-0 ring-1 ring-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-600 shrink-0">
                                    {selectedFarmer.full_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-gray-900 truncate">{selectedFarmer.full_name}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                        <span className="font-medium">{selectedFarmer.phone}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{selectedFarmer.farmerId || 'N/A'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={clearFarmer}
                                    className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="w-full h-[88px] bg-white border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/10 transition-all duration-200 group-hover:shadow-sm"
                                    onClick={() => setShowFarmerList(true)}
                                >
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-emerald-600 transition-colors">Select Farmer</span>
                                    <span className="text-xs text-gray-400 mt-1">{canAddUsers ? 'Search or add new' : 'Search farmer'}</span>
                                </div>

                                {showFarmerList && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={farmerSearch}
                                                    onChange={(e) => setFarmerSearch(e.target.value)}
                                                    placeholder="Search farmer..."
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            {filteredFarmers.length === 0 ? (
                                                <div className="px-4 py-8 text-center text-gray-400 text-sm">No farmers found</div>
                                            ) : (
                                                filteredFarmers.slice(0, 15).map(f => (
                                                    <button
                                                        key={f._id}
                                                        onClick={() => handleSelectFarmer(f)}
                                                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors group/item"
                                                    >
                                                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold group-hover/item:bg-white group-hover/item:text-emerald-600 transition-colors">
                                                            {f.full_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{f.full_name}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{f.phone}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                        {canAddUsers && (
                                            <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                                                <button
                                                    onClick={() => { setShowFarmerList(false); setShowAddFarmerModal(true); }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
                                                >
                                                    <Plus size={16} /> Add New Farmer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* === TRADER & CROP ROW === */}
                {selectedFarmer && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Trader Details */}
                        <div ref={traderDropdownRef} className="relative group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                                Trader Details <span className="text-red-400">*</span>
                            </label>
                            {selectedTrader ? (
                                <div className="relative flex items-start gap-4 p-5 bg-white border-0 ring-1 ring-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                                        {selectedTrader.full_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-gray-900 truncate">{selectedTrader.full_name}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span className="font-medium">{selectedTrader.business_name || 'No Business Name'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={clearTrader}
                                        className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-full h-[88px] bg-white border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 transition-all duration-200 group-hover:shadow-sm"
                                        onClick={() => setShowTraderList(true)}
                                    >
                                        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Select Trader</span>
                                        <span className="text-xs text-gray-400 mt-1">{canAddUsers ? 'Search or add new' : 'Search trader'}</span>
                                    </div>

                                    {showTraderList && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                                <div className="relative">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={traderSearch}
                                                        onChange={(e) => setTraderSearch(e.target.value)}
                                                        placeholder="Search trader..."
                                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                                {filteredTraders.length === 0 ? (
                                                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No traders found</div>
                                                ) : (
                                                    filteredTraders.slice(0, 15).map(t => (
                                                        <button
                                                            key={t._id}
                                                            onClick={() => handleSelectTrader(t)}
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors group/item"
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold group-hover/item:bg-white group-hover/item:text-blue-600 transition-colors">
                                                                {t.full_name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 text-sm">{t.full_name}</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">{t.business_name || t.phone}</p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            {canAddUsers && (
                                                <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                                                    <button
                                                        onClick={() => { setShowTraderList(false); setShowAddTraderModal(true); }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                                                    >
                                                        <Plus size={16} /> Add New Trader
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Select Crop */}
                        <div ref={cropDropdownRef} className="relative group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                                Select Crop <span className="text-red-400">*</span>
                                <span className="text-gray-400 text-xs font-normal ml-2">({pendingCrops.length} available)</span>
                            </label>
                            {selectedCrop ? (
                                <div className="relative flex items-center gap-4 p-5 bg-white border-0 ring-1 ring-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                    <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-lg font-bold text-purple-600 shrink-0">
                                        <Package size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-gray-900 truncate">{selectedCrop.vegetable}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span className="font-medium">
                                                {(() => {
                                                    const { nagValue, qtyValue } = getEffectiveValues(selectedCrop);
                                                    const qty = nagValue > 0 ? nagValue : qtyValue;
                                                    const unit = nagValue > 0 ? 'Nag' : 'Kg';
                                                    return `${qty} ${unit}`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedCrop(null); setSelectedCrops([]); }}
                                        className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-full h-[88px] bg-white border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/10 transition-all duration-200 group-hover:shadow-sm"
                                        onClick={() => setShowCropDropdown(true)}
                                    >
                                        <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">Select Pending Crop</span>
                                        <span className="text-xs text-gray-400 mt-1">Choose from farmer's pending crops</span>
                                    </div>

                                    {showCropDropdown && pendingCrops.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                                {pendingCrops.map(crop => {
                                                    const { nagValue, qtyValue } = getEffectiveValues(crop);
                                                    const qty = nagValue > 0 ? nagValue : qtyValue;
                                                    const unit = nagValue > 0 ? 'Nag' : 'Kg';

                                                    return (
                                                        <button
                                                            key={crop._id}
                                                            onClick={() => handleSelectCrop(crop)}
                                                            className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors group/item"
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold group-hover/item:bg-white group-hover/item:text-purple-600 transition-colors">
                                                                <Package size={16} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900 text-sm">{crop.vegetable}</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">{qty} {unit} available</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* === ITEM TABLE === */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 shadow-sm ring-1 ring-gray-200/50">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate Calculation</th>
                                <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Quantity</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Amount</th>
                                <th className="w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {selectedCropsData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <ShoppingBasket className="w-10 h-10 opacity-20" />
                                            <p className="text-sm font-medium">No items selected yet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                selectedCropsData.map(crop => {
                                    const { nagValue, qtyValue } = getEffectiveValues(crop);
                                    const unit = nagValue > 0 ? 'Nag' : 'Kg';
                                    const maxQty = nagValue > 0 ? nagValue : qtyValue;
                                    const detail = itemDetails[crop._id] || {};

                                    // Calculate values based on inputs
                                    const baseRate = parseFloat(detail.baseRate) || 0;
                                    const calculatedRate = unit === 'Nag'
                                        ? baseRate / 100
                                        : baseRate / 10;

                                    const amount = (parseFloat(detail.qty) || 0) * calculatedRate;

                                    return (
                                        <tr key={crop._id} className="group hover:bg-slate-50/50 transition-colors">
                                            {/* Item Name */}
                                            <td className="px-6 py-4 align-middle">
                                                <div>
                                                    <p className="font-bold text-gray-900 text-base">{crop.vegetable}</p>
                                                    {/* ID hidden as requested */}
                                                </div>
                                            </td>

                                            {/* Rate Calculation Section */}
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-4">
                                                    {/* Primary Input */}
                                                    <div className="flex-1 max-w-[140px]">
                                                        <label className="block text-[10px] font-extrabold text-gray-600 uppercase mb-1">
                                                            Rate / {unit === 'Nag' ? '100 Nag' : '10 Kg'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={detail.baseRate || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const rate = val ? parseFloat(val) / (unit === 'Nag' ? 100 : 10) : 0;
                                                                    updateItemFields(crop._id, { baseRate: val, rate: rate });
                                                                }}
                                                                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Secondary Display (ReadOnly) */}
                                                    <div className="flex-1 max-w-[100px] opacity-70">
                                                        <label className="block text-[10px] font-extrabold text-gray-600 uppercase mb-1">
                                                            Rate / {unit === 'Nag' ? '1 Nag' : '1 Kg'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={calculatedRate || ''}
                                                                readOnly
                                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium cursor-default focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Quantity Input */}
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            value={detail.qty || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    updateItemDetail(crop._id, 'qty', val);
                                                                    return;
                                                                }
                                                                const numVal = parseFloat(val);
                                                                const remaining = getRemainingQty(crop._id, selectedTrader?._id);
                                                                if (numVal > remaining) {
                                                                    toast.error(`Maximum allowed is ${remaining} ${unit}`);
                                                                    return;
                                                                }
                                                                updateItemDetail(crop._id, 'qty', val);
                                                            }}
                                                            className="w-24 pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-center text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-3 text-xs font-medium text-gray-400 pointer-events-none">
                                                            {unit}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-bold mt-1.5 uppercase tracking-wide">
                                                        Max: {getRemainingQty(crop._id, selectedTrader?._id)} / {maxQty}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Amount Display */}
                                            <td className="px-6 py-4 align-middle text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-bold text-gray-900">
                                                        ₹{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 align-middle text-right">
                                                <button
                                                    onClick={() => removeFromSelection(crop._id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {/* Footer with Total */}
                        {selectedCropsData.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50/50 border-t border-gray-200">
                                    <td colSpan="3" className="px-6 py-5 text-right">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Payable Amount</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-2xl font-bold text-emerald-600">
                                            ₹{totalAmount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* === SAVED ALLOCATIONS === */}
                {traderAllocations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Users size={18} />
                            Saved Allocations ({traderAllocations.length})
                        </h3>
                        <div className="space-y-3">
                            {traderAllocations.map((allocation, index) => (
                                <div key={index} className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                            {allocation.traderName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{allocation.traderName}</p>
                                            <p className="text-xs text-gray-500">
                                                {allocation.crop} • {allocation.qty} {allocation.unit} • <span className="font-medium text-emerald-600">₹{allocation.baseRate} / {allocation.unit === 'Nag' ? '100 Nag' : '10 Kg'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-bold text-gray-900">
                                            ₹{allocation.amount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                        <button
                                            onClick={() => removeTraderAllocation(index)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove allocation"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === ACTION BUTTONS === */}
                <div className="flex justify-end gap-4 pt-4 pb-12">
                    {/* Add Trader Button - only for allowed roles */}
                    {canAddUsers && (
                        <button
                            onClick={handleAddTraderAllocation}
                            disabled={!selectedFarmer || !selectedTrader || !selectedCrop || saving}
                            className="px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-3 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:shadow-none"
                        >
                            <Plus size={20} />
                            Add Trader
                        </button>
                    )}

                    {!canAddUsers && (
                        <button
                            onClick={handleAddTraderAllocation}
                            disabled={!selectedFarmer || !selectedTrader || !selectedCrop || saving}
                            className="px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-3 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:shadow-none"
                        >
                            <Plus size={20} />
                            Add Allocation
                        </button>
                    )}

                    {/* Save & Create Transaction */}
                    <button
                        onClick={handleSave}
                        disabled={saving || (!selectedCrop && traderAllocations.length === 0) || !selectedFarmer}
                        className="px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-3 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:shadow-none"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Save & Create Transaction
                    </button>
                </div>
            </div>

            {/* === ADD FARMER MODAL === */}
            {showAddFarmerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Add New Farmer</h3>
                            <button onClick={() => setShowAddFarmerModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={newFarmer.full_name}
                                    onChange={(e) => setNewFarmer(prev => ({ ...prev, full_name: e.target.value }))}
                                    placeholder="Enter farmer name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={newFarmer.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setNewFarmer(prev => ({ ...prev, phone: val }));
                                    }}
                                    placeholder="Enter 10-digit phone number"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowAddFarmerModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFarmer}
                                disabled={addingUser}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {addingUser && <Loader2 size={16} className="animate-spin" />}
                                Add Farmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === ADD TRADER MODAL === */}
            {showAddTraderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Add New Trader</h3>
                            <button onClick={() => setShowAddTraderModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={newTrader.full_name}
                                    onChange={(e) => setNewTrader(prev => ({ ...prev, full_name: e.target.value }))}
                                    placeholder="Enter trader name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={newTrader.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setNewTrader(prev => ({ ...prev, phone: val }));
                                    }}
                                    placeholder="Enter 10-digit phone number"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newTrader.business_name}
                                    onChange={(e) => setNewTrader(prev => ({ ...prev, business_name: e.target.value }))}
                                    placeholder="Enter business name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowAddTraderModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTrader}
                                disabled={addingUser}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {addingUser && <Loader2 size={16} className="animate-spin" />}
                                Add Trader
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}