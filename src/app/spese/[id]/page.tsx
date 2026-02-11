"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { expenseService } from "@/services/expenseService";
import { Ambito, Spesa } from "@/types/expenses";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ModificaSpesaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negoziSuggestions, setNegoziSuggestions] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // State for form
  const [originalExpense, setOriginalExpense] = useState<Spesa | null>(null);
  const [tipoTransazione, setTipoTransazione] = useState<'spesa' | 'entrata'>('spesa');
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [note, setNote] = useState("");
  const [dataSpesa, setDataSpesa] = useState("");
  
  // Unwrap params using use() hook as per Next.js 15+
  const resolvedParams = use(params);
  const expenseId = parseInt(resolvedParams.id);

  useEffect(() => {
    const init = async () => {
      try {
        const [exp, ambitiData, negoziData] = await Promise.all([
          expenseService.getExpenseById(expenseId),
          expenseService.getAmbiti(),
          expenseService.getNegozi()
        ]);
        
        if (!exp) {
          toast.error("Spesa non trovata");
          router.push('/spese');
          return;
        }

        setOriginalExpense(exp);
        setAmbiti(ambitiData);
        setNegoziSuggestions(negoziData);
        
        // Fill form
        setTipoTransazione(exp.tipo_transazione || 'spesa');
        setImporto(exp.importo.toString());
        setAmbito(exp.ambito);
        setNegozio(exp.negozio);
        setNote(exp.note_spese || "");
        setDataSpesa(exp.data_spesa.split('T')[0]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [expenseId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importo || !ambito || !negozio) return;

    setSaving(true);
    try {
      await expenseService.updateExpense(expenseId, {
        importo: parseFloat(importo.replace(',', '.')),
        ambito,
        negozio,
        note_spese: note,
        data_spesa: dataSpesa,
        tipo_transazione: tipoTransazione,
      });
      toast.success("Spesa aggiornata");
      router.push('/spese');
    } catch (error) {
      console.error(error);
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await expenseService.deleteExpense(expenseId);
      toast.success("Transazione eliminata");
      router.push('/spese');
    } catch (error) {
      console.error(error);
      toast.error('Errore durante l\'eliminazione');
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-10">Caricamento...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20">
        <ConfirmModal 
            isOpen={showDeleteModal} 
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
            title="Elimina Transazione"
            message="Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata."
            confirmText="Elimina"
            isDestructive={true}
        />
        <main className="p-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-xl text-gray-800">Modifica Transazione</h1>
            <button 
                type="button" 
                onClick={handleDelete}
                disabled={saving}
                className="text-red-500 p-2 hover:bg-red-50 rounded-full"
                title="Elimina"
            >
                <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Toggle Spesa / Entrata (Editable) */}
          <div className="flex bg-gray-200 p-1 rounded-lg mb-6">
            <button onClick={() => setTipoTransazione('spesa')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'spesa' ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Spesa</button>
            <button onClick={() => setTipoTransazione('entrata')} className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", tipoTransazione === 'entrata' ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800")}>Entrata</button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input type="number" step="0.01" required value={importo} onChange={(e) => setImporto(e.target.value)} className="w-full px-4 py-3 text-2xl font-bold text-gray-800 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" required value={dataSpesa} onChange={(e) => setDataSpesa(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-700" />
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Ambito</label>
               <select required value={ambito} onChange={(e) => setAmbito(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-700">
                 <option value="">Seleziona...</option>
                 {ambiti.map(a => <option key={a.code} value={a.name}>{a.name}</option>)}
               </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negozio</label>
              <input type="text" required list="negozi-list" value={negozio} onChange={(e) => setNegozio(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-700" />
              <datalist id="negozi-list">{negoziSuggestions.map((n, i) => <option key={i} value={n} />)}</datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-700" rows={3}/>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={clsx(
                "w-full py-4 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center mt-6",
                saving ? "opacity-70 bg-gray-400" : (tipoTransazione === 'spesa' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")
              )}
            >
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Aggiorna Transazione"}
            </button>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
