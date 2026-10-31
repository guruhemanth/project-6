import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  IndianRupee,
  QrCode,
  Banknote,
  Send,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
  Phone,
  DoorOpen,
  User,
  ShieldCheck,
  Building2,
  MapPin,
  Flame
} from 'lucide-react';
import api from '../services/api';
import useCollectionStore from '../store/useCollectionStore';
import { useOfflineCollector } from '../hooks/useOfflineCollector';
import { sendDoorstepWhatsAppReceipt } from '../utils/whatsappReceipt';

// Quick Preset Contribution Chips (Festival Standard Denominations)
const PRESET_AMOUNTS = [251, 501, 1116, 2116, 5001];

export default function DoorstepCollector() {
  const { societyName, city, state, username, records, fetchStats, fetchRecords } = useCollectionStore();

  // Input State
  const [doorNumber, setDoorNumber] = useState('');
  const [donorName, setDonorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'UPI'

  // UI Flow State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs for keyboard navigation & instant autofocus
  const doorInputRef = useRef(null);
  const amountInputRef = useRef(null);

  // Hook into offline queue manager
  const { isOnline, isSyncing, pendingCount, enqueueDonation, flushQueue } = useOfflineCollector(
    useCallback(() => {
      fetchStats();
      fetchRecords();
    }, [fetchStats, fetchRecords])
  );

  // Autofocus Door Number field on mount
  useEffect(() => {
    doorInputRef.current?.focus();
  }, []);

  // Filter cached resident suggestions based on entered door number
  const suggestedResidents = useMemo(() => {
    if (!doorNumber.trim() || doorNumber.trim().length < 1) return [];
    const query = doorNumber.trim().toUpperCase();
    const safeRecords = Array.isArray(records) ? records : [];
    const matches = safeRecords.filter((r) => r.door_number?.toUpperCase().includes(query));
    // Unique by donor name
    const unique = [];
    const seen = new Set();
    for (const m of matches) {
      const key = `${m.door_number}-${m.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
    }
    return unique.slice(0, 3);
  }, [doorNumber, records]);

  // Generate dynamic UPI Payment Deep Link String (NPCI Spec)
  const upiUri = useMemo(() => {
    const cleanAmount = parseFloat(amount) || 0;
    const vpa = `${(societyName || 'ganeshutsav').toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`;
    const payeeName = encodeURIComponent(societyName || 'Festival Pandal Committee');
    const note = encodeURIComponent(`Chandas Flat ${doorNumber.trim().toUpperCase() || 'Member'}`);

    return `upi://pay?pa=${vpa}&pn=${payeeName}&am=${cleanAmount.toFixed(2)}&cu=INR&tn=${note}`;
  }, [societyName, doorNumber, amount]);

  // Handle Preset Amount Tap
  const handleSelectPreset = (val) => {
    setAmount(String(val));
    setError('');
  };

  // Select resident suggestion
  const handleSelectSuggestion = (resident) => {
    setDoorNumber(resident.door_number.toUpperCase());
    if (resident.name) setDonorName(resident.name);
    if (resident.phone_number) setPhoneNumber(resident.phone_number);
    amountInputRef.current?.focus();
  };

  // Primary Submission Handler (< 5s Execution Loop)
  const handleProcessCollection = async (forcedMode) => {
    const activeMode = forcedMode || paymentMode;
    setError('');

    if (!doorNumber.trim()) {
      setError('Please enter a Door / Flat number.');
      doorInputRef.current?.focus();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please select or enter a valid collection amount.');
      amountInputRef.current?.focus();
      return;
    }

    // If UPI clicked and modal not yet confirmed, pop UPI QR modal
    if (activeMode === 'UPI' && !showUpiModal && !forcedMode) {
      setShowUpiModal(true);
      return;
    }

    setLoading(true);

    const payload = {
      door_number: doorNumber.trim().toUpperCase(),
      name: donorName.trim() || 'Resident Member',
      phone_number: phoneNumber.trim() || null,
      amount: parsedAmount,
      payment_mode: activeMode,
    };

    try {
      let savedRecord;

      if (!navigator.onLine) {
        savedRecord = await enqueueDonation(payload);
      } else {
        const idempotencyKey =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `doorstep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const res = await api.post('/api/records', {
          ...payload,
          idempotency_key: idempotencyKey,
        });
        savedRecord = res.data;
      }

      setLastSubmittedRecord({
        ...payload,
        id: savedRecord.id || 'OFFLINE',
        created_at: new Date().toISOString(),
      });

      setShowUpiModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Doorstep submission error:', err);
      // If network fails during request, fallback to local offline queue
      const queued = await enqueueDonation(payload);
      setLastSubmittedRecord({
        ...payload,
        id: 'QUEUED',
        created_at: new Date().toISOString(),
      });
      setShowUpiModal(false);
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Instant Reset for Next Door (< 1s reset cycle)
  const handleResetForNextDoor = () => {
    setDoorNumber('');
    setDonorName('');
    setPhoneNumber('');
    setAmount('');
    setPaymentMode('Cash');
    setShowSuccessModal(false);
    setShowUpiModal(false);
    setError('');
    setTimeout(() => {
      doorInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Header Bar with Live Network Status */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              🕉
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white">OneN</span>
                <span className="text-[10px] uppercase font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                  Fast Collect
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
                {societyName || 'Festival Pandal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={flushQueue}
                disabled={isSyncing}
                className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-bold transition-all"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>{pendingCount} Queued</span>
              </button>
            )}

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={11} />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Fast Input Card */}
        <div className="bg-slate-900/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800 shadow-2xl space-y-4">
          {/* Flat / Door Number (Auto-Focus & Uppercase) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="door-number" className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <DoorOpen size={14} className="text-amber-400" />
                <span>Flat / Door Number</span>
                <span className="text-amber-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">AUTOFOCUS</span>
            </div>
            <input
              id="door-number"
              ref={doorInputRef}
              type="text"
              value={doorNumber}
              onChange={(e) => {
                setDoorNumber(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="e.g. 101, 4-A, 12/B"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white rounded-2xl px-4 py-3 text-lg font-black tracking-wide placeholder-slate-600 outline-none transition-all"
            />

            {/* Resident Autocomplete Pill Suggestions */}
            {suggestedResidents.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">Recent:</span>
                {suggestedResidents.map((res) => (
                  <button
                    key={`${res.door_number}-${res.name}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(res)}
                    className="text-[11px] bg-slate-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 px-2.5 py-1 rounded-xl border border-slate-700 font-medium whitespace-nowrap transition-all"
                  >
                    🚪 {res.door_number} • {res.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick-Select Contribution Amount Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400" />
                <span>Select Amount</span>
                <span className="text-amber-400">*</span>
              </label>
              <span className="text-[10px] text-amber-400 font-semibold">1-Tap Preset</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_AMOUNTS.map((val) => {
                const isSelected = amount === String(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.03]'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:bg-slate-800'
                    }`}
                  >
                    ₹{val}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div className="relative mt-2.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">
                ₹
              </span>
              <input
                ref={amountInputRef}
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Or custom amount..."
                min="1"
                step="1"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white rounded-2xl pl-9 pr-4 py-2.5 text-base font-bold placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Compact Optional Resident Metadata (Collapsible/Inline) */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="donor-name" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                <User size={12} className="text-slate-500" />
                <span>Donor Name (Opt)</span>
              </label>
              <input
                id="donor-name"
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white rounded-xl px-3 py-2 text-xs placeholder-slate-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="phone-number" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                <Phone size={12} className="text-slate-500" />
                <span>Mobile (WhatsApp)</span>
              </label>
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white rounded-xl px-3 py-2 text-xs placeholder-slate-600 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Dual Action Bottom Bar (Cash vs UPI Fast Trigger) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleProcessCollection('Cash')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-4 px-4 rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
          >
            <Banknote size={20} />
            <span>CASH PAID (₹)</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleProcessCollection('UPI')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-4 px-4 rounded-2xl shadow-xl shadow-amber-500/15 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
          >
            <QrCode size={20} />
            <span>SHOW UPI QR</span>
          </button>
        </div>
      </main>

      {/* ── MODAL 1: Instant Dynamic UPI QR Code Modal ── */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <QrCode size={18} />
                <span>Scan & Pay via UPI</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium">{societyName || 'Festival Pandal'}</p>
              <h3 className="text-3xl font-black text-white">
                ₹{parseFloat(amount || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-amber-400 font-semibold">
                Flat: {doorNumber.toUpperCase()} {donorName ? `• ${donorName}` : ''}
              </p>
            </div>

            {/* Render High-Contrast Crisp QR Code */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl mx-auto">
              <QRCodeSVG
                value={upiUri}
                size={210}
                level="Q"
                includeMargin={false}
              />
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Accepts GPay, PhonePe, Paytm & any BHIM UPI app
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleProcessCollection('UPI')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all text-sm"
            >
              <CheckCircle2 size={18} />
              <span>PAYMENT RECEIVED</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Instant Post-Submission Success Loop ── */}
      {showSuccessModal && lastSubmittedRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            {/* Festival Blessing & Check Animation */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl animate-bounce">
              ✓
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {lastSubmittedRecord.payment_mode.toUpperCase()} RECEIVED
              </span>
              <h3 className="text-3xl font-black text-white pt-1">
                ₹{Number(lastSubmittedRecord.amount).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Flat <strong className="text-amber-400">{lastSubmittedRecord.door_number}</strong> • {lastSubmittedRecord.name}
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Receipt ID:</span>
              <span className="font-mono text-slate-200 font-bold">
                {lastSubmittedRecord.id !== 'OFFLINE' && lastSubmittedRecord.id !== 'QUEUED'
                  ? `REC-${String(lastSubmittedRecord.id).padStart(5, '0')}`
                  : 'QUEUED (OFFLINE)'}
              </span>
            </div>

            {/* High-Speed Action Loop Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  sendDoorstepWhatsAppReceipt({
                    societyName,
                    city,
                    receiptId: lastSubmittedRecord.id,
                    doorNumber: lastSubmittedRecord.door_number,
                    donorName: lastSubmittedRecord.name,
                    amount: lastSubmittedRecord.amount,
                    paymentMode: lastSubmittedRecord.payment_mode,
                    collectorName: username || 'Volunteer',
                    phoneNumber: lastSubmittedRecord.phone_number,
                  })
                }
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all text-sm"
              >
                <Send size={18} />
                <span>SEND WHATSAPP RECEIPT</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNextDoor}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all text-sm"
              >
                <span>NEXT DOOR</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
