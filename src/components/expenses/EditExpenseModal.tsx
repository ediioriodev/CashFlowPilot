
"use client";

import { useEffect, useState } from "react";
import { expenseService } from "@/services/expenseService";
import type { Ambito, Spesa } from "@/types/expenses";
import { Calendar, Loader2, Save, X } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: Spesa;
  scope: 'C' | 'P';
}

export default function EditExpenseModal({ isOpen, onClose, onSuccess, expense, scope }: EditExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negoziSuggestions, setNegoziSuggestions] = useState<string[]>([]);
  
  // Fields
  const [tipoTransazione, setTipoTransazione] = useState<'spesa' | 'entrata'>('spesa');
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [note, setNote] = useState("");
  const [dataSpesa, setDataSpesa] = useState("");

  const [updateFuture, setUpdateFuture] = useState(false);

  useEffect(() => {
    if (isOpen) {
       // Load data
       const loadData = async () => {
         const [ambitiData, negoziData] = await Promise.all([
           expenseService.getAmbiti(scope),
           expenseService.getNegozi(scope)
         ]);
         setAmbiti(ambitiData);
         setNegoziSuggestions(negoziData);
       };
       loadData();

       // Set initial values
       setTipoTransazione(expense.tipo_transazione);
       setImporto(expense.importo.toString());
       setAmbito(expense.ambito);
       setNegozio(expense.negozio);
       setNote(expense.note_spese || "");
       setDataSpesa(expense.data_spesa.split('T')[0]);
       setUpdateFuture(false);
    }
  }, [isOpen, expense, scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importo || !ambito) return;

    setLoading(true);
    try {
      if (!expense.id) throw new Error("ID mancante");

      await expenseService.updateExpense(
          expense.id,
          {
            importo: parseFloat(importo.replace(',', '.')),
            ambito,
            negozio,
            note_spese: note,
            data_spesa: dataSpesa,
            tipo_transazione: tipoTransazione,
            confermata: expense.confermata // Preserve confirmation status unless logic says otherwise
          },
          scope,
          updateFuture
      );
      
      toast.success("Transazione aggiornata!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Errore nell\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isRecurringChild = expense.recurring_parent_id || expense.is_recurring_parent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
         
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Modifica Transazione</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X className="w-5 h-5" />
            </button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
             {/* Toggle Tipo */}
             <div className="flex bg-gray-200 p-1 rounded-lg">
                <button type="button" onClick={() => setTipoTransazione('spesa')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'spesa' ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Uscita</button>
                <button type="button" onClick={() => setTipoTransazione('entrata')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'entrata' ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Entrata</button>
             </div>

            {/* Importo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                className="w-full px-4 py-3 text-2xl font-bold text-gray-800 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dataSpesa}
                  onChange={(e) => setDataSpesa(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-800"
                />
                <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Ambito */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Ambito</label>
               <input 
                  type="text" 
                  list="ambiti-list-edit"
                  required 
                  value={ambito} 
                  onChange={(e) => setAmbito(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-800"
                  placeholder="Seleziona o scrivi nuovo..."
               />
               <datalist id="ambiti-list-edit">
                 {ambiti.map(a => <option key={a.code} value={a.name} />)}
               </datalist>
            </div>

            {/* Negozio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negozio / Beneficiario</label>
              <input type="text" list="negozi-list-edit" value={negozio} onChange={(e) => setNegozio(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-800" />
              <datalist id="negozi-list-edit">{negoziSuggestions.map((n, i) => <option key={i} value={n} />)}</datalist>
            </div>

            {/* Note */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
               <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-800" rows={2} />
            </div>

            {/* Recurring Update Option */}
            {isRecurringChild && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="mt-1 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            checked={updateFuture}
                            onChange={(e) => setUpdateFuture(e.target.checked)}
                        />
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800 text-sm">Aggiorna anche le occorrenze future</span>
                            <span className="text-xs text-gray-500">Seleziona per applicare le modifiche a tutte le transazioni ricorrenti successive a questa data.</span>
                        </div>
                    </label>
                </div>
            )}

            <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                    Annulla
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salva</>}
                </button>
            </div>

         </form>
      </div>
    </div>
  );
}
