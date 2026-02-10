import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import api from '../../lib/api';
import {
    Plus, Trash2, Upload, Search, X, Package,
    ChevronDown, ChevronUp, Loader2, Save, Leaf, FileText, CheckCircle2,
    FileSpreadsheet, Filter, RefreshCw, Pencil, Languages, CheckSquare, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Category options for dropdown
const CATEGORY_OPTIONS = [
    'Onion-Potato',
    'Daily Veg',
    'Leafy Veg',
    'Vine Veg / Gourds',
    'Beans / Pods',
    'Roots & Salad',
    'Fruits',
    'Other'
];

const VegetableManagement = () => {
    const [vegetables, setVegetables] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [expandedCategories, setExpandedCategories] = useState([]);

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null); // Track if editing
    const [formData, setFormData] = useState({
        name: '',
        marathiName: '',
        category: 'Other',
        units: ['kg']
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    // CSV Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');

    // Bulk Actions state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showBulkEditUnits, setShowBulkEditUnits] = useState(false);

    // Fetch vegetables
    const fetchVegetables = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.vegetables.list();
            setVegetables(data.vegetables || []);
            setGrouped(data.grouped || {});
            setExpandedCategories(Object.keys(data.grouped || {}));
            setSelectedIds(new Set()); // Clear selection on refresh
        } catch (error) {
            console.error('Failed to fetch vegetables:', error);
            toast.error('Failed to load vegetables');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVegetables();
    }, [fetchVegetables]);

    // Toggle category expansion
    const toggleCategory = (category) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Filter vegetables by search AND category
    const filteredGrouped = Object.entries(grouped).reduce((acc, [category, items]) => {
        if (categoryFilter !== 'All' && category !== categoryFilter) {
            return acc;
        }

        const filtered = items.filter(veg =>
            veg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            veg.marathiName.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {});

    // Helper: Get all currently filtered IDs
    const getAllFilteredIds = () => {
        return Object.values(filteredGrouped).flat().map(v => v._id);
    };

    // Handle Select All
    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = getAllFilteredIds();
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Handle Single Selection
    const toggleSelection = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Bulk Delete
    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} w-full max-w-sm bg-white shadow-xl rounded-2xl pointer-events-auto border border-slate-100 p-4 ring-1 ring-black/5`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">Bulk Delete</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Delete <span className="font-medium text-slate-800">{selectedIds.size} items</span>? This cannot be undone.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    try {
                                        await api.vegetables.bulkDelete(Array.from(selectedIds));
                                        toast.success(`Deleted ${selectedIds.size} vegetables`);
                                        fetchVegetables();
                                    } catch (error) {
                                        toast.error(error.message || 'Failed to delete vegetables');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/20 transition-all"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: Infinity });
    };

    // Bulk Update Units
    const handleBulkUpdateUnits = async (units) => {
        if (selectedIds.size === 0) return;
        try {
            await api.vegetables.bulkUpdate(Array.from(selectedIds), { units });
            toast.success(`Updated units for ${selectedIds.size} vegetables`);
            fetchVegetables();
            setShowBulkEditUnits(false);
        } catch (error) {
            toast.error(error.message || 'Failed to update units');
        }
    };


    // Reset Form
    const resetForm = () => {
        setFormData({ name: '', marathiName: '', category: 'Other', units: ['kg'] });
        setEditingId(null);
        setShowAddForm(false);
    };

    // Start Edit
    const handleEdit = (veg) => {
        setFormData({
            name: veg.name,
            marathiName: veg.marathiName,
            category: veg.category,
            units: veg.units || ['kg']
        });
        setEditingId(veg._id);
        setShowAddForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle form submit (Create or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.marathiName.trim()) {
            toast.error('Name and Marathi name are required');
            return;
        }

        if (formData.units.length === 0) {
            toast.error('Select at least one unit type');
            return;
        }

        try {
            setIsSubmitting(true);
            if (editingId) {
                // UPDATE
                await api.vegetables.update(editingId, formData);
                toast.success('Vegetable updated successfully!');
            } else {
                // CREATE
                await api.vegetables.create(formData);
                toast.success('Vegetable added successfully!');
            }
            resetForm();
            fetchVegetables();
        } catch (error) {
            toast.error(error.message || `Failed to ${editingId ? 'update' : 'add'} vegetable`, { duration: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle unit toggle
    const toggleUnit = (unit) => {
        setFormData(prev => ({
            ...prev,
            units: prev.units.includes(unit)
                ? prev.units.filter(u => u !== unit)
                : [...prev.units, unit]
        }));
    };

    // Handle delete with Custom Toast
    const handleDelete = (id, name) => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} w-full max-w-sm bg-white shadow-xl rounded-2xl pointer-events-auto border border-slate-100 p-4 ring-1 ring-black/5`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">Delete Vegetable</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Delete <span className="font-medium text-slate-800">{name}</span>? This cannot be undone.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    try {
                                        await api.vegetables.delete(id);
                                        toast.success('Vegetable deleted');
                                        fetchVegetables();
                                    } catch (error) {
                                        toast.error(error.message || 'Failed to delete vegetable');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/20 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-500">
                        <X size={16} />
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    // Handle seed defaults with Custom Toast
    const handleSeedDefaults = () => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} w-full max-w-sm bg-white shadow-xl rounded-2xl pointer-events-auto border border-slate-100 p-4 ring-1 ring-black/5`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">Seed Database</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            This will add default vegetables to your list.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    try {
                                        const result = await api.vegetables.seed();
                                        toast.success(result.message);
                                        fetchVegetables();
                                    } catch (error) {
                                        toast.error(error.message || 'Failed to seed vegetables');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-500/20 transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-500">
                        <X size={16} />
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    // Handle CSV file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please select a CSV file');
            return;
        }

        setCsvFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    toast.error('CSV file must have a header row and at least one data row');
                    return;
                }

                // Parse header
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const nameIdx = headers.findIndex(h => h === 'name' || h === 'english');
                const marathiIdx = headers.findIndex(h => h === 'marathiname' || h === 'marathi');
                const categoryIdx = headers.findIndex(h => h === 'category');
                const unitsIdx = headers.findIndex(h => h === 'units' || h === 'unit');

                if (nameIdx === -1 || marathiIdx === -1) {
                    toast.error('CSV must have "name" (or "english") and "marathiName" (or "marathi") columns');
                    return;
                }

                // Parse data rows
                const parsedData = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    if (values[nameIdx] && values[marathiIdx]) {
                        parsedData.push({
                            name: values[nameIdx],
                            marathiName: values[marathiIdx],
                            category: categoryIdx !== -1 ? values[categoryIdx] || 'Other' : 'Other',
                            units: unitsIdx !== -1 && values[unitsIdx]
                                ? values[unitsIdx].split('|').map(u => u.trim().toLowerCase())
                                : ['kg']
                        });
                    }
                }

                setCsvData(parsedData);
                setShowImportModal(true);
            } catch (err) {
                console.error('CSV parse error:', err);
                toast.error('Failed to parse CSV file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Handle CSV import
    const handleImport = async () => {
        if (csvData.length === 0) return;

        try {
            setIsSubmitting(true);
            const result = await api.vegetables.bulkCreate(csvData);
            toast.success(result.message);
            setShowImportModal(false);
            setCsvData([]);
            setCsvFileName('');
            fetchVegetables();
        } catch (error) {
            toast.error(error.message || 'Failed to import vegetables');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Download sample CSV
    const downloadSampleCSV = () => {
        const csvContent = `name,marathiName,category,units
Onion,कांदा,Onion-Potato,kg
Banana,केळी,Fruits,kg|nag
Spinach,पालक,Leafy Veg,kg|nag`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vegetable_import_sample.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Auto-translate to Marathi
    const handleTranslate = async () => {
        if (!formData.name || formData.name.trim() === '') return;

        try {
            setIsTranslating(true);
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(formData.name)}`);
            const data = await res.json();
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                const marathiText = data[0][0][0];
                setFormData(prev => ({ ...prev, marathiName: marathiText }));
                toast.success('Translated to Marathi');
            }
        } catch (error) {
            console.error('Translation failed:', error);
            // Silent fail or optional toast, don't block user
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" reverseOrder={false} />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Leaf className="text-emerald-600" size={28} />
                        Vegetable Management
                    </h1>
                    <p className="text-slate-500 mt-1">Configure and manage vegetable listings for the marketplace.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadSampleCSV}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <FileSpreadsheet size={16} />
                        Sample CSV
                    </button>
                    <label className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer flex items-center gap-2">
                        <Upload size={16} />
                        Import CSV
                        <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                    </label>
                    <button
                        onClick={() => {
                            if (showAddForm && !editingId) {
                                // If open and not editing, just close
                                resetForm();
                            } else {
                                // If closed or editing, reset and open for new
                                resetForm();
                                setShowAddForm(true);
                            }
                        }}
                        className={`px-5 py-2 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2 transition-all ${showAddForm && !editingId
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                            }`}
                    >
                        <Plus size={18} className={`transition-transform duration-300 ${showAddForm && !editingId ? 'rotate-45' : ''}`} />
                        {showAddForm && !editingId ? 'Close Form' : 'Add New'}
                    </button>
                </div>
            </div>

            {/* Inline Add/Edit Form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                {editingId ? <Pencil className="text-emerald-500" size={20} /> : <Plus className="text-emerald-500" size={20} />}
                                {editingId ? 'Edit Vegetable' : 'Add New Vegetable'}
                            </h3>
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Name (English)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                onBlur={handleTranslate}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
                                                placeholder="e.g. Onion"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Name (Marathi)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.marathiName}
                                                onChange={(e) => setFormData({ ...formData, marathiName: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 pr-20"
                                                placeholder="e.g. कांदा"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleTranslate}
                                                disabled={isTranslating}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-slate-200"
                                                title="Auto Translate"
                                            >
                                                {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                                                Translate
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium text-slate-700"
                                        >
                                            {CATEGORY_OPTIONS.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Units</label>
                                        <div className="flex gap-2">
                                            <div
                                                onClick={() => toggleUnit('kg')}
                                                className={`flex-1 px-3 py-2.5 rounded-xl border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${formData.units.includes('kg')
                                                    ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {formData.units.includes('kg') && <CheckCircle2 size={18} className="text-blue-600" fill="currentColor" color="white" />}
                                                <span className="text-sm font-bold">KG</span>
                                            </div>
                                            <div
                                                onClick={() => toggleUnit('nag')}
                                                className={`flex-1 px-3 py-2.5 rounded-xl border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${formData.units.includes('nag')
                                                    ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {formData.units.includes('nag') && <CheckCircle2 size={18} className="text-purple-600" fill="currentColor" color="white" />}
                                                <span className="text-sm font-bold">NAG</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-5 py-2.5 text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {editingId ? 'Update Vegetable' : 'Save Vegetable'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Actions Floating Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-200 p-2 pl-4 flex items-center gap-4 min-w-[320px]"
                    >
                        <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm font-medium text-slate-600">Selected</span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowBulkEditUnits(!showBulkEditUnits)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${showBulkEditUnits ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Pencil size={14} />
                                    Edit Units
                                </button>
                                {showBulkEditUnits && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden flex flex-col p-1">
                                        <button onClick={() => handleBulkUpdateUnits(['kg'])} className="px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg text-slate-700">Set to <strong>KG Only</strong></button>
                                        <button onClick={() => handleBulkUpdateUnits(['nag'])} className="px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg text-slate-700">Set to <strong>Nag Only</strong></button>
                                        <button onClick={() => handleBulkUpdateUnits(['kg', 'nag'])} className="px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg text-slate-700">Set to <strong>Both</strong></button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Select All Checkbox */}
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={selectedIds.size > 0 && selectedIds.size === getAllFilteredIds().length}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.size > 0 ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                                {selectedIds.size > 0 && <CheckCircle2 size={14} />}
                            </div>
                            <span>Select All</span>
                        </label>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search vegetables by name..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Filter size={16} />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer appearance-none min-w-[180px]"
                            >
                                <option value="All">All Categories</option>
                                {CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200 text-sm text-slate-500">
                            <span className="flex items-center gap-2">
                                <Package size={16} />
                                <span className="font-semibold text-slate-700">{vegetables.length}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                    </div>
                ) : vegetables.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50/50">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                            <Leaf className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-slate-800 font-semibold text-lg">No vegetables found</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">Your database is empty. You can add vegetables manually or seed a default list.</p>
                        <div className="mt-8 flex justify-center gap-3">
                            <button
                                onClick={handleSeedDefaults}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Seed Default List
                            </button>
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowAddForm(true);
                                }}
                                className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Add Manually
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {Object.entries(filteredGrouped).length === 0 ? (
                            <div className="py-12 text-center">
                                <Search className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-slate-500 font-medium">No results found</p>
                                <p className="text-slate-400 text-sm mt-1">Try adjusting your search or category filter.</p>
                            </div>
                        ) : Object.entries(filteredGrouped).map(([category, items]) => (
                            <div key={category} className="group">
                                <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div
                                        onClick={() => toggleCategory(category)}
                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${expandedCategories.includes(category) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                            {expandedCategories.includes(category) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-700 block text-base">{category}</span>
                                            <span className="text-xs text-slate-500 font-medium">{items.length} vegetables</span>
                                        </div>
                                    </div>
                                    {/* Category Select All - Optional improvement could be here */}
                                </div>

                                <AnimatePresence>
                                    {expandedCategories.includes(category) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-white"
                                        >
                                            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {items.map(veg => (
                                                    <div
                                                        key={veg._id}
                                                        className={`p-3 rounded-xl border shadow-sm flex items-center gap-3 transition-all duration-200 ${selectedIds.has(veg._id)
                                                            ? 'bg-emerald-100/60 border-emerald-500 ring-1 ring-emerald-500 shadow-md transform scale-[1.01]'
                                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}
                                                    >
                                                        {/* Checkbox */}
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); toggleSelection(veg._id); }}
                                                            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all ${selectedIds.has(veg._id)
                                                                ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                                                                : 'bg-white border-slate-300 text-transparent hover:border-emerald-400'}`}
                                                        >
                                                            <CheckCircle2 size={16} strokeWidth={3} />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-700 truncate">{veg.name}</div>
                                                            <div className="text-xs text-slate-500 truncate">{veg.marathiName}</div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="flex -space-x-1">
                                                                {veg.units.includes('kg') && (
                                                                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-100" title="Kilogram">KG</div>
                                                                )}
                                                                {veg.units.includes('nag') && (
                                                                    <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold border border-purple-100" title="Nag/Count">N</div>
                                                                )}
                                                            </div>
                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleEdit(veg)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Simplified Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Review Import</h3>
                                <p className="text-sm text-slate-500">{csvData.length} records found in {csvFileName}</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Marathi</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Category</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Units</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {csvData.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-700">{row.name}</td>
                                            <td className="px-6 py-3 text-slate-500">{row.marathiName}</td>
                                            <td className="px-6 py-3 text-slate-500">{row.category}</td>
                                            <td className="px-6 py-3 text-slate-500">
                                                <div className="flex gap-1">
                                                    {row.units.map(u => (
                                                        <span key={u} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 uppercase font-medium">{u}</span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel Import
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                                Confirm Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VegetableManagement;
