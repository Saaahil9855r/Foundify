import React, { useState, useEffect } from 'react';
import { 
  Search, PlusCircle, ShieldCheck, CheckCircle2, AlertTriangle, 
  HelpCircle, ArrowRight, Package, Sparkles, Filter, Award, 
  Lock, Check, XCircle, FileText, Printer, Tag, UploadCloud, 
  Image as ImageIcon, Copy, ExternalLink, Zap, ArrowLeft, RefreshCw, LogOut
} from 'lucide-react';

const CATEGORIES = ['Electronics', 'ID Cards & Wallets', 'Books & Stationary', 'Keys', 'Clothing', 'Others'];
const API_URL = 'http://localhost:5000/api';
const BASE_SERVER_URL = 'http://localhost:5000';

export default function App() {
  // Tab state synced with localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('foundify_active_tab') || 'home';
  });

  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Inline flow states (No popups)
  const [activeClaimItem, setActiveClaimItem] = useState(null);
  const [reportResultData, setReportResultData] = useState(null);
  const [claimReceiptData, setClaimReceiptData] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin JWT Auth states
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('foundify_admin_token') || null);
  const [adminInputPass, setAdminInputPass] = useState('');
  const [adminClaims, setAdminClaims] = useState([]);

  // Form states
  const [reportForm, setReportForm] = useState({
    type: 'lost',
    category: CATEGORIES[0],
    title: '',
    description: '',
    location: '',
    roll_no: '',
    email: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [claimForm, setClaimForm] = useState({
    claimant_roll_no: '',
    claimant_email: '',
    proof_details: ''
  });

  // Save tab on change
  useEffect(() => {
    localStorage.setItem('foundify_active_tab', activeTab);
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/items?type=${typeFilter}&category=${categoryFilter}&status=${statusFilter}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('foundify_admin_token');
  };

  const fetchAdminClaims = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch(`${API_URL}/admin/claims`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        handleAdminLogout();
        return;
      }
      const data = await res.json();
      setAdminClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load claims:', err);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminInputPass })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('foundify_admin_token', data.token);
        setAdminInputPass('');
      } else {
        alert(data.error || 'Authentication failed.');
      }
    } catch (err) {
      alert('Server connection error.');
    }
  };

  useEffect(() => {
    fetchItems();
    if (activeTab === 'admin' && adminToken) {
      fetchAdminClaims();
    }
  }, [typeFilter, categoryFilter, statusFilter, activeTab, adminToken]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payloadType = reportForm.type || 'lost';
    const payloadCategory = reportForm.category || CATEGORIES[0];
    const payloadTitle = reportForm.title?.trim();
    const payloadDesc = reportForm.description?.trim();
    const payloadLoc = reportForm.location?.trim();
    const payloadRoll = reportForm.roll_no?.trim();
    const payloadEmail = reportForm.email?.trim();

    if (!payloadTitle || !payloadDesc || !payloadLoc || !payloadRoll || !payloadEmail) {
      alert("Please fill in all required text fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('type', payloadType);
      formData.append('category', payloadCategory);
      formData.append('title', payloadTitle);
      formData.append('description', payloadDesc);
      formData.append('location', payloadLoc);
      formData.append('roll_no', payloadRoll);
      formData.append('email', payloadEmail);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setReportResultData(data);
        setReportForm({
          type: 'lost',
          category: CATEGORIES[0],
          title: '',
          description: '',
          location: '',
          roll_no: '',
          email: ''
        });
        setSelectedFile(null);
        setImagePreviewUrl(null);
        fetchItems();
      } else {
        alert(data.error || 'Failed to submit report.');
      }
    } catch (err) {
      alert('Cannot connect to backend server. Ensure "node index.js" is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: activeClaimItem.id,
          claimant_roll_no: claimForm.claimant_roll_no,
          claimant_email: claimForm.claimant_email,
          proof_details: claimForm.proof_details
        })
      });
      const data = await res.json();
      if (res.ok) {
        setClaimReceiptData({
          claim_id: data.claim_id,
          item_id: activeClaimItem.id,
          item_title: activeClaimItem.title,
          claimant_roll: claimForm.claimant_roll_no,
          date: new Date().toLocaleString()
        });
        setClaimForm({ claimant_roll_no: '', claimant_email: '', proof_details: '' });
        fetchItems();
      } else {
        alert(data.error || 'Failed to submit claim.');
      }
    } catch (err) {
      alert('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminAction = async (claimId, itemId, actionStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: actionStatus, item_id: itemId })
      });
      if (res.ok) {
        fetchAdminClaims();
        fetchItems();
      } else {
        alert('Action unauthorized or failed.');
      }
    } catch (err) {
      alert('Admin action failed.');
    }
  };

  const startClaimProcess = (item) => {
    setActiveClaimItem(item);
    setClaimReceiptData(null);
    setActiveTab('claim_desk');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredItems = items.filter((it) => {
    const q = searchQuery.toLowerCase();
    return it.title.toLowerCase().includes(q) || 
           it.description.toLowerCase().includes(q) || 
           it.location.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div>
        {/* Navigation Bar */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveTab('home')}
            >
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Foundify <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">v2.3</span>
                </h1>
                <p className="text-xs text-slate-400">Campus Retrieval & Verification Portal</p>
              </div>
            </div>

            <nav className="flex items-center space-x-1 sm:space-x-2">
              {[
                { id: 'home', label: 'Home', icon: null },
                { id: 'browse', label: 'Browse Feed', icon: Search },
                { id: 'report', label: 'Report Item', icon: PlusCircle },
                { id: 'guide', label: 'How to Claim', icon: HelpCircle },
                { id: 'admin', label: 'Security Desk', icon: Lock }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setReportResultData(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />} {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-12">
              <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 shadow-2xl">
                <div className="max-w-2xl space-y-4 relative z-10">
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-indigo-500/30 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Automated Campus Matching Engine
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Recover your lost items across campus in minutes.
                  </h2>
                  <p className="text-slate-300 text-base sm:text-lg">
                    Real-time fuzzy text matching, photo uploads, and an authentic verification workflow for university recovery.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      onClick={() => { setActiveTab('report'); setReportResultData(null); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                    >
                      <PlusCircle className="w-5 h-5" /> Report Lost / Found
                    </button>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl border border-slate-700 transition flex items-center gap-2"
                    >
                      <Search className="w-5 h-5" /> Search Live Feed
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                    <Package className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white">{items.length}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Campus Entries</p>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white">100%</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Verified Handover Flow</p>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white">&lt; 50ms</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fuzzy Match Latency</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BROWSE FEED */}
          {activeTab === 'browse' && (
            <div>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-sm mb-8 space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, location (e.g. Library, Canteen), or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="All">All Types</option>
                      <option value="Lost">🔴 Lost Items</option>
                      <option value="Found">🟢 Found Items</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="All">All Categories</option>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="All">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="claimed">Claim Pending</option>
                      <option value="closed">Closed / Handed Over</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full bg-slate-900/40 text-center py-16 rounded-2xl border border-slate-800 text-slate-400">
                    <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-300">No matching campus records</p>
                  </div>
                ) : (
                  filteredItems.map((it) => (
                    <div 
                      key={it.id} 
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      {it.image_url ? (
                        <div className="h-44 w-full bg-slate-950 relative overflow-hidden">
                          <img 
                            src={`${BASE_SERVER_URL}${it.image_url}`} 
                            alt={it.title}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="h-28 w-full bg-slate-950 flex items-center justify-center text-slate-600 text-xs border-b border-slate-800">
                          <ImageIcon className="w-5 h-5 mr-1 text-slate-600" /> No Photo Attached
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              it.type === 'lost' 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {it.type}
                            </span>
                            <span className="text-xs font-mono text-slate-500">#{it.id}</span>
                          </div>

                          <h3 className="font-bold text-base text-white mb-1">{it.title}</h3>
                          <p className="text-xs text-indigo-400 font-medium mb-3 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> {it.category}
                          </p>
                          <p className="text-xs text-slate-300 mb-4 line-clamp-2 leading-relaxed">{it.description}</p>
                        </div>

                        <div>
                          <div className="border-t border-slate-800 pt-3 text-xs text-slate-400 mb-4 space-y-1">
                            <p>📍 <strong>Location:</strong> {it.location}</p>
                            <p>👤 <strong>Reported By:</strong> {it.roll_no}</p>
                          </div>

                          {it.type === 'found' && it.status === 'open' && (
                            <button
                              onClick={() => startClaimProcess(it)}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                            >
                              <ShieldCheck className="w-4 h-4" /> Claim This Item
                            </button>
                          )}
                          {it.status !== 'open' && (
                            <div className="w-full bg-slate-800/60 text-slate-400 text-center py-2 rounded-xl text-xs font-medium border border-slate-700">
                              Status: {it.status.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REPORT ITEM & INLINE RESULT VIEW */}
          {activeTab === 'report' && (
            <div className="max-w-3xl mx-auto">
              {!reportResultData ? (
                <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-1 text-white">Report Lost / Found Item</h2>
                  <p className="text-xs text-slate-400 mb-6">Attach location and details for instant automated matching.</p>

                  <form onSubmit={handleReportSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Status Type</label>
                        <select
                          value={reportForm.type}
                          onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="lost">Lost</option>
                          <option value="found">Found</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                        <select
                          value={reportForm.category}
                          onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Item Title / Model</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Casio Scientific Calculator fx-991EX"
                        value={reportForm.title}
                        onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Central Library 2nd Floor, Seminar Hall"
                        value={reportForm.location}
                        onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Item Image (Optional)</label>
                      <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-950 relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {imagePreviewUrl ? (
                          <div className="flex flex-col items-center">
                            <img src={imagePreviewUrl} alt="Preview" className="h-32 object-contain rounded-lg mb-2" />
                            <p className="text-xs text-indigo-400 font-semibold">{selectedFile?.name}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-2 text-slate-400">
                            <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="text-xs font-semibold text-slate-300">Click to upload photo</p>
                            <p className="text-[10px] text-slate-500">PNG, JPG, WEBP up to 5MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., 23P31A4439"
                          value={reportForm.roll_no}
                          onChange={(e) => setReportForm({ ...reportForm, roll_no: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">College Email</label>
                        <input
                          type="email"
                          required
                          placeholder="student@college.edu.in"
                          value={reportForm.email}
                          onChange={(e) => setReportForm({ ...reportForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Identifying Marks</label>
                      <textarea
                        rows="3"
                        required
                        placeholder="Include color, scratches, distinctive stickers, cover color..."
                        value={reportForm.description}
                        onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 ${
                        isSubmitting
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                          Scanning Matches & Submitting...
                        </>
                      ) : (
                        'Submit Item to Portal'
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* INLINE REPORT CONFIRMATION VIEW (Replaces Popup) */
                <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Item Logged Successfully!</h3>
                      <p className="text-xs text-slate-400">Assigned Reference Tag: <strong className="font-mono text-indigo-400">#{reportResultData.item?.id}</strong></p>
                    </div>
                  </div>

                  {reportResultData.matches?.length > 0 ? (
                    <div className="bg-slate-950 rounded-2xl border border-amber-500/30 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                          <Sparkles className="w-4 h-4" /> Potential Matching Records Detected:
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                          {reportResultData.matches.length} found
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {reportResultData.matches.map((m) => (
                          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white text-xs">#{m.id} {m.title}</p>
                              <p className="text-slate-400 text-[11px]">📍 {m.location}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {m.confidence}% Match
                              </span>
                              {m.type === 'found' && (
                                <button
                                  onClick={() => startClaimProcess(m)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                >
                                  Claim
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                      No immediate matching opposite items were found. Your report is now live in the Browse Feed.
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setReportResultData(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl text-xs transition"
                    >
                      Report Another Item
                    </button>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
                    >
                      Go to Live Feed <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEDICATED INLINE CLAIM WORKSTATION (Replaces Popup) */}
          {activeTab === 'claim_desk' && (
            <div className="max-w-4xl mx-auto">
              {!claimReceiptData ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Item Snapshot */}
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                        <Tag className="w-4 h-4" /> Target Item Details
                      </div>

                      {activeClaimItem?.image_url && (
                        <img 
                          src={`${BASE_SERVER_URL}${activeClaimItem.image_url}`} 
                          alt="Item" 
                          className="h-44 w-full object-cover rounded-2xl border border-slate-800"
                        />
                      )}

                      <div>
                        <span className="text-xs font-mono text-slate-500">Item #{activeClaimItem?.id}</span>
                        <h3 className="text-xl font-bold text-white">{activeClaimItem?.title}</h3>
                        <p className="text-xs text-indigo-400 font-semibold mb-2">{activeClaimItem?.category}</p>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                          {activeClaimItem?.description}
                        </p>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                        <p>📍 <strong>Turned In At:</strong> {activeClaimItem?.location}</p>
                        <p>👤 <strong>Finder:</strong> {activeClaimItem?.roll_no}</p>
                      </div>
                    </div>

                    {/* Claim Form */}
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4" /> Ownership Verification Form
                      </div>

                      <form onSubmit={handleClaimSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Your Roll Number</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., 23P31A4439"
                            value={claimForm.claimant_roll_no}
                            onChange={(e) => setClaimForm({ ...claimForm, claimant_roll_no: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Your College Email</label>
                          <input
                            type="email"
                            required
                            placeholder="student@college.edu.in"
                            value={claimForm.claimant_email}
                            onChange={(e) => setClaimForm({ ...claimForm, claimant_email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Private Distinguishing Proof</label>
                          <textarea
                            rows="4"
                            required
                            placeholder="Specify secret identifiers (lockscreen wallpaper description, serial numbers, invoice, internal stickers)..."
                            value={claimForm.proof_details}
                            onChange={(e) => setClaimForm({ ...claimForm, proof_details: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? 'Submitting Verification...' : 'Submit Claim for Security Approval'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                /* INLINE DIGITAL RECEIPT (Replaces Popup) */
                <div className="max-w-lg mx-auto bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl text-center space-y-6 animate-in fade-in duration-200">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <FileText className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">Claim Verification Pass Generated</h3>
                    <p className="text-xs text-slate-400 mt-1">Show this reference to the Campus Security Desk during collection.</p>
                  </div>

                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 text-left relative overflow-hidden font-mono text-xs space-y-3">
                    <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-300 text-[9px] uppercase px-3 py-1 rounded-bl-xl border-l border-b border-indigo-500/30 font-sans font-bold">
                      Official Receipt
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Item Claimed</p>
                      <p className="text-white font-semibold text-sm">{claimReceiptData.item_title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Claim ID</p>
                        <p className="text-indigo-400 font-bold">#{claimReceiptData.claim_id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Item ID</p>
                        <p className="text-indigo-400 font-bold">#{claimReceiptData.item_id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Claimant Roll</p>
                        <p className="text-slate-300">{claimReceiptData.claimant_roll}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Date & Time</p>
                        <p className="text-slate-400 text-[10px] truncate">{claimReceiptData.date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => copyToClipboard(`Claim #${claimReceiptData.claim_id} (Roll: ${claimReceiptData.claimant_roll})`)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-700"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId ? 'Copied' : 'Copy Pass'}
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                    >
                      <Printer className="w-4 h-4" /> Print PDF
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('browse')}
                    className="w-full text-xs text-slate-400 hover:text-slate-200 py-2 transition"
                  >
                    Return to Browse Feed
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HOW TO CLAIM GUIDE */}
          {activeTab === 'guide' && (
            <div className="max-w-3xl mx-auto bg-slate-900/60 p-8 sm:p-10 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-white">Ownership Claim & Handover Protocol</h2>
                <p className="text-xs text-slate-400 mt-1">Follow standard campus security procedure to retrieve lost property.</p>
              </div>

              <div className="space-y-4">
                {[
                  { step: '1', title: 'Locate Item in Feed', desc: 'Browse the feed and click "Claim This Item" on the matching entry.' },
                  { step: '2', title: 'Submit Distinguishing Proof', desc: 'Provide private identifiers in the Claim Station (wallpapers, serial numbers, scratches, or invoices).' },
                  { step: '3', title: 'Security Review & Collection', desc: 'Campus Security verifies proof against physical custody items and marks the claim as Approved for collection.' }
                ].map((g) => (
                  <div key={g.step} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex gap-4 items-start">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {g.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{g.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN / SECURITY DESK */}
          {activeTab === 'admin' && (
            <div className="max-w-4xl mx-auto">
              {!adminToken ? (
                <div className="max-w-md mx-auto bg-slate-900/60 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Campus Security Desk Access</h3>
                  <p className="text-xs text-slate-400">Enter authorization passcode to manage claims.</p>
                  
                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <input
                      type="password"
                      placeholder="Enter Security Passcode"
                      value={adminInputPass}
                      onChange={(e) => setAdminInputPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-center text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                    >
                      Authenticate (JWT Secure)
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        Security Claim Review Dashboard
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">JWT Session Active</span>
                      </h3>
                      <p className="text-xs text-slate-400">Total verification requests: {adminClaims.length}</p>
                    </div>
                    <button
                      onClick={handleAdminLogout}
                      className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-1.5 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Lock Desk
                    </button>
                  </div>

                  <div className="space-y-4">
                    {adminClaims.length === 0 ? (
                      <div className="bg-slate-900/40 text-center py-12 rounded-2xl text-slate-500 text-xs">
                        No pending claims for review.
                      </div>
                    ) : (
                      adminClaims.map((c) => (
                        <div key={c.claim_id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                Claim #{c.claim_id} for Item #{c.item_id}
                              </span>
                              <h4 className="font-bold text-white text-base mt-1">{c.item_title}</h4>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                              c.claim_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              c.claim_status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {c.claim_status}
                            </span>
                          </div>

                          {c.item_image_url && (
                            <img 
                              src={`${BASE_SERVER_URL}${c.item_image_url}`} 
                              alt="Claim Item" 
                              className="h-28 rounded-xl object-cover border border-slate-800"
                            />
                          )}

                          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                            <p className="text-slate-300"><strong>Claimant:</strong> {c.claimant_roll_no} ({c.claimant_email})</p>
                            <p className="text-slate-300"><strong>Submitted Proof:</strong> {c.proof_details}</p>
                            <p className="text-slate-500 text-[10px]">Submitted: {c.claim_time}</p>
                          </div>

                          {c.claim_status === 'pending' && (
                            <div className="flex gap-3 pt-1">
                              <button
                                onClick={() => handleAdminAction(c.claim_id, c.item_id, 'approved')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve & Mark Handed Over
                              </button>
                              <button
                                onClick={() => handleAdminAction(c.claim_id, c.item_id, 'rejected')}
                                className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold py-2 rounded-xl text-xs transition border border-rose-500/30 flex items-center justify-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject Claim
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Foundify Engine • Smart Campus Retrieval System
      </footer>
    </div>
  );
}