import { useState, useEffect } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  IndianRupee,
  Receipt,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Wallet,
  Building2,
  MapPin,
  CheckCircle2,
  PieChart,
  FileDown
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import useCollectionStore from '../store/useCollectionStore';
import { AuditReportPDF } from '../components/AuditReportPDF';

export default function ExpensesPage() {
  const { stats, records, expenses, societyName, city, state, fetchStats, fetchRecords, fetchExpenses } = useCollectionStore();

  const totalCollected = Number(stats?.total) || 0;

  // Local storage key scoped per society/admin for calculator persistence
  const storageKey = `chandas_expenses_${societyName || 'default'}`;

  const [localExpenses, setLocalExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved expenses', e);
    }
    return [
      { id: 1, name: 'Idol & Mandapam', amount: 15000 },
      { id: 2, name: 'Pooja Items & Priest', amount: 3500 },
      { id: 3, name: 'Prasadam / Annadanam', amount: 8000 },
      { id: 4, name: 'Lighting & Sound System', amount: 4500 },
      { id: 5, name: 'Nimajjanam & Transport', amount: 5000 },
    ];
  });

  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
    fetchRecords();
    fetchExpenses();
  }, [fetchStats, fetchRecords, fetchExpenses]);

  // Persist expenses changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localExpenses));
    } catch (e) {
      console.error('Failed to save expenses', e);
    }
  }, [localExpenses, storageKey]);

  const totalExpenses = localExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const balanceRemaining = totalCollected - totalExpenses;
  const expensePercentage = totalCollected > 0 ? Math.min(100, Math.round((totalExpenses / totalCollected) * 100)) : 0;

  const handleAddExpense = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newExpenseName.trim()) {
      setError('Please provide an expense description / item name.');
      return;
    }

    const parsed = parseFloat(newExpenseAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid positive expense amount.');
      return;
    }

    const newItem = {
      id: Date.now(),
      name: newExpenseName.trim(),
      amount: parsed,
    };

    setLocalExpenses([...localExpenses, newItem]);
    setSuccess(`Added "${newItem.name}" (₹${parsed.toLocaleString('en-IN')}) to budget calculator.`);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const handleRemoveExpense = (id) => {
    const item = localExpenses.find((ex) => ex.id === id);
    setLocalExpenses(localExpenses.filter((ex) => ex.id !== id));
    if (item) {
      setSuccess(`Removed "${item.name}".`);
    }
  };

  const handleResetExpenses = () => {
    if (window.confirm('Reset all expense items in this calculator?')) {
      setLocalExpenses([]);
      setSuccess('Calculator reset. Ready for new items.');
    }
  };

  // Convert local expenses to formatted list for the PDF
  const pdfExpenses = localExpenses.map((ex) => ({
    category: 'Expenditure',
    description: ex.name,
    amount: ex.amount,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🕉</span>
            <h2 className="text-2xl font-bold">Festival Expenses & Budget Calculator</h2>
          </div>
          <div className="flex items-center gap-3 text-orange-100 text-xs sm:text-sm font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {societyName || 'GovindaNagar'}
            </span>
            {(city || state) && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {[city, state].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              Live Total Integration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* A4 Notice Board Audit PDF Generator Button */}
          <PDFDownloadLink
            document={
              <AuditReportPDF
                societyName={societyName}
                city={city}
                state={state}
                records={records}
                expenses={pdfExpenses}
              />
            }
            fileName={`Chandas_Audit_Report_${(societyName || 'Society').replace(/\s+/g, '_')}_2026.pdf`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-bold shadow-md transition-all border border-orange-200"
          >
            {({ loading }) => (
              <>
                <FileDown size={15} />
                <span>{loading ? 'Preparing PDF...' : 'Download Notice Board PDF'}</span>
              </>
            )}
          </PDFDownloadLink>

          <button
            type="button"
            onClick={handleResetExpenses}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all"
          >
            <RotateCcw size={14} />
            Reset Items
          </button>
        </div>
      </div>

      {/* Primary Financial Overview Cards (3-Column) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Collected */}
        <div className="card !p-5 border-l-4 border-l-orange-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Funds Collected</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">
              ₹{totalCollected.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">From {stats?.count || 0} donors</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Wallet size={24} />
          </div>
        </div>

        {/* Card 2: Total Estimated Expenses */}
        <div className="card !p-5 border-l-4 border-l-red-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Planned Expenses</p>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              - ₹{totalExpenses.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{localExpenses.length} expenditure item(s)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Card 3: Net Balance Remaining */}
        <div className={`card !p-5 border-l-4 ${balanceRemaining >= 0 ? 'border-l-emerald-500' : 'border-l-rose-600'} flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {balanceRemaining >= 0 ? 'Surplus Balance Remaining' : 'Budget Deficit (Shortage)'}
            </p>
            <h3 className={`text-2xl font-black mt-1 ${balanceRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{Math.abs(balanceRemaining).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {balanceRemaining >= 0 ? `${100 - expensePercentage}% remaining surplus` : 'Requires additional collections'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${balanceRemaining >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <IndianRupee size={24} />
          </div>
        </div>
      </div>

      {/* Progress Bar of Budget Utilization */}
      <div className="card !p-4 bg-orange-50/50 border border-orange-200">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1 text-orange-800">
            <PieChart size={14} />
            Budget Utilization: {expensePercentage}%
          </span>
          <span className="text-gray-500">
            ₹{totalExpenses.toLocaleString('en-IN')} used of ₹{totalCollected.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              expensePercentage > 90 ? 'bg-red-500' : expensePercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, expensePercentage)}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Add Expense Input Form */}
        <div className="lg:col-span-2">
          <div className="card border-2 border-orange-100 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Add Expenditure Item</h3>
                <p className="text-xs text-gray-400">Add an expense to calculate remaining funds</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Expense Item / Category
                </label>
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="e.g. Flower Decoration, Sound System, Fruits"
                  className="input-field text-sm !py-2.5"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Estimated Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="input-field text-sm !py-2.5 !pl-8"
                  />
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              <div>
                <p className="text-[11px] text-gray-400 font-semibold mb-1.5">Quick Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Flower Decoration', 'Tent & Chairs', 'Snacks / Laddu', 'DJ & Dhol', 'Crackers'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setNewExpenseName(suggestion)}
                      className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md border border-orange-200 transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 !py-2.5 !text-sm font-bold mt-2"
              >
                <Calculator size={16} />
                <span>Deduct from Total</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Deductions Table & Live Calculation Sheet */}
        <div className="lg:col-span-3">
          <div className="card !p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-orange-50/60 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-orange-600" />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Expense Deductions Breakdown ({localExpenses.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                Calculation Sheet
              </span>
            </div>

            {localExpenses.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <Receipt size={36} className="mx-auto opacity-30" />
                <p className="text-sm">No expenses listed yet.</p>
                <p className="text-xs text-gray-400">Add festival expense items on the left to calculate deductions.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {localExpenses.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-orange-50/20 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {totalCollected > 0
                            ? `${((item.amount / totalCollected) * 100).toFixed(1)}% of total collections`
                            : 'Expense item'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-600 text-sm">
                        - ₹{Number(item.amount).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Calculation Summary Footer */}
                <div className="p-4 bg-orange-50/70 space-y-2 font-medium text-xs sm:text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Total Collections:</span>
                    <span className="font-bold text-gray-800">
                      ₹{totalCollected.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Less: Total Estimated Expenses:</span>
                    <span className="font-bold">
                      - ₹{totalExpenses.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-orange-200 flex justify-between text-sm sm:text-base font-bold">
                    <span className={balanceRemaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {balanceRemaining >= 0 ? 'Net Surplus Balance:' : 'Deficit Shortage:'}
                    </span>
                    <span className={balanceRemaining >= 0 ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                      ₹{balanceRemaining.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
