import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, User, UserPlus, ChevronDown, Trash2, Plus, Package } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// --- VEGETABLE DATA ---
const VEGETABLE_CATEGORIES = [
  {
    id: 'onion-potato',
    name: 'Onion-Potato',
    marathi: 'कांदा-बटाटा',
    items: [
      { english: 'Onion', marathi: 'कांदा' },
      { english: 'Potato', marathi: 'बटाटा' },
      { english: 'Garlic', marathi: 'लसूण' },
      { english: 'Ginger', marathi: 'आले / अद्रक' },
      { english: 'Sweet Potato', marathi: 'रताळे' }
    ]
  },
  {
    id: 'daily-veg',
    name: 'Daily Veg',
    marathi: 'फळ भाज्या',
    items: [
      { english: 'Tomato', marathi: 'टोमॅटो' },
      { english: 'Brinjal / Eggplant', marathi: 'वांगी' },
      { english: 'Lady Finger / Okra', marathi: 'भेंडी' },
      { english: 'Green Chili', marathi: 'हिरवी मिरची' },
      { english: 'Capsicum', marathi: 'ढोबळी मिरची' },
      { english: 'Drumstick', marathi: 'शेवगा' },
      { english: 'Cucumber', marathi: 'काकडी' },
      { english: 'Lemon', marathi: 'लिंबू' }
    ]
  },
  {
    id: 'leafy-veg',
    name: 'Leafy Veg',
    marathi: 'पाला भाज्या',
    items: [
      { english: 'Coriander', marathi: 'कोथिंबीर' },
      { english: 'Fenugreek', marathi: 'मेथी' },
      { english: 'Spinach', marathi: 'पालक' },
      { english: 'Dill Leaves', marathi: 'शेपू' },
      { english: 'Amaranth', marathi: 'लाल माठ' },
      { english: 'Mint', marathi: 'पुदिना' },
      { english: 'Curry Leaves', marathi: 'कढीपत्ता' },
      { english: 'Spring Onion', marathi: 'कांद्याची पात' }
    ]
  },
  {
    id: 'vine-veg',
    name: 'Vine Veg / Gourds',
    marathi: 'वेलवर्गीय',
    items: [
      { english: 'Bottle Gourd', marathi: 'दुधी भोपळा' },
      { english: 'Bitter Gourd', marathi: 'कारले' },
      { english: 'Ridge Gourd', marathi: 'डोडका' },
      { english: 'Sponge Gourd', marathi: 'घोसाळे' },
      { english: 'Snake Gourd', marathi: 'पडवळ' },
      { english: 'Pumpkin', marathi: 'लाल भोपळा / डांगर' },
      { english: 'Ash Gourd', marathi: 'कोहळा' }
    ]
  },
  {
    id: 'beans-pods',
    name: 'Beans / Pods',
    marathi: 'शेंगा भाज्या',
    items: [
      { english: 'Cluster Beans', marathi: 'गवार' },
      { english: 'French Beans', marathi: 'फरसबी' },
      { english: 'Green Peas', marathi: 'मटार / ओला वाटाणा' },
      { english: 'Flat Beans', marathi: 'घेवडा / वाल' },
      { english: 'Double Beans', marathi: 'डबल बी' },
      { english: 'Cowpea', marathi: 'चवळी' }
    ]
  },
  {
    id: 'roots-salad',
    name: 'Roots & Salad',
    marathi: 'कंदमुळं / कोबी',
    items: [
      { english: 'Cabbage', marathi: 'कोबी' },
      { english: 'Cauliflower', marathi: 'फ्लॉवर' },
      { english: 'Carrot', marathi: 'गाजर' },
      { english: 'Radish', marathi: 'मुळा' },
      { english: 'Beetroot', marathi: 'बीट' },
      { english: 'Elephant Foot Yam', marathi: 'सुरण' }
    ]
  },
  {
    id: 'fruits',
    name: 'Fruits',
    marathi: 'फळे',
    items: [
      { english: 'Banana', marathi: 'केळी' },
      { english: 'Apple', marathi: 'सफरचंद' },
      { english: 'Pomegranate', marathi: 'डाळिंब' },
      { english: 'Guava', marathi: 'पेरू' },
      { english: 'Orange', marathi: 'संत्री' },
      { english: 'Sweet Lime', marathi: 'मोसंबी' },
      { english: 'Papaya', marathi: 'पपई' },
      { english: 'Watermelon', marathi: 'कलिंगड' },
      { english: 'Grapes', marathi: 'द्राक्षे' },
      { english: 'Custard Apple', marathi: 'सीताफळ' },
      { english: 'Mango', marathi: 'आंबा' },
      { english: 'Sapodilla', marathi: 'चिकू' },
      { english: 'Pineapple', marathi: 'अननस' }
    ]
  }
];

export default function AddFarmerModal({ isOpen, onClose, onAdd }) {
  // Farmer details
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vegetable record fields
  const [selectedVegetable, setSelectedVegetable] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [nag, setNag] = useState('');
  const [addedItems, setAddedItems] = useState([]);

  // Filter vegetables based on search
  const filteredCategories = VEGETABLE_CATEGORIES.map(cat => {
    const matchingItems = searchTerm.length > 0
      ? cat.items.filter(item =>
        item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marathi.includes(searchTerm)
      )
      : cat.items;
    return { ...cat, items: matchingItems };
  }).filter(cat => cat.items.length > 0);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Enter valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVegetableSelect = (item) => {
    setSelectedVegetable(item.english);
    setSearchTerm(`${item.english} (${item.marathi})`);
    setIsDropdownOpen(false);
  };

  const handleQuantityChange = (value) => {
    setQuantity(value);
    if (value) setNag(''); // Clear nag if quantity is entered
  };

  const handleNagChange = (value) => {
    setNag(value);
    if (value) setQuantity(''); // Clear quantity if nag is entered
  };

  const handleAddItem = () => {
    if (!selectedVegetable) {
      toast.error('Please select a vegetable');
      return;
    }

    const qtyValue = parseFloat(quantity) || 0;
    const nagValue = parseFloat(nag) || 0;

    if (qtyValue === 0 && nagValue === 0) {
      toast.error('Please enter quantity or nag');
      return;
    }

    // Check for quantity multiple of 10
    if (qtyValue > 0 && qtyValue % 10 !== 0) {
      toast.error('Quantity must be a multiple of 10');
      return;
    }

    // Check for duplicates
    if (addedItems.some(item => item.vegetable === selectedVegetable)) {
      toast.error('This vegetable is already added');
      return;
    }

    setAddedItems([...addedItems, {
      vegetable: selectedVegetable,
      quantity: qtyValue,
      nag: nagValue,
    }]);

    // Reset fields
    setSelectedVegetable('');
    setSearchTerm('');
    setQuantity('');
    setNag('');
    toast.success('Item added');
  };

  const handleRemoveItem = (index) => {
    setAddedItems(addedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/users/add', {
        role: 'farmer',
        full_name: formData.name,
        phone: formData.phone,
        location: formData.village,
        initialRecords: addedItems, // Send initial records
      });

      const newUser = response?.user || response;

      if (newUser) {
        onAdd(newUser);
        toast.success('Farmer added successfully!');
        // Reset form
        setFormData({ name: '', phone: '', village: '' });
        setAddedItems([]);
        onClose();
      } else {
        throw new Error("Invalid response received from server");
      }

    } catch (error) {
      console.error('Failed to add farmer:', error);
      const message = error.response?.data?.error || error.message || 'Failed to add farmer';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Add New Farmer</h3>
                      <p className="text-sm text-slate-500">Register a farmer with initial record</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Farmer Details Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Farmer Details</h4>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter farmer's full name"
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${errors.name
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-slate-200 focus:border-emerald-500 hover:border-slate-300'
                          } focus:ring-0 focus:outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500" />{errors.name}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${errors.phone
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-slate-200 focus:border-emerald-500 hover:border-slate-300'
                          } focus:ring-0 focus:outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500" />{errors.phone}</p>}
                  </div>

                  {/* Village */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Village <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="village"
                        value={formData.village}
                        onChange={handleChange}
                        placeholder="Enter village name"
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${errors.village
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-slate-200 focus:border-emerald-500 hover:border-slate-300'
                          } focus:ring-0 focus:outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                      />
                    </div>
                    {errors.village && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500" />{errors.village}</p>}
                  </div>
                </div>

                {/* Add New Record Section */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Add New Record (Optional)</h4>
                  </div>

                  {/* Vegetable Select */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Vegetable Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setSelectedVegetable('');
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Search or Select Vegetable..."
                        className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 focus:outline-none bg-slate-50 focus:bg-white text-sm"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {filteredCategories.length === 0 ? (
                            <div className="p-4 text-center text-slate-500">No vegetables found</div>
                          ) : (
                            filteredCategories.flatMap(cat =>
                              cat.items.map((item, idx) => (
                                <button
                                  key={`${cat.id}-${idx}`}
                                  type="button"
                                  onClick={() => handleVegetableSelect(item)}
                                  className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition border-b border-slate-50 last:border-0"
                                >
                                  <p className="text-sm font-medium text-slate-800">{item.english}</p>
                                  <p className="text-xs text-slate-500">{item.marathi}</p>
                                </button>
                              ))
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quantity and Nag - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity (Leave empty if using Nag)</label>
                      <label className="block text-xs text-slate-500 mb-2">Kilograms (Kg)</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0"
                        step="10"
                        min="0"
                        className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-0 focus:outline-none bg-emerald-50/50 text-sm font-medium"
                      />
                    </div>

                    {/* Nag */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nag (Leave empty if using Quantity)</label>
                      <label className="block text-xs text-slate-500 mb-2">Nag (Nag)</label>
                      <input
                        type="number"
                        value={nag}
                        onChange={(e) => handleNagChange(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="Enter nag (e.g., 100, 200, 300...)"
                        step="100"
                        min="0"
                        className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-0 focus:outline-none bg-emerald-50/50 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Add Item Button */}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Item
                  </button>

                  {/* Added Items List */}
                  {addedItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-600">Added Items ({addedItems.length})</p>
                      {addedItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-800">{item.vegetable}</p>
                            <p className="text-xs text-slate-500">
                              {item.quantity > 0 ? `${item.quantity} kg` : `${item.nag} Nag`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-5 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-5 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Add Farmer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}