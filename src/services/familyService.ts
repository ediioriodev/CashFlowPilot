import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { isMissingModule } from "@/lib/moduleState";

/* ============================================================
   FAMIGLIA — chi ha pagato, quote e conguaglio.

   Una spesa condivisa può essere pagata in due modi:

     FONDO COMUNE (spese.paid_by IS NULL, impostazione di default)
       I soldi erano già di tutti: la spesa non crea debiti e resta
       fuori dal conguaglio.

     ANTICIPO PERSONALE (spese.paid_by = uuid del membro)
       Qualcuno ha messo di tasca propria: il conguaglio divide la
       spesa fra i membri e gli restituisce la differenza.

   Come si divide un anticipo:
     - senza righe in expense_splits → parti uguali fra i membri;
     - con righe                     → valgono quelle.

   Il calcolo sta sul database (get_settlement), che tiene conto anche
   dei conguagli già chiusi. Finché la migrazione
   20260101000300_splits_settlements.sql non è applicata si ricade sul
   calcolo locale di prima: parti uguali e nessuna chiusura.
   ============================================================ */

export interface Member {
  userId: string;
  name: string;
  isAdmin: boolean;
}

export interface Contribution extends Member {
  /** quanto ha anticipato di tasca propria nel periodo */
  paid: number;
  /** quanto gli spetta di quegli anticipi (quota personalizzata o parti uguali) */
  share: number;
  /** paid − share: positivo = ha anticipato, negativo = deve */
  balance: number;
  count: number;
}

export interface Transfer {
  from: Member;
  to: Member;
  amount: number;
}

export interface Settlement {
  /** tutte le uscite condivise reali del periodo */
  total: number;
  /** quota pagata dal fondo comune: fuori dal conguaglio */
  fondoComune: number;
  /** quota anticipata dai membri: è la base del conguaglio */
  anticipato: number;
  /** quota media a testa, per la tacca nelle barre */
  share: number;
  contributions: Contribution[];
  transfers: Transfer[];
  /** true se la colonna paid_by non esiste ancora a DB */
  needsMigration: boolean;
  /** true se il conto arriva da get_settlement: quote personalizzate attive */
  viaDatabase: boolean;
  /** conguaglio già chiuso che copre questo periodo, se c'è */
  chiuso: ClosedSettlement | null;
  /** anticipi inseriti DOPO la chiusura dentro il periodo chiuso: restano
   *  fuori dal conto finché il conguaglio non si riapre */
  dopoChiusura: number;
}

export interface ClosedSettlement {
  id: number;
  periodStart: string;
  periodEnd: string;
  totale: number;
  closedAt: string;
  closedBy: string;
  transfers: { from: string; to: string; amount: number }[];
}

export interface Split {
  userId: string;
  quota: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const EMPTY: Settlement = {
  total: 0,
  fondoComune: 0,
  anticipato: 0,
  share: 0,
  contributions: [],
  transfers: [],
  needsMigration: false,
  viaDatabase: false,
  chiuso: null,
  dopoChiusura: 0,
};

interface SpesaRow {
  user_id: string;
  paid_by?: string | null;
  importo: number | string;
  data_spesa: string;
  confermata: boolean | null;
  is_recurring_parent: boolean | null;
}

interface SettlementRow {
  user_id: string;
  pagato: number | string;
  dovuto: number | string;
  saldo: number | string;
}

interface TotalsRow {
  totale: number | string;
  fondo_comune: number | string;
  anticipato: number | string;
  n_spese: number;
}

interface ClosedRow {
  id: number;
  period_start: string;
  period_end: string;
  totale: number | string;
  closed_at: string;
  closed_by: string;
  dettaglio: unknown;
}

function toClosed(r: ClosedRow): ClosedSettlement {
  const dettaglio = Array.isArray(r.dettaglio)
    ? (r.dettaglio as { from?: string; to?: string; amount?: number | string }[])
    : [];
  return {
    id: r.id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totale: Number(r.totale || 0),
    closedAt: r.closed_at,
    closedBy: r.closed_by,
    transfers: dettaglio.map((t) => ({
      from: String(t.from ?? ""),
      to: String(t.to ?? ""),
      amount: Number(t.amount ?? 0),
    })),
  };
}

export const familyService = {
  /** Membri del gruppo, con indicazione dell'amministratore. */
  async getMembers(groupId?: number | null): Promise<Member[]> {
    const gid = groupId ?? (await groupService.getGroupId());
    if (!gid) return [];

    const [{ data: rows, error }, { data: group }] = await Promise.all([
      supabase.from("users_group").select("user_id, first_name, last_name").eq("group_id", gid),
      supabase.from("groups_account").select("admin").eq("id", gid).single(),
    ]);

    if (error) {
      console.error("Errore nel caricamento dei membri:", error);
      return [];
    }

    type Row = { user_id: string | null; first_name: string | null; last_name: string | null };
    return ((rows ?? []) as Row[])
      .filter((r) => !!r.user_id)
      .map((r) => ({
        userId: r.user_id!,
        name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Membro",
        isAdmin: group?.admin === r.user_id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Conguaglio del periodo.
   * Conta solo le uscite reali (confermate e già avvenute): un conguaglio
   * su spese non ancora sostenute non avrebbe senso.
   */
  async getSettlement(
    range: { start: string; end: string },
    groupId?: number | null
  ): Promise<Settlement> {
    const gid = groupId ?? (await groupService.getGroupId());
    const members = await this.getMembers(gid);
    if (!gid || members.length === 0) return EMPTY;

    /* Il calcolo locale serve comunque: dà il numero di anticipi per membro
       (get_settlement non lo restituisce) e, a periodo chiuso, quanto si è
       speso davvero — get_settlement_totals esclude le spese dei periodi
       saldati e da solo direbbe «0,00 €» su un mese in cui si è speso. */
    const [viaDb, chiuso, locale] = await Promise.all([
      this.settlementFromDb(gid, range, members),
      this.getClosedFor(gid, range),
      this.settlementLocale(gid, range, members),
    ]);

    if (!viaDb) {
      // La migrazione non c'è ancora: vale il calcolo locale.
      return { ...locale, chiuso };
    }

    if (chiuso) {
      // Periodo saldato: si mostra quanto si è speso, a debiti azzerati.
      return {
        ...viaDb,
        total: locale.total,
        fondoComune: locale.fondoComune,
        anticipato: locale.anticipato,
        share: locale.share,
        contributions: locale.contributions.map((c) => ({ ...c, share: c.paid, balance: 0 })),
        transfers: [],
        chiuso,
        dopoChiusura: await this.countDopoChiusura(gid, chiuso),
      };
    }

    const conteggi = new Map(locale.contributions.map((c) => [c.userId, c.count]));
    return {
      ...viaDb,
      contributions: viaDb.contributions.map((c) => ({ ...c, count: conteggi.get(c.userId) ?? 0 })),
      chiuso,
    };
  },

  /** Anticipi datati dentro un periodo già chiuso ma inseriti dopo la chiusura. */
  async countDopoChiusura(gid: number, chiuso: ClosedSettlement): Promise<number> {
    const { count, error } = await supabase
      .from("spese")
      .select("id", { count: "exact", head: true })
      .eq("group_id", gid)
      .eq("tipo_transazione", "spesa")
      .eq("confermata", true)
      .is("deleted_at", null)
      .not("paid_by", "is", null)
      .gte("data_spesa", chiuso.periodStart)
      .lte("data_spesa", chiuso.periodEnd)
      .gt("created_at", chiuso.closedAt);
    if (error) {
      console.error("Errore nel conteggio degli anticipi dopo la chiusura:", error);
      return 0;
    }
    return count ?? 0;
  },

  /** Il conto fatto dal database: quote personalizzate e periodi chiusi. */
  async settlementFromDb(
    gid: number,
    range: { start: string; end: string },
    members: Member[]
  ): Promise<Settlement | null> {
    const [righe, totali] = await Promise.all([
      supabase.rpc("get_settlement", { p_group_id: gid, p_start: range.start, p_end: range.end }),
      supabase.rpc("get_settlement_totals", { p_group_id: gid, p_start: range.start, p_end: range.end }),
    ]);

    if (righe.error || totali.error) {
      if (isMissingModule(righe.error) || isMissingModule(totali.error)) return null;
      console.error("Errore nel calcolo del conguaglio:", righe.error ?? totali.error);
      return null;
    }

    const rows = (righe.data ?? []) as SettlementRow[];
    const t = (Array.isArray(totali.data) ? totali.data[0] : totali.data) as TotalsRow | undefined;

    const byUser = new Map(rows.map((r) => [r.user_id, r]));
    const contributions: Contribution[] = members
      .map((m) => {
        const r = byUser.get(m.userId);
        return {
          ...m,
          paid: round2(Number(r?.pagato ?? 0)),
          share: round2(Number(r?.dovuto ?? 0)),
          balance: round2(Number(r?.saldo ?? 0)),
          count: 0,
        };
      })
      .sort((a, b) => b.paid - a.paid);

    const anticipato = round2(Number(t?.anticipato ?? 0));

    return {
      total: round2(Number(t?.totale ?? 0)),
      fondoComune: round2(Number(t?.fondo_comune ?? 0)),
      anticipato,
      share: round2(anticipato / Math.max(1, members.length)),
      contributions,
      transfers: minimalTransfers(contributions),
      needsMigration: false,
      viaDatabase: true,
      chiuso: null,
      dopoChiusura: 0,
    };
  },

  /**
   * Il calcolo di prima, ancora valido finché le tabelle nuove non ci
   * sono: solo paid_by, sempre parti uguali, nessuna chiusura.
   */
  async settlementLocale(
    gid: number,
    range: { start: string; end: string },
    members: Member[]
  ): Promise<Settlement> {
    const base = supabase
      .from("spese")
      .select("user_id, paid_by, importo, data_spesa, confermata, is_recurring_parent")
      .eq("group_id", gid)
      .eq("tipo_transazione", "spesa")
      .gte("data_spesa", range.start)
      .lte("data_spesa", range.end)
      .is("deleted_at", null);

    const first = await base;
    let rows = (first.data ?? null) as SpesaRow[] | null;
    let error = first.error;
    let needsMigration = false;

    // Finché la migrazione 20260101000250_paid_by.sql non è applicata la
    // colonna non esiste: si rilegge senza, e tutto risulta fondo comune.
    if (error && /paid_by/i.test(error.message)) {
      needsMigration = true;
      const retry = await supabase
        .from("spese")
        .select("user_id, importo, data_spesa, confermata, is_recurring_parent")
        .eq("group_id", gid)
        .eq("tipo_transazione", "spesa")
        .gte("data_spesa", range.start)
        .lte("data_spesa", range.end)
        .is("deleted_at", null);
      rows = (retry.data ?? null) as SpesaRow[] | null;
      error = retry.error;
    }

    if (error) {
      console.error("Errore nel calcolo del conguaglio:", error);
      return EMPTY;
    }

    const today = new Date().toISOString().split("T")[0];
    const paid = new Map<string, { sum: number; n: number }>();
    let total = 0;
    let fondoComune = 0;
    let anticipato = 0;

    (rows ?? []).forEach((row) => {
      if (!row.confermata || row.data_spesa > today) return;

      const amount = Number(row.importo || 0);
      total += amount;

      const payer = row.paid_by ?? null;
      if (!payer) {
        fondoComune += amount; // pagata da tutti: niente debiti
        return;
      }

      anticipato += amount;
      const cur = paid.get(payer) ?? { sum: 0, n: 0 };
      cur.sum += amount;
      cur.n += 1;
      paid.set(payer, cur);
    });

    const share = round2(anticipato / members.length);

    const contributions: Contribution[] = members
      .map((m) => {
        const p = paid.get(m.userId) ?? { sum: 0, n: 0 };
        return {
          ...m,
          paid: round2(p.sum),
          share,
          balance: round2(p.sum - share),
          count: p.n,
        };
      })
      .sort((a, b) => b.paid - a.paid);

    return {
      total: round2(total),
      fondoComune: round2(fondoComune),
      anticipato: round2(anticipato),
      share,
      contributions,
      transfers: minimalTransfers(contributions),
      needsMigration,
      viaDatabase: false,
      chiuso: null,
      dopoChiusura: 0,
    };
  },

  /* ---------------- Conguagli chiusi ---------------- */

  /** Il conguaglio chiuso che copre questo periodo, se esiste. */
  async getClosedFor(
    gid: number,
    range: { start: string; end: string }
  ): Promise<ClosedSettlement | null> {
    const { data, error } = await supabase
      .from("settlements")
      .select("id, period_start, period_end, totale, closed_at, closed_by, dettaglio")
      .eq("group_id", gid)
      .lte("period_start", range.end)
      .gte("period_end", range.start)
      .order("closed_at", { ascending: false })
      .limit(1);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nella lettura dei conguagli:", error);
      return null;
    }
    const row = (data ?? [])[0] as ClosedRow | undefined;
    return row ? toClosed(row) : null;
  },

  /** Storico delle chiusure, dalla più recente. */
  async getClosedSettlements(groupId?: number | null, limit = 12): Promise<ClosedSettlement[]> {
    const gid = groupId ?? (await groupService.getGroupId());
    if (!gid) return [];

    const { data, error } = await supabase
      .from("settlements")
      .select("id, period_start, period_end, totale, closed_at, closed_by, dettaglio")
      .eq("group_id", gid)
      .order("period_end", { ascending: false })
      .limit(limit);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nella lettura dei conguagli:", error);
      return [];
    }
    return ((data ?? []) as ClosedRow[]).map(toClosed);
  },

  /**
   * Segna il conguaglio come saldato: le spese di questo periodo escono
   * dal calcolo dei periodi successivi.
   */
  async closeSettlement(
    range: { start: string; end: string },
    transfers: Transfer[],
    groupId?: number | null
  ): Promise<{ ok: boolean; needsMigration: boolean; error: string | null }> {
    const gid = groupId ?? (await groupService.getGroupId());
    if (!gid) return { ok: false, needsMigration: false, error: "Non fai parte di nessun gruppo." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, needsMigration: false, error: "Sessione scaduta." };

    const dettaglio = transfers.map((t) => ({
      from: t.from.userId,
      to: t.to.userId,
      amount: t.amount,
    }));

    const { error } = await supabase.from("settlements").insert({
      group_id: gid,
      period_start: range.start,
      period_end: range.end,
      dettaglio,
      totale: round2(transfers.reduce((s, t) => s + t.amount, 0)),
      closed_by: user.id,
    });

    if (error) {
      if (isMissingModule(error)) return { ok: false, needsMigration: true, error: null };
      if (error.code === "23505") {
        return { ok: false, needsMigration: false, error: "Questo periodo è già stato chiuso." };
      }
      console.error("Errore nella chiusura del conguaglio:", error);
      return { ok: false, needsMigration: false, error: "Non siamo riusciti a chiudere il conguaglio." };
    }
    return { ok: true, needsMigration: false, error: null };
  },

  /** Riapre un conguaglio chiuso per errore (solo amministratore). */
  async reopenSettlement(id: number): Promise<{ ok: boolean; error: string | null }> {
    /* Una delete bloccata da RLS non dà errore: cancella zero righe. Senza
       il controllo sul numero di righe l'app direbbe «riaperto» anche quando
       il conguaglio è rimasto chiuso. */
    const { data, error } = await supabase.from("settlements").delete().eq("id", id).select("id");
    if (error || !data?.length) {
      if (error) console.error("Errore nella riapertura del conguaglio:", error);
      return { ok: false, error: "Solo l'amministratore del gruppo può riaprire un conguaglio." };
    }
    return { ok: true, error: null };
  },

  /* ---------------- Quote personalizzate ---------------- */

  /** Quote di una spesa. Elenco vuoto = parti uguali. */
  async getSplits(spesaId: number): Promise<Split[]> {
    const { data, error } = await supabase
      .from("expense_splits")
      .select("user_id, quota")
      .eq("spesa_id", spesaId);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nella lettura delle quote:", error);
      return [];
    }
    return ((data ?? []) as { user_id: string; quota: number | string }[]).map((r) => ({
      userId: r.user_id,
      quota: Number(r.quota || 0),
    }));
  },

  /**
   * Scrive le quote di una spesa. Un elenco vuoto le cancella e riporta
   * la spesa alla divisione in parti uguali: è uno stato valido, non un
   * errore, ed è il motivo per cui non serve migrare i dati esistenti.
   */
  async setSplits(
    spesaId: number,
    splits: Split[]
  ): Promise<{ ok: boolean; needsMigration: boolean; error: string | null }> {
    const del = await supabase.from("expense_splits").delete().eq("spesa_id", spesaId);
    if (del.error) {
      if (isMissingModule(del.error)) return { ok: false, needsMigration: true, error: null };
      console.error("Errore nella scrittura delle quote:", del.error);
      return { ok: false, needsMigration: false, error: "Non siamo riusciti a salvare le quote." };
    }

    const righe = splits.filter((s) => s.quota > 0);
    if (righe.length === 0) return { ok: true, needsMigration: false, error: null };

    const { error } = await supabase.from("expense_splits").insert(
      righe.map((s) => ({ spesa_id: spesaId, user_id: s.userId, quota: round2(s.quota) }))
    );

    if (error) {
      if (isMissingModule(error)) return { ok: false, needsMigration: true, error: null };
      console.error("Errore nella scrittura delle quote:", error);
      // il constraint trigger scatta solo qui: somma diversa dall'importo
      return {
        ok: false,
        needsMigration: false,
        error: "Le quote non coincidono con l'importo della spesa.",
      };
    }
    return { ok: true, needsMigration: false, error: null };
  },
};

/**
 * Meno bonifici possibile: il debitore più grande paga il creditore
 * più grande finché i conti non tornano.
 */
function minimalTransfers(contributions: Contribution[]): Transfer[] {
  const creditors = contributions.filter((c) => c.balance > 0.01).map((c) => ({ m: c, v: c.balance }));
  const debtors = contributions.filter((c) => c.balance < -0.01).map((c) => ({ m: c, v: -c.balance }));
  creditors.sort((a, b) => b.v - a.v);
  debtors.sort((a, b) => b.v - a.v);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  // ogni passo azzera almeno un lato: al massimo n−1 iterazioni
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    if (amount > 0.01) {
      transfers.push({ from: debtors[i].m, to: creditors[j].m, amount: round2(amount) });
    }
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v <= 0.01) i++;
    if (creditors[j].v <= 0.01) j++;
  }
  return transfers;
}
