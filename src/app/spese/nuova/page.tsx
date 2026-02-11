"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScopeToggle from "@/components/ui/ScopeToggle";
import { expenseService } from "@/services/expenseService";
import { useScope } from "@/context/ScopeContext";
import type { Ambito, RecurringConfig } from "@/types/expenses";
import { ArrowLeft, Calendar, Loader2, Repeat } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { toast } from "sonner";

export default function NuovaTransazionePage() {
  const router = useRouter();
  const { scope, isInitialized } = useScope();
  
  const [loading, setLoading] = useState(false);
  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negoziSuggestions, setNegoziSuggestions] = useState<string[]>([]);
  
  // Base Fields
  const [tipoTransazione, setTipoTransazione] = useState<'spesa' | 'entrata'>('spesa');
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [note, setNote] = useState("");
  const [dataSpesa, setDataSpesa] = useState(new Date().toISOString().split('T')[0]);

  // Recurring Fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [ricorrenza, setRicorrenza] = useState<RecurringConfig['ricorrenza']>('mensile');
  const [dataFine, setDataFine] = useState("");
  const [tipoConferma, setTipoConferma] = useState<'A' | 'M'>('M');
  const [giorniSettimana, setGiorniSettimana] = useState<number[]>([]);

  useEffect(() => {
    if (!isInitialized) return;

    const loadData = async () => {
      const [ambitiData, negoziData] = await Promise.all([
        expenseService.getAmbiti(scope),
        expenseService.getNegozi(scope)
      ]);
      setAmbiti(ambitiData);
      setNegoziSuggestions(negoziData);
    };
    loadData();
  }, [scope, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importo || !ambito) return;

    setLoading(true);
    try {
      const recurringConfig : RecurringConfig | undefined = isRecurring ? {
        ricorrenza,
        data_inizio: dataSpesa,
        data_fine: dataFine || null,
        tipo_conferma: tipoConferma,
        giorni_settimana: ricorrenza === 'settimanale' ? giorniSettimana : undefined,
      } : undefined;

      await expenseService.createExpense({
        importo: parseFloat(importo.replace(',', '.')),
        ambito,
        negozio,
        note_spese: note,
        data_spesa: dataSpesa,
        tipo_transazione: tipoTransazione,
        tipo_spesa: scope, 
        ricorrente: isRecurring,
        confermata: true,
        is_recurring_parent: isRecurring, // Logic: if creating recurring, mark as parent
        recurring_config: recurringConfig
      });
      
      // Reset fields
      setImporto("");
      setAmbito("");
      setNegozio("");
      setNote("");
      setDataSpesa(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRicorrenza('mensile');
      setDataFine("");
      setTipoConferma('M');
      setGiorniSettimana([]);
      
      toast.success("Transazione salvata con successo!");
    } catch (error) {
      console.error(error);
      toast.error('Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className={clsx("min-h-screen pb-20 transition-colors duration-300", scope === 'P' ? "bg-gray-50/90" : "bg-gray-50")}>
        {/* Header removed - using global Header */}

        <main className="p-4 max-w-lg mx-auto">
          
          <h2 className={clsx("text-lg font-bold mb-4 flex items-center gap-2", scope === 'P' ? "text-indigo-800" : "text-gray-800")}>
             Nuova Transazione ({scope === 'P' ? 'Personale' : 'Condivisa'})
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
             {/* Toggle Tipo */}
             <div className="flex bg-gray-200 p-1 rounded-lg">
                <button type="button" onClick={() => setTipoTransazione('spesa')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'spesa' ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Uscita</button>
                <button type="button" onClick={() => setTipoTransazione('entrata')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'entrata' ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Entrata</button>
             </div>

            {/* Importo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Importo (€)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                placeholder="0.00"
                className={clsx(
                    "w-full px-4 py-3 text-2xl font-bold text-gray-800 border-2 rounded-xl focus:outline-none bg-white",
                    scope === 'P' ? "border-indigo-100 focus:border-indigo-500" : "border-gray-200 focus:border-blue-500"
                )}
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
                  className={clsx(
                    "w-full px-4 py-3 border rounded-xl focus:outline-none bg-white",
                    scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700"
                  )}
                />
                <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Ambito */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Ambito</label>
               <input 
                 type="text"
                 list="ambiti-list-new"
                 required 
                 value={ambito} 
                 onChange={(e) => setAmbito(e.target.value)} 
                 className={clsx("w-full px-4 py-3 border rounded-xl focus:outline-none bg-white", scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700")}
                 placeholder="Seleziona o scrivi nuovo..."
               />
               <datalist id="ambiti-list-new">
                 {ambiti.map(a => <option key={a.code} value={a.name} />)}
               </datalist>
            </div>

            {/* Negozio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negozio / Beneficiario</label>
              <input type="text" list="negozi-list" value={negozio} onChange={(e) => setNegozio(e.target.value)} className={clsx("w-full px-4 py-3 border rounded-xl focus:outline-none bg-white", scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700")} />
              <datalist id="negozi-list">{negoziSuggestions.map((n, i) => <option key={i} value={n} />)}</datalist>
            </div>

            {/* Note */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
               <textarea value={note} onChange={(e) => setNote(e.target.value)} className={clsx("w-full px-4 py-3 border rounded-xl focus:outline-none bg-white", scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700")} rows={2} />
            </div>

            {/* Recurring Toggle */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <Repeat className="w-5 h-5 text-orange-600" />
                       <span className="font-semibold text-gray-700">Ricorrente</span>
                   </div>
                   <ToggleSwitch checked={isRecurring} onChange={setIsRecurring} />
               </div>

               {isRecurring && (
                   <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                       <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ">Frequenza</label>
                            <select value={ricorrenza} onChange={(e) => setRicorrenza(e.target.value as any)} className={clsx("w-full px-3 py-2 border rounded-lg focus:outline-none", scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700")}>
                                <option value="giornaliera">Ogni Giorno</option>
                                <option value="settimanale">Ogni Settimana</option>
                                <option value="mensile">Ogni Mese</option>
                                <option value="bimestrale">Ogni 2 Mesi</option>
                                <option value="trimestrale">Ogni 3 Mesi</option>
                                <option value="semestrale">Ogni 6 Mesi</option>
                                <option value="annuale">Ogni Anno</option>
                            </select>
                        </div>
                        
                        {ricorrenza === 'settimanale' && (
                           <div>
                               <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Giorni della Settimana</label>
                               <div className="flex flex-wrap gap-2">
                                  {['L','M','M','G','V','S','D'].map((day, idx) => {
                                      // 1 = Monday, 7 = Sunday
                                      const dayValue = idx + 1; 
                                      const isSelected = giorniSettimana.includes(dayValue);
                                      return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                if(isSelected) setGiorniSettimana(giorniSettimana.filter(d => d !== dayValue));
                                                else setGiorniSettimana([...giorniSettimana, dayValue].sort());
                                            }}
                                            className={clsx(
                                                "w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center transition-colors",
                                                isSelected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            )}
                                          >
                                              {day}
                                          </button>
                                      );
                                  })}
                               </div>
                               <p className="text-xs text-gray-400 mt-1">Seleziona i giorni (es. Lun-Ven). Se vuoto, usa la data di inizio.</p>
                           </div>
                        )}

                        <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fine (Opzionale)</label>
                             <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} className={clsx("w-full px-3 py-2 border rounded-lg focus:outline-none", scope === 'P' ? "border-indigo-100 focus:border-indigo-500 text-gray-700" : "border-gray-200 focus:border-blue-500 text-gray-700")} />
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conferma Generazione</label>
                             <div className="flex gap-4">
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="radio" checked={tipoConferma === 'M'} onChange={() => setTipoConferma('M')} className="w-4 h-4 text-blue-600" />
                                     <span className={clsx("text-sm", scope === 'P' ? "text-gray-700" : "text-gray-500")}>Manuale</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="radio" checked={tipoConferma === 'A'} onChange={() => setTipoConferma('A')} className="w-4 h-4 text-blue-600" />
                                     <span className={clsx("text-sm", scope === 'P' ? "text-gray-700" : "text-gray-500")}>Automatica</span>
                                 </label>
                             </div>
                        </div>
                   </div>
               )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full py-4 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center mt-6",
                loading ? "opacity-70 bg-gray-400" : (
                    isRecurring 
                        ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                        : tipoTransazione === 'spesa' 
                            ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                            : "bg-green-600 hover:bg-green-700 shadow-green-200"
                )
              )}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : isRecurring ? "Salva Ricorrenza" : "Salva Transazione"}
            </button>

          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <button 
            type="button"
            onClick={() => onChange(!checked)}
            className={clsx(
                "w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none",
                checked ? "bg-green-500" : "bg-gray-300"
            )}
        >
            <div 
                className={clsx(
                    "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200 ease-in-out shadow-sm",
                    checked ? "left-7" : "left-1"
                )}
            />
        </button>
    );
}
