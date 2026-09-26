import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { isMissingBucket, isMissingModule } from "@/lib/moduleState";

/* ============================================================
   SCONTRINI

   Il file sta in Supabase Storage, nel bucket privato "receipts";
   sul database resta solo il percorso (spese.receipt_path).

   Percorso: <group_id|user_id>/<spesa_id>-<timestamp>.<ext>
   La prima cartella è ciò su cui si appoggiano le policy di Storage,
   quindi non è un dettaglio estetico: sbagliarla significa non poter
   più leggere il file.

   Due regole che vengono dall'esperienza:
     - si comprime PRIMA di caricare (una foto da 4 MB diventa ~200 KB
       e il limite di 5 MB del bucket non si tocca mai);
     - il bucket è privato, quindi si usano solo URL firmate: un link
       pubblico non esiste e non deve finire nel client.

   Migrazione: 20260101000400_receipts.sql
   ============================================================ */

export type Scope = "C" | "P";

export interface UploadResult {
  ok: boolean;
  path: string | null;
  /** il bucket o la colonna non ci sono ancora */
  needsMigration: boolean;
  error: string | null;
}

const LATO_LUNGO = 1600;
const QUALITA = 0.8;
const MAX_BYTES = 5 * 1024 * 1024;

const estensione = (file: File) => {
  const dal_nome = file.name.split(".").pop()?.toLowerCase();
  if (dal_nome && dal_nome.length <= 5) return dal_nome;
  if (file.type === "application/pdf") return "pdf";
  return "jpg";
};

/**
 * Ridimensiona e ricomprime l'immagine in un JPEG.
 * Se qualcosa non va (HEIC che il browser non sa decodificare, canvas
 * non disponibile) si torna il file originale: meglio caricare qualche
 * megabyte in più che perdere lo scontrino.
 */
export async function comprimi(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof document === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scala = Math.min(1, LATO_LUNGO / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scala);
    const h = Math.round(bitmap.height * scala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITA)
    );
    if (!blob) return file;
    // se la "compressione" ha peggiorato le cose, si tiene l'originale
    if (blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (e) {
    console.warn("Compressione non riuscita, carico l'originale:", e);
    return file;
  }
}

export const receiptService = {
  /** Cartella di primo livello: è la chiave delle policy di Storage. */
  async folder(scope: Scope): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    if (scope === "P") return user.id;
    const gid = await groupService.getGroupId();
    return gid ? String(gid) : null;
  },

  /** Comprime, carica e restituisce il percorso da salvare sulla spesa. */
  async upload(file: File, scope: Scope, spesaId: number | string): Promise<UploadResult> {
    const dir = await this.folder(scope);
    if (!dir) return { ok: false, path: null, needsMigration: false, error: "Sessione scaduta." };

    const pronto = await comprimi(file);
    if (pronto.size > MAX_BYTES) {
      return {
        ok: false,
        path: null,
        needsMigration: false,
        error: "Il file supera i 5 MB anche dopo la compressione.",
      };
    }

    const path = `${dir}/${spesaId}-${Date.now()}.${estensione(pronto)}`;
    const { error } = await supabase.storage.from("receipts").upload(path, pronto, {
      contentType: pronto.type || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      if (isMissingBucket(error)) return { ok: false, path: null, needsMigration: true, error: null };
      console.error("Errore nel caricamento dello scontrino:", error);
      return { ok: false, path: null, needsMigration: false, error: "Caricamento non riuscito." };
    }
    return { ok: true, path, needsMigration: false, error: null };
  },

  /** Il bucket è privato: si guarda solo con un'URL firmata a tempo.
   *  Cinque minuti e non un'ora: l'URL si rifirma a ogni apertura, e un link
   *  copiato e girato a chi non è del gruppo deve smettere presto di funzionare. */
  async signedUrl(path: string, seconds = 300): Promise<string | null> {
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, seconds);
    if (error) {
      console.error("Errore nella firma dell'URL:", error);
      return null;
    }
    return data?.signedUrl ?? null;
  },

  async remove(path: string): Promise<boolean> {
    const { error } = await supabase.storage.from("receipts").remove([path]);
    if (error) {
      console.error("Errore nella rimozione dello scontrino:", error);
      return false;
    }
    return true;
  },

  /**
   * Collega (o scollega, con null) lo scontrino alla spesa.
   * Sta qui e non in expenseService perché la colonna può non esistere
   * ancora: l'errore va riconosciuto e non deve far fallire il salvataggio
   * del movimento.
   */
  async attach(
    spesaId: number,
    scope: Scope,
    path: string | null
  ): Promise<{ ok: boolean; needsMigration: boolean }> {
    const table = scope === "C" ? "spese" : "spese_personali";
    const { error } = await supabase.from(table).update({ receipt_path: path }).eq("id", spesaId);

    if (error) {
      if (isMissingModule(error)) return { ok: false, needsMigration: true };
      console.error("Errore nel collegamento dello scontrino:", error);
      return { ok: false, needsMigration: false };
    }
    return { ok: true, needsMigration: false };
  },

  /**
   * Carica il file e lo collega alla spesa in un colpo solo.
   * Se il collegamento fallisce il file caricato viene rimosso: senza
   * questo, ogni salvataggio andato male lascerebbe un orfano nel bucket.
   */
  async uploadAndAttach(
    file: File,
    scope: Scope,
    spesaId: number
  ): Promise<UploadResult> {
    const caricato = await this.upload(file, scope, spesaId);
    if (!caricato.ok || !caricato.path) return caricato;

    const collegato = await this.attach(spesaId, scope, caricato.path);
    if (!collegato.ok) {
      await this.remove(caricato.path);
      return {
        ok: false,
        path: null,
        needsMigration: collegato.needsMigration,
        error: collegato.needsMigration ? null : "Non siamo riusciti a collegare lo scontrino.",
      };
    }
    return caricato;
  },
};
