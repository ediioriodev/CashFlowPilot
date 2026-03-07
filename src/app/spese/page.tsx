"use client";

import { useEffect, useState, useMemo } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScopeToggle from "@/components/ui/ScopeToggle";
import { expenseService } from "@/services/expenseService";
import { userService, UserSettings } from "@/services/userService";
import { useScope } from "@/context/ScopeContext";
import { Spesa } from "@/types/expenses";
import { formatCurrency, formatDate, getCurrentMonthRange, getCustomPeriodRange } from "@/lib/formatUtils";
import { Clock, Pencil, Trash, Check, AlertCircle, Eye, X, Filter, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { toast } from "sonner";

type FilterMode = 'confirmed_only' | 'confirmed_plus_today' | 'all';

import { useTheme } from "@/context/ThemeContext";

const EMPTY_LABEL = "(—)";
const toLabel = (val: string | undefined | null): string =>
  val && val.trim() ? val : EMPTY_LABEL;

export default function SpesePage() {
  const { scope, isInitialized } = useScope();
  const { isDarkMode } = useTheme(); 

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Spesa[]>([]);
  
  // Modals state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editExpense, setEditExpense] = useState<Spesa | null>(null);

  // Filters
  const [range, setRange] = useState(getCurrentMonthRange());
  const [pendingRange, setPendingRange] = useState(getCurrentMonthRange());
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    userService.getSettings().then((s) => {
      setUserSettings(s);
      
      // Update range with custom period if active
      if (s.custom_period_active) {
            const today = new Date();
            let targetMonth = today.getMonth();
            let targetYear = today.getFullYear();
          
            if (today.getDate() >= s.custom_period_start_day) {
                targetMonth++;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear++;
                }
            }
          
            const r = getCustomPeriodRange(targetYear, targetMonth, s.custom_period_start_day, true);
            setRange(r);
            setPendingRange(r);
      }
    });
  }, []);

  const [filterMode, setFilterMode] = useState<FilterMode>('confirmed_only');
  const [filterNegozio, setFilterNegozio] = useState<string[]>([]);
  const [filterAmbito, setFilterAmbito] = useState<string[]>([]);
  const [filterTipo, setFilterTipo] = useState<string[]>([]);
  const [filterNote, setFilterNote] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      loadExpenses();
    }
  }, [range, scope, isInitialized]);
  
  const loadExpenses = async () => {
    if (range.start > range.end) return;
    setLoading(true);
    try {
      const data = await expenseService.getExpenses(range.start, range.end, scope);
      setExpenses(data);
    } catch (error) {
      console.error(error);
      toast.error("Errore nel caricamento delle spese");
    } finally {
      setLoading(false);
    }
  };

  const shiftPeriod = (direction: 'prev' | 'next') => {
    if (userSettings?.custom_period_active && userSettings.custom_period_start_day > 1) {
      // range.start = createDateWithClamp(year, targetMonth - 1, startDay)
      // so targetMonth (0-indexed) = range.start month + 1
      const startDate = new Date(range.start + 'T00:00:00');
      let targetYear = startDate.getFullYear();
      let targetMonth = startDate.getMonth() + 1 + (direction === 'next' ? 1 : -1);
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; }
      if (targetMonth < 0)  { targetMonth += 12; targetYear--; }
      const r = getCustomPeriodRange(targetYear, targetMonth, userSettings.custom_period_start_day, true);
      setRange(r); setPendingRange(r);
    } else {
      const startDate = new Date(range.start + 'T00:00:00');
      let y = startDate.getFullYear();
      let m = startDate.getMonth() + (direction === 'next' ? 1 : -1);
      if (m > 11) { m = 0; y++; }
      if (m < 0)  { m = 11; y--; }
      const lastDay = new Date(y, m + 1, 0).getDate();
      const mm = String(m + 1).padStart(2, '0');
      const r = { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
      setRange(r); setPendingRange(r);
    }
  };

  const resetToCurrentPeriod = () => {
    if (userSettings?.custom_period_active) {
      const today = new Date();
      let targetMonth = today.getMonth();
      let targetYear = today.getFullYear();
      if (today.getDate() >= userSettings.custom_period_start_day) {
        targetMonth++;
        if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      }
      const r = getCustomPeriodRange(targetYear, targetMonth, userSettings.custom_period_start_day, true);
      setRange(r);
      setPendingRange(r);
    } else {
      const r = getCurrentMonthRange();
      setRange(r);
      setPendingRange(r);
    }
  };

  const handleDelete = async () => {
      if (!deleteId) return;
      try {
          await expenseService.deleteExpense(deleteId, scope);
          toast.success("Spesa eliminata");
          setExpenses(expenses.filter(e => e.id !== deleteId));
          setDeleteId(null);
      } catch (e) {
          console.error(e);
          toast.error("Errore durante l'eliminazione");
      }
  };

  const handleConfirm = async () => {
    if (!confirmId) return;
    try {
        await expenseService.confirmExpense(confirmId, scope);
        toast.success("Spesa confermata");
        setExpenses(expenses.map(e => e.id === confirmId ? { ...e, confermata: true } : e));
        setConfirmId(null);
    } catch (e) {
        console.error(e);
        toast.error("Errore durante la conferma");
    }
  };

  const negozioOptions = useMemo(() => {
    const vals = Array.from(new Set(expenses.map(e => toLabel(e.negozio)))).sort();
    return vals.includes(EMPTY_LABEL) ? [EMPTY_LABEL, ...vals.filter(v => v !== EMPTY_LABEL)] : vals;
  }, [expenses]);

  const ambitoOptions = useMemo(() => {
    const vals = Array.from(new Set(expenses.map(e => toLabel(e.ambito)))).sort();
    return vals.includes(EMPTY_LABEL) ? [EMPTY_LABEL, ...vals.filter(v => v !== EMPTY_LABEL)] : vals;
  }, [expenses]);

  const tipoOptions = useMemo(() =>
    Array.from(new Set(expenses.map(e => e.tipo_transazione))).sort()
  , [expenses]);

  const noteOptions = useMemo(() => {
    const vals = Array.from(new Set(expenses.map(e => toLabel(e.note_spese)))).sort();
    return vals.includes(EMPTY_LABEL) ? [EMPTY_LABEL, ...vals.filter(v => v !== EMPTY_LABEL)] : vals;
  }, [expenses]);

  const activeFilterCount = filterNegozio.length + filterAmbito.length + filterTipo.length + filterNote.length;
  const rangeIsDirty = pendingRange.start !== range.start || pendingRange.end !== range.end;

  const filteredExpenses = expenses.filter(e => {
    // 1. MultiSelect filters (AND between fields, OR within each field)
    if (filterNegozio.length > 0 && !filterNegozio.includes(toLabel(e.negozio))) return false;
    if (filterAmbito.length > 0 && !filterAmbito.includes(toLabel(e.ambito))) return false;
    if (filterTipo.length > 0 && !filterTipo.includes(e.tipo_transazione)) return false;
    if (filterNote.length > 0 && !filterNote.includes(toLabel(e.note_spese))) return false;

    // 2. Filter by status (Confirmed/All/Today)
    if (e.confermata) return true; // Always show confirmed

    const today = new Date().toISOString().split('T')[0];
    
    if (filterMode === 'confirmed_only') return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'confirmed_plus_today') {
        return e.data_spesa <= today;
    }
    return false;
  });

  const totalImporto = filteredExpenses.reduce((acc, curr) => {
    const isEntrata = curr.tipo_transazione === 'entrata';
    return acc + (isEntrata ? Number(curr.importo) : -Number(curr.importo));
  }, 0);

  return (
    <ProtectedRoute>
      <div className={clsx("min-h-screen pb-20 transition-colors duration-300", scope === 'P' ? "bg-gray-50/90 dark:bg-gray-950/90" : "bg-gray-50 dark:bg-gray-950")}>
        {/* Header removed - using global Header */}

        <main className="p-4 max-w-2xl mx-auto space-y-4">
           {/* Total Card & Filters */}
           <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-20 z-10 flex flex-col gap-3 p-3">

              {/* Row 1: Period navigation + date range + apply/reset */}
              <div className="flex items-center gap-1.5">
                {/* Prev / Next arrows */}
                <button
                  onClick={() => shiftPeriod('prev')}
                  title="Periodo precedente"
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Date inputs */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="date"
                    value={pendingRange.start}
                    onChange={(e) => setPendingRange({ ...pendingRange, start: e.target.value })}
                    className="text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full min-w-0"
                  />
                  <span className="text-gray-400 text-xs shrink-0">—</span>
                  <input
                    type="date"
                    value={pendingRange.end}
                    onChange={(e) => setPendingRange({ ...pendingRange, end: e.target.value })}
                    className="text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full min-w-0"
                  />
                </div>

                <button
                  onClick={() => shiftPeriod('next')}
                  title="Periodo successivo"
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Apply / Reset */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={resetToCurrentPeriod}
                    title="Ripristina periodo corrente"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (rangeIsDirty) setRange(pendingRange); }}
                    title="Applica intervallo personalizzato"
                    disabled={!rangeIsDirty}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors",
                      rangeIsDirty
                        ? "text-white bg-blue-600 hover:bg-blue-700"
                        : "text-gray-300 dark:text-gray-600 cursor-default"
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 1b: Total */}
              <div className="flex justify-end">
                <span className={clsx("font-bold text-xl", totalImporto >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(totalImporto)}
                </span>
              </div>

              {/* Row 2: Filter toggle + status filter */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={clsx(
                    "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    showFilters || activeFilterCount > 0
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtri</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
                  <Eye className="w-4 h-4 ml-2" />
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                    className="bg-transparent border-none text-xs sm:text-sm focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-300 py-1 outline-none"
                  >
                    <option value="confirmed_only">Solo Confermate</option>
                    <option value="confirmed_plus_today">Fino ad oggi</option>
                    <option value="all">Tutte (Previsione)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Filter panel (expandable) */}
              {showFilters && (
                <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setFilterNegozio([]); setFilterAmbito([]); setFilterTipo([]); setFilterNote([]); }}
                      className="self-end flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Azzera filtri
                    </button>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Negozio</label>
                    <MultiSelect options={negozioOptions} selected={filterNegozio} onChange={setFilterNegozio} placeholder="Tutti i negozi" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ambito</label>
                    <MultiSelect options={ambitoOptions} selected={filterAmbito} onChange={setFilterAmbito} placeholder="Tutti gli ambiti" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo transazione</label>
                    <MultiSelect options={tipoOptions} selected={filterTipo} onChange={setFilterTipo} placeholder="Tutti i tipi" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Note</label>
                    <MultiSelect options={noteOptions} selected={filterNote} onChange={setFilterNote} placeholder="Tutte le note" />
                  </div>
                </div>
              )}
           </div>

           {/* List */}
           {loading ? (
             <div className="text-center py-10 text-gray-400">Caricamento...</div>
           ) : filteredExpenses.length === 0 ? (
             <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
                 <p>Nessuna transazione trovata con questi filtri.</p>
                 {expenses.length === 0 && (
                     <Link href="/spese/nuova" className="text-blue-600 hover:underline">Aggiungine una</Link>
                 )}
             </div>
           ) : (
             filteredExpenses.map((expense) => {
               // Check if it is a recurring expense (either parent or child)
               const isRecurring = expense.ricorrente || expense.is_recurring_parent;
               const needsConfirmation = !expense.confermata;

               return (
               <div key={expense.id} className={clsx(
                   "bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-shadow relative overflow-hidden",
                   needsConfirmation ? "border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10" : "border-gray-100 dark:border-gray-800"
               )}>
                    {needsConfirmation && (
                        <div className="absolute top-0 right-0 p-1 bg-orange-100 dark:bg-orange-900/30 rounded-bl-lg">
                            <AlertCircle className="w-3 h-3 text-orange-500" />
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">{expense.negozio}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{expense.ambito} • {formatDate(expense.data_spesa)}</span>
                            {expense.note_spese && <span className="text-xs text-gray-400 italic mt-1">{expense.note_spese}</span>}
                        </div>
                        <div className="flex flex-col items-end">
                             <span className={clsx(
                                 "font-bold text-lg",
                                 expense.tipo_transazione === 'entrata' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                             )}>
                                 {expense.tipo_transazione === 'entrata' ? '+' : '-'} {formatCurrency(expense.importo)}
                             </span>
                             {isRecurring && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" />
                                    <span>Ricorrente</span>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 border-dashed">
                        {needsConfirmation && (
                             <button 
                                onClick={() => setConfirmId(expense.id!)}
                                className="flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                             >
                                <Check className="w-3 h-3" /> Conferma
                             </button>
                        )}
                        
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setEditExpense(expense)}
                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                                title="Modifica"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setDeleteId(expense.id!)}
                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                title="Elimina"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
               </div>
             )})
           )}
        </main>

        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Elimina Transazione"
          message="Sei sicuro di voler eliminare questa transazione? L'operazione non può essere annullata."
          confirmText="Elimina"
          isDestructive
        />

        <ConfirmModal
          isOpen={!!confirmId}
          onClose={() => setConfirmId(null)}
          onConfirm={handleConfirm}
          title="Conferma Transazione"
          message="Confermi che questa spesa ricorrente è stata effettuata?"
          confirmText="Conferma"
        />

        {editExpense && (
            <EditExpenseModal 
                isOpen={!!editExpense}
                onClose={() => setEditExpense(null)}
                onSuccess={loadExpenses}
                expense={editExpense}
                scope={scope}
            />
        )}
      </div>
    </ProtectedRoute>
  );
}
