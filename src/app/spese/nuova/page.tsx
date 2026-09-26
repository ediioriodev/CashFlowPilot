"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Plus,
  Repeat,
  Search,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PayerPicker from "@/components/expenses/PayerPicker";
import SplitEditor from "@/components/expenses/SplitEditor";
import ReceiptPicker from "@/components/expenses/ReceiptPicker";
import PageHeader from "@/components/layout/PageHeader";
import {
  Button,
  Card,
  Chip,
  Field,
  SegTabs,
  Toggle,
  inputClass,
} from "@/components/ui/kit";
import { MiniBar } from "@/components/ui/charts";
import { useScope } from "@/context/ScopeContext";
import { usePeriod } from "@/context/PeriodContext";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { expenseService } from "@/services/expenseService";
import { budgetService, STATO_LABEL, STATO_TONE, type BudgetStatus } from "@/services/budgetService";
import { familyService, type Member, type Split } from "@/services/familyService";
import { receiptService } from "@/services/receiptService";
import { formatCurrency, formatDateForAPI } from "@/lib/formatUtils";
import type { Ambito, RecurringConfig } from "@/types/expenses";

type Tipo = "spesa" | "entrata";
type Errors = Partial<Record<"importo" | "ambito", string>>;

const CADENZE: { value: RecurringConfig["ricorrenza"]; label: string }[] = [
  { value: "giornaliera", label: "Ogni giorno" },
  { value: "settimanale", label: "Ogni settimana" },
  { value: "mensile", label: "Ogni mese" },
  { value: "bimestrale", label: "Ogni 2 mesi" },
  { value: "trimestrale", label: "Ogni 3 mesi" },
  { value: "semestrale", label: "Ogni 6 mesi" },
  { value: "annuale", label: "Ogni anno" },
];

const GIORNI = ["L", "M", "M", "G", "V", "S", "D"];
/** Riferimento stabile: una spesa nuova non ha quote da caricare. */
const VUOTE: Split[] = [];
const GIORNI_LUNGHI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

/** Accetta "12,50" e "12.50": con type=number la virgola non arrivava mai. */
function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function NuovaSpesaPage() {
  const router = useRouter();
  const { scope, isInitialized } = useScope();
  const { range } = usePeriod();
  const { user, profile } = useAuth();

  const [tipo, setTipo] = useState<Tipo>("spesa");
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [nota, setNota] = useState("");
  const [data, setData] = useState(formatDateForAPI(new Date()));
  const [payer, setPayer] = useState<string | null>(null);
  // elenco vuoto = parti uguali: non si scrive niente su expense_splits
  const [splits, setSplits] = useState<Split[]>([]);
  const [quoteValide, setQuoteValide] = useState(true);
  // L'avviso «non fanno 100» sparisce da solo appena le quote tornano giuste.
  useEffect(() => {
    if (quoteValide) toast.dismiss("quote-100");
  }, [quoteValide]);
  // lo scontrino si carica dopo: prima serve l'id della spesa
  const [scontrino, setScontrino] = useState<File | null>(null);

  const [ricorrente, setRicorrente] = useState(false);
  const [cadenza, setCadenza] = useState<RecurringConfig["ricorrenza"]>("mensile");
  const [dataFine, setDataFine] = useState("");
  const [autoConferma, setAutoConferma] = useState(false);
  const [giorniSettimana, setGiorniSettimana] = useState<number[]>([]);

  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negozi, setNegozi] = useState<string[]>([]);
  const [buste, setBuste] = useState<BudgetStatus[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const importoRef = useRef<HTMLInputElement>(null);
  const ambitoRef = useRef<HTMLInputElement>(null);

  // In Semplice i campi facoltativi stanno dietro un tocco (DIREZIONE-A §1,
  // regola 2): restano a vista se uno è già compilato, per non nascondere
  // quello che l'utente ha scritto.
  const { isSimple } = useMode();
  const [dettagliAperti, setDettagliAperti] = useState(false);
  const mostraDettagli =
    !isSimple || dettagliAperti || ricorrente || !!negozio || !!nota.trim() || !!scontrino;

  // Si apre la pagina per scrivere un importo: il fuoco parte da lì.
  useEffect(() => {
    importoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    let alive = true;
    Promise.all([expenseService.getAmbiti(scope), expenseService.getNegozi(scope)])
      .then(([a, n]) => {
        if (!alive) return;
        setAmbiti(a);
        setNegozi(n);
      })
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, [scope, isInitialized]);

  useEffect(() => {
    if (scope !== "C") {
      setMembers([]);
      return;
    }
    let alive = true;
    familyService.getMembers().then((m) => alive && setMembers(m));
    return () => {
      alive = false;
    };
  }, [scope]);

  /* Mentre scegli la categoria, quanto resta nella sua busta. */
  useEffect(() => {
    if (!isInitialized) return;
    let alive = true;
    budgetService.getStatus(range, scope).then((res) => alive && setBuste(res.data));
    return () => {
      alive = false;
    };
  }, [scope, isInitialized, range]);

  const busta = useMemo(
    () => buste.find((b) => b.categoria.toLowerCase() === ambito.trim().toLowerCase()) ?? null,
    [buste, ambito]
  );

  const recenti = useMemo(() => ambiti.slice(0, 7).map((a) => a.name), [ambiti]);
  const oggi = formatDateForAPI(new Date());
  const ieri = formatDateForAPI(new Date(Date.now() - 86_400_000));

  const validate = (): Errors => {
    const e: Errors = {};
    if (parseAmount(importo) === null) e.importo = "Inserisci un importo maggiore di zero.";
    if (!ambito.trim()) e.ambito = "Scegli o scrivi una categoria.";
    return e;
  };

  const submit = async (e: React.FormEvent, andNew = false) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      // il focus va sul primo campo non valido, non solo un messaggio in cima
      (found.importo ? importoRef : ambitoRef).current?.focus();
      return;
    }
    if (!quoteValide) {
      toast.error("Le quote non fanno 100%", {
        id: "quote-100",
        description: "Correggi le percentuali prima di salvare.",
      });
      return;
    }

    setSaving(true);
    try {
      const config: RecurringConfig | undefined = ricorrente
        ? {
            ricorrenza: cadenza,
            data_inizio: data,
            data_fine: dataFine || null,
            tipo_conferma: autoConferma ? "A" : "M",
            giorni_settimana: cadenza === "settimanale" ? giorniSettimana : undefined,
          }
        : undefined;

      const creata = await expenseService.createExpense({
        importo: parseAmount(importo)!,
        ambito: ambito.trim(),
        negozio: negozio.trim(),
        note_spese: nota.trim(),
        data_spesa: data,
        tipo_transazione: tipo,
        tipo_spesa: scope,
        paid_by: scope === "C" ? payer : undefined,
        ricorrente,
        confermata: true,
        is_recurring_parent: ricorrente,
        recurring_config: config,
      });

      // Le quote si scrivono dopo, sull'id appena creato. Se falliscono
      // la spesa resta valida e torna in parti uguali: lo diciamo, non
      // si perde niente.
      if (scope === "C" && splits.length > 0 && creata?.id) {
        const esito = await familyService.setSplits(creata.id, splits);
        if (!esito.ok) {
          toast.warning("Spesa salvata, quote no", {
            description: esito.needsMigration
              ? "Le quote personalizzate non sono ancora attive sul database: la spesa si divide in parti uguali."
              : (esito.error ?? "La spesa si divide in parti uguali."),
          });
        }
      }

      // Stessa logica per lo scontrino: la spesa è già salva, l'allegato
      // è un di più che non deve poterla far fallire.
      if (scontrino && creata?.id) {
        const esito = await receiptService.uploadAndAttach(scontrino, scope, creata.id);
        if (!esito.ok) {
          toast.warning("Spesa salvata, scontrino no", {
            description: esito.needsMigration
              ? "Gli scontrini non sono ancora attivi sul database."
              : (esito.error ?? "Riprova ad allegarlo dalla modifica."),
          });
        }
      }

      toast.success(ricorrente ? "Ricorrenza salvata" : "Movimento salvato", {
        description: `${tipo === "spesa" ? "−" : "+"}${formatCurrency(parseAmount(importo)!)} · ${ambito.trim()}`,
        action: { label: "Vedi movimenti", onClick: () => router.push("/spese") },
      });

      if (andNew) {
        setImporto("");
        setNegozio("");
        setNota("");
        setScontrino(null);
        setErrors({});
        importoRef.current?.focus();
      } else {
        router.push("/spese");
      }
    } catch (err) {
      console.error(err);
      toast.error("Salvataggio non riuscito", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const amountColor = tipo === "spesa" ? "var(--neg)" : "var(--pos)";

  return (
    <ProtectedRoute>
      <PageHeader
        title={ricorrente ? "Nuova spesa ricorrente" : tipo === "spesa" ? "Aggiungi una spesa" : "Aggiungi un'entrata"}
        subtitle={scope === "C" ? profile?.group_name || "Portafoglio condiviso" : "Portafoglio personale"}
        backHref="/spese"
      />

      <form onSubmit={(e) => submit(e)} noValidate className="page px-4 py-4 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <SegTabs
            ariaLabel="Tipo di movimento"
            value={tipo}
            onChange={(v) => setTipo(v)}
            options={[
              { value: "spesa", label: "Ho speso", tone: "neg" },
              { value: "entrata", label: "Ho incassato", tone: "pos" },
            ]}
          />

          {/* ---------- Importo ---------- */}
          <Card className="px-5 py-7 text-center">
            <label htmlFor="importo" className="text-[11px] font-bold uppercase tracking-[0.07em] text-faint">
              Quanto
            </label>
            <div className="mt-2 flex items-baseline justify-center gap-1">
              <span className="text-2xl font-semibold text-faint" aria-hidden>€</span>
              <input
                id="importo"
                ref={importoRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, importo: validate().importo }))}
                placeholder="0,00"
                aria-invalid={!!errors.importo}
                aria-describedby={errors.importo ? "err-importo" : undefined}
                className="tnum min-w-0 max-w-[260px] bg-transparent text-left text-[46px] font-extrabold tracking-tight outline-none placeholder:text-faint/50"
                // largo quanto la cifra: centrato su 260px lasciava il «€» lontano dal numero
                style={{ color: amountColor, width: `${Math.max(4, importo.length + 0.5)}ch` }}
              />
            </div>
            {errors.importo && (
              <p id="err-importo" role="alert" className="mt-2 text-xs font-medium text-neg">
                {errors.importo}
              </p>
            )}
          </Card>

          {/* ---------- Categoria ---------- */}
          <Field
            label="Per cosa"
            required
            htmlFor="ambito"
            error={errors.ambito}
            help={
              busta ? (
                <span className="flex items-center gap-2">
                  <MiniBar
                    percent={busta.percentuale}
                    tone={STATO_TONE[busta.stato]}
                    width={22}
                    thickness={5}
                    ariaLabel={`Budget ${busta.categoria}: ${STATO_LABEL[busta.stato]}`}
                  />
                  <span>
                    Budget {busta.categoria}:{" "}
                    <strong className="tnum font-semibold text-muted">
                      {busta.residuo >= 0
                        ? `restano ${formatCurrency(busta.residuo)}`
                        : `superato di ${formatCurrency(-busta.residuo)}`}
                    </strong>{" "}
                    di {formatCurrency(busta.tetto)}
                  </span>
                </span>
              ) : (
                "Scegli fra quelle che usi già o scrivine una nuova."
              )
            }
          >
            {recenti.length > 0 && (
              <div className="no-bar -mx-4 mb-1 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                {recenti.map((c) => (
                  <Chip key={c} active={ambito === c} icon={Tag} onClick={() => { setAmbito(c); setErrors((p) => ({ ...p, ambito: undefined })); }}>
                    {c}
                  </Chip>
                ))}
              </div>
            )}
            <input
              id="ambito"
              ref={ambitoRef}
              list="lista-ambiti"
              value={ambito}
              onChange={(e) => setAmbito(e.target.value)}
              onBlur={() => setErrors((p) => ({ ...p, ambito: validate().ambito }))}
              placeholder="Es. Spesa, Casa, Trasporti…"
              aria-invalid={!!errors.ambito}
              className={inputClass}
            />
            <datalist id="lista-ambiti">
              {ambiti.map((a) => (
                <option key={a.code} value={a.name} />
              ))}
            </datalist>
          </Field>

          {/* ---------- Chi ha pagato ---------- */}
          {scope === "C" && profile?.group_id && (
            <PayerPicker
              value={payer}
              onChange={setPayer}
              members={members}
              groupName={profile.group_name}
              date={data}
              groupId={profile.group_id}
              currentUserId={user?.id}
            />
          )}

          {/* ---------- Come si divide ----------
              Solo sugli anticipi: una spesa del fondo comune è già di
              tutti e non entra nel conguaglio, dividerla non cambierebbe
              niente. */}
          {scope === "C" && profile?.group_id && payer !== null && (
            <SplitEditor
              members={members}
              importo={parseAmount(importo) ?? 0}
              iniziali={VUOTE}
              onValiditaChange={setQuoteValide}
              onChange={setSplits}
            />
          )}

          {/* ---------- Quando ---------- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quando" htmlFor="data">
              <div className="mb-1 flex gap-2">
                <Chip active={data === oggi} onClick={() => setData(oggi)}>Oggi</Chip>
                <Chip active={data === ieri} onClick={() => setData(ieri)}>Ieri</Chip>
              </div>
              <div className="relative">
                <input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={inputClass}
                />
                <Calendar className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
              </div>
            </Field>
          </div>

          {isSimple && !mostraDettagli && (
            <button
              type="button"
              onClick={() => setDettagliAperti(true)}
              aria-expanded={false}
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-dashed border-line text-sm font-semibold text-accent hover:bg-surface-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Altri dettagli
              <span className="font-normal text-faint">· dove, si ripete, scontrino, nota</span>
            </button>
          )}

          {mostraDettagli && (
          <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dove" htmlFor="negozio" help="Negozio o beneficiario.">
              <div className="relative">
                <input
                  id="negozio"
                  list="lista-negozi"
                  value={negozio}
                  onChange={(e) => setNegozio(e.target.value)}
                  placeholder="Es. Esselunga"
                  className={`${inputClass} pl-10`}
                />
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
              </div>
              <datalist id="lista-negozi">
                {negozi.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
          </div>

          {/* ---------- Ricorrenza ---------- */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
                  <Repeat className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Si ripete</p>
                  <p className="text-xs text-faint">Resta previsto finché non lo confermi.</p>
                </div>
              </div>
              <Toggle checked={ricorrente} onChange={setRicorrente} label="Movimento ricorrente" />
            </div>

            {ricorrente && (
              <div className="anim-up mt-4 flex flex-col gap-4 border-t border-line pt-4">
                <Field label="Frequenza" htmlFor="cadenza">
                  <select
                    id="cadenza"
                    value={cadenza}
                    onChange={(e) => setCadenza(e.target.value as RecurringConfig["ricorrenza"])}
                    className={inputClass}
                  >
                    {CADENZE.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>

                {cadenza === "settimanale" && (
                  <Field label="In quali giorni" help="Se non ne scegli nessuno usiamo il giorno della data di inizio.">
                    <div className="flex flex-wrap gap-2">
                      {GIORNI.map((g, i) => {
                        const value = i + 1;
                        const on = giorniSettimana.includes(value);
                        return (
                          <button
                            key={i}
                            type="button"
                            aria-pressed={on}
                            aria-label={GIORNI_LUNGHI[i]}
                            onClick={() =>
                              setGiorniSettimana((prev) =>
                                on ? prev.filter((d) => d !== value) : [...prev, value].sort()
                              )
                            }
                            className={`grid h-11 w-11 place-items-center rounded-full text-sm font-bold transition-colors ${
                              on ? "bg-accent text-accent-ink" : "bg-surface-3 text-muted hover:text-ink"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fine" htmlFor="fine" help="Lascia vuoto per non farla finire.">
                    <input id="fine" type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Conferma" help={autoConferma ? "Entra subito nel saldo reale." : "Dovrai confermarla ogni volta."}>
                    <div className="flex min-h-12 items-center justify-between rounded-md border border-line bg-surface px-3.5">
                      <span className="text-sm">{autoConferma ? "Automatica" : "Manuale"}</span>
                      <Toggle checked={autoConferma} onChange={setAutoConferma} label="Conferma automatica" />
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </Card>

          {/* ---------- Scontrino ---------- */}
          <ReceiptPicker value={scontrino} onChange={setScontrino} scope={scope} />

          {/* ---------- Nota ---------- */}
          <Field label="Nota" htmlFor="nota" help="Facoltativa.">
            <textarea
              id="nota"
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Aggiungi un dettaglio…"
              className={`${inputClass} min-h-20 py-3`}
            />
          </Field>
          </>
          )}

          {/* ---------- Azioni ---------- */}
          <div
            className="sticky bottom-0 -mx-4 mt-2 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Button type="submit" variant="primary" size="lg" icon={Check} loading={saving} className="w-full">
              {ricorrente ? "Salva ricorrenza" : "Salva"}
            </Button>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <button type="button" onClick={(e) => submit(e, true)} className="min-h-10 px-2 font-semibold text-accent">
                Salva e aggiungine un&apos;altra
              </button>
              <button type="button" onClick={() => router.push("/spese")} className="min-h-10 px-2 text-faint">
                Annulla
              </button>
            </div>
          </div>
        </div>
      </form>
    </ProtectedRoute>
  );
}
