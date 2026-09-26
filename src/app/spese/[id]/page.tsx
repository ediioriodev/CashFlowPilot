"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Button, Card, Field, IconButton, SegTabs, Skeleton, inputClass } from "@/components/ui/kit";
import { expenseService } from "@/services/expenseService";
import { useScope } from "@/context/ScopeContext";
import { formatCurrency } from "@/lib/formatUtils";
import type { Ambito } from "@/types/expenses";

function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function ModificaSpesaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { scope } = useScope();
  const expenseId = parseInt(use(params).id, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negozi, setNegozi] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);

  const [tipo, setTipo] = useState<"spesa" | "entrata">("spesa");
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [nota, setNota] = useState("");
  const [data, setData] = useState("");
  const [errors, setErrors] = useState<{ importo?: string; ambito?: string }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [exp, a, n] = await Promise.all([
          expenseService.getExpenseById(expenseId, scope),
          expenseService.getAmbiti(scope),
          expenseService.getNegozi(scope),
        ]);
        if (!alive) return;
        if (!exp) {
          toast.error("Movimento non trovato");
          router.replace("/spese");
          return;
        }
        setAmbiti(a);
        setNegozi(n);
        setTipo(exp.tipo_transazione || "spesa");
        setImporto(String(exp.importo).replace(".", ","));
        setAmbito(exp.ambito ?? "");
        setNegozio(exp.negozio ?? "");
        setNota(exp.note_spese ?? "");
        setData((exp.data_spesa ?? "").split("T")[0]);
      } catch (e) {
        console.error(e);
        toast.error("Caricamento non riuscito");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [expenseId, router, scope]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (parseAmount(importo) === null) found.importo = "Inserisci un importo maggiore di zero.";
    if (!ambito.trim()) found.ambito = "La categoria è obbligatoria.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await expenseService.updateExpense(
        expenseId,
        {
          importo: parseAmount(importo)!,
          ambito: ambito.trim(),
          negozio: negozio.trim(),
          note_spese: nota.trim(),
          data_spesa: data,
          tipo_transazione: tipo,
        },
        scope
      );
      toast.success("Movimento aggiornato", {
        description: `${tipo === "spesa" ? "−" : "+"}${formatCurrency(parseAmount(importo)!)}`,
      });
      router.push("/spese");
    } catch (error) {
      console.error(error);
      toast.error("Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await expenseService.deleteExpense(expenseId, scope);
    toast.success("Movimento eliminato");
    router.push("/spese");
  };

  return (
    <ProtectedRoute>
      <PageHeader
        title="Modifica movimento"
        backHref="/spese"
        actions={
          <IconButton
            label="Elimina il movimento"
            icon={Trash2}
            onClick={() => setAskDelete(true)}
            className="hover:text-neg"
          />
        }
      />

      <div className="page px-4 py-4 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {loading ? (
            <>
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-28 w-full rounded-card" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <SegTabs
                ariaLabel="Tipo di movimento"
                value={tipo}
                onChange={setTipo}
                options={[
                  { value: "spesa", label: "Uscita", tone: "neg" },
                  { value: "entrata", label: "Entrata", tone: "pos" },
                ]}
              />

              <Card className="px-5 py-6 text-center">
                <label htmlFor="importo" className="text-[11px] font-bold uppercase tracking-[0.07em] text-faint">
                  Importo
                </label>
                <div className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-semibold text-faint" aria-hidden>€</span>
                  <input
                    id="importo"
                    type="text"
                    inputMode="decimal"
                    value={importo}
                    onChange={(e) => setImporto(e.target.value)}
                    aria-invalid={!!errors.importo}
                    className="tnum w-full max-w-[240px] bg-transparent text-center text-[40px] font-extrabold tracking-tight outline-none"
                    style={{ color: tipo === "spesa" ? "var(--neg)" : "var(--pos)" }}
                  />
                </div>
                {errors.importo && (
                  <p role="alert" className="mt-2 text-xs font-medium text-neg">{errors.importo}</p>
                )}
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data" htmlFor="data">
                  <div className="relative">
                    <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
                    <Calendar className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                  </div>
                </Field>

                <Field label="Categoria" required htmlFor="ambito" error={errors.ambito}>
                  <input id="ambito" list="ambiti" value={ambito} onChange={(e) => setAmbito(e.target.value)} className={inputClass} />
                  <datalist id="ambiti">
                    {ambiti.map((a) => (
                      <option key={a.code} value={a.name} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field label="Dove" htmlFor="negozio">
                <div className="relative">
                  <input
                    id="negozio"
                    list="negozi"
                    value={negozio}
                    onChange={(e) => setNegozio(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                </div>
                <datalist id="negozi">
                  {negozi.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Field>

              <Field label="Nota" htmlFor="nota">
                <textarea
                  id="nota"
                  rows={3}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className={`${inputClass} min-h-24 py-3`}
                />
              </Field>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => router.push("/spese")} className="flex-1">
                  Annulla
                </Button>
                <Button type="submit" variant="primary" icon={Save} loading={saving} className="flex-1">
                  Salva
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={askDelete}
        onClose={() => setAskDelete(false)}
        onConfirm={remove}
        title="Eliminare questo movimento?"
        message="L'operazione non può essere annullata."
        confirmText="Elimina"
        isDestructive
      />
    </ProtectedRoute>
  );
}
