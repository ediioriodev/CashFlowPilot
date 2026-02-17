"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScopeToggle from "@/components/ui/ScopeToggle";
import { expenseService } from "@/services/expenseService";
import { userService, UserSettings } from "@/services/userService";
import { useScope } from "@/context/ScopeContext";
import { Spesa } from "@/types/expenses";
import { formatCurrency, formatDate, getCurrentMonthRange, formatDateForAPI, getCustomPeriodRange } from "@/lib/formatUtils";
import { ArrowLeft, Clock, Pencil, Trash, Check, AlertCircle, Eye, Search, X } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { toast } from "sonner";

type FilterMode = 'confirmed_only' | 'confirmed_plus_today' | 'all';

import { useTheme } from "@/context/ThemeContext";

// ... existing imports ...

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
          
            setRange(getCustomPeriodRange(targetYear, targetMonth, s.custom_period_start_day, true));
      }
    });
  }, []);

  const [filterMode, setFilterMode] = useState<FilterMode>('confirmed_only');
  const [searchText, setSearchText] = useState("");
  
  useEffect(() => {
    if (isInitialized) {
      loadExpenses();
    }
  }, [range, scope, isInitialized]);
  
  const loadExpenses = async () => {
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM
    if (!val) return;
    const [yearStr, monthStr] = val.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-based

    if (userSettings?.custom_period_active) {
        setRange(getCustomPeriodRange(year, month, userSettings.custom_period_start_day, true));
    } else {
        const lastDay = new Date(year, month + 1, 0).getDate();
        setRange({
            start: `${val}-01`,
            end: `${val}-${lastDay}`
        });
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

  const filteredExpenses = expenses.filter(e => {
    // 1. Filter by Search Text
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      const match = 
        e.negozio.toLowerCase().includes(lowerSearch) ||
        e.ambito.toLowerCase().includes(lowerSearch) ||
        (e.note_spese && e.note_spese.toLowerCase().includes(lowerSearch)) ||
        e.importo.toString().includes(lowerSearch);
      
      if (!match) return false;
    }

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
           <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-20 z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <input 
                    type="month" 
                    value={range.start.substring(0, 7)}
                    onChange={handleMonthChange}
                    className="font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                />
                <span className={clsx("font-bold text-xl", totalImporto >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(totalImporto)}
                </span>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Cerca negozio, ambito, note..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 dark:text-gray-100"
                />
                {searchText && (
                    <button 
                        onClick={() => setSearchText("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
              </div>

              <div className="flex items-center justify-end">
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
