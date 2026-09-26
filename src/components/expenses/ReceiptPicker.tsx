"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Paperclip, Trash2, X } from "lucide-react";

import { Button, Field, Modal, Skeleton } from "@/components/ui/kit";
import { receiptService } from "@/services/receiptService";

/* ============================================================
   SCONTRINO — scelta, anteprima e visualizzazione.

   In fase di creazione la spesa non ha ancora un id, quindi il file
   resta qui in attesa e lo carica il form a salvataggio avvenuto.
   In modifica invece lo scontrino esiste già e si lavora sul percorso.
   ============================================================ */

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export default function ReceiptPicker({
  value,
  onChange,
  path,
  onRemovePath,
  scope,
  className,
}: {
  /** file scelto e non ancora caricato */
  value: File | null;
  onChange: (f: File | null) => void;
  /** scontrino già caricato, se c'è */
  path?: string | null;
  onRemovePath?: () => void;
  scope: "C" | "P";
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [apri, setApri] = useState(false);

  /* L'anteprima si ricava dal file, non si tiene in uno stato parallelo:
     è un valore derivato e basta. L'object URL però va revocato, o resta
     in memoria per tutta la vita della pagina. */
  const anteprima = useMemo(
    () => (value && value.type.startsWith("image/") ? URL.createObjectURL(value) : null),
    [value]
  );

  useEffect(() => {
    if (!anteprima) return;
    return () => URL.revokeObjectURL(anteprima);
  }, [anteprima]);

  const scegli = (f: File | null) => {
    onChange(f);
    if (input.current) input.current.value = "";
  };

  return (
    <Field
      label="Scontrino"
      className={className}
      help={
        value || path
          ? "Le foto vengono ridotte prima di essere caricate."
          : "Facoltativo. Una foto o un PDF."
      }
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        aria-label="Scegli uno scontrino"
        onChange={(e) => scegli(e.target.files?.[0] ?? null)}
      />

      {!value && !path && (
        <Button
          type="button"
          icon={Paperclip}
          className="w-full"
          onClick={() => input.current?.click()}
        >
          Aggiungi uno scontrino
        </Button>
      )}

      {value && (
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5">
          {anteprima ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob locale, next/image non la può ottimizzare
            <img
              src={anteprima}
              alt=""
              className="h-12 w-12 shrink-0 rounded-sm object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <p className="tnum text-xs text-faint">{Math.round(value.size / 1024)} KB</p>
          </div>
          <Button size="sm" variant="ghost" icon={X} onClick={() => scegli(null)}>
            Togli
          </Button>
        </div>
      )}

      {!value && path && (
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent">
            <Paperclip className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Scontrino allegato</p>
            <button
              type="button"
              onClick={() => setApri(true)}
              className="text-xs font-semibold text-accent"
            >
              Guardalo
            </button>
          </div>
          <Button size="sm" variant="ghost" icon={Paperclip} onClick={() => input.current?.click()}>
            Sostituisci
          </Button>
          {onRemovePath && (
            <Button size="sm" variant="ghost" icon={Trash2} onClick={onRemovePath}>
              <span className="sr-only">Elimina lo scontrino</span>
            </Button>
          )}
        </div>
      )}

      {path && <ReceiptViewer path={apri ? path : null} onClose={() => setApri(false)} scope={scope} />}
    </Field>
  );
}

/* ------------------------------------------------------------
   VISUALIZZATORE — il bucket è privato, quindi ogni apertura
   chiede una URL firmata nuova. Non se ne conserva nessuna.
   ------------------------------------------------------------ */
export function ReceiptViewer({
  path,
  onClose,
}: {
  path: string | null;
  onClose: () => void;
  scope?: "C" | "P";
}) {
  /* La firma si tiene insieme al percorso a cui appartiene: così
     riaprendo uno scontrino diverso non si vede per un istante quello
     di prima, e non serve azzerare lo stato quando il modale si chiude. */
  const [firmato, setFirmato] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    receiptService.signedUrl(path).then((u) => {
      if (alive) setFirmato({ path, url: u });
    });
    return () => {
      alive = false;
    };
  }, [path]);

  const corrente = firmato && firmato.path === path ? firmato : null;
  const url = corrente?.url ?? null;
  const errore = !!corrente && corrente.url === null;

  const isPdf = (path ?? "").toLowerCase().endsWith(".pdf");

  return (
    <Modal
      open={!!path}
      onClose={onClose}
      title="Scontrino"
      size="md"
      footer={
        url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-accent"
          >
            <Download className="h-4 w-4" aria-hidden />
            Scarica
          </a>
        ) : undefined
      }
    >
      {errore ? (
        <p className="py-8 text-center text-sm text-faint">
          Non siamo riusciti ad aprire lo scontrino.
        </p>
      ) : !url ? (
        <Skeleton className="h-64 w-full" />
      ) : isPdf ? (
        <p className="py-8 text-center text-sm text-muted">
          È un PDF: aprilo o scaricalo con il pulsante qui sotto.
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmata a tempo: non deve passare dall'ottimizzatore
        <img
          src={url}
          alt="Scontrino"
          className="mx-auto h-auto max-h-[60vh] w-auto rounded-md"
        />
      )}
    </Modal>
  );
}
