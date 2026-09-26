"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Avatar, Chip, Field } from "@/components/ui/kit";
import { familyService, type ClosedSettlement, type Member } from "@/services/familyService";
import { formatDate } from "@/lib/formatUtils";

/**
 * Chi ha tirato fuori i soldi.
 *
 *   null  → fondo comune del gruppo (default): la spesa è già di tutti
 *           e non entra nel conguaglio.
 *   uuid  → quel membro ha anticipato: il conguaglio glielo restituisce.
 *
 * Con `date` e `groupId` avvisa se la data cade in un periodo il cui
 * conguaglio è già chiuso: get_settlement esclude quelle spese, quindi
 * un anticipo registrato lì non verrebbe restituito finché qualcuno non
 * riapre il conguaglio. Senza l'avviso lo si scopre solo dai conti.
 */
export default function PayerPicker({
  value,
  onChange,
  members,
  groupName,
  currentUserId,
  date,
  groupId,
  className,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  members: Member[];
  groupName?: string | null;
  currentUserId?: string;
  /** data della spesa (YYYY-MM-DD) */
  date?: string;
  groupId?: number | null;
  className?: string;
}) {
  const fondo = groupName?.trim() || "Fondo comune";
  /* La risposta resta legata alla data per cui è stata chiesta: cambiando
     data non si mostra l'avviso della data precedente mentre arriva la nuova. */
  const chiave = date && groupId ? `${groupId}|${date}` : null;
  const [letto, setLetto] = useState<{ chiave: string; c: ClosedSettlement | null } | null>(null);
  const chiuso = chiave && letto?.chiave === chiave ? letto.c : null;

  useEffect(() => {
    if (!chiave || !date || !groupId) return;
    let alive = true;
    familyService
      .getClosedFor(groupId, { start: date, end: date })
      .then((c) => alive && setLetto({ chiave, c }))
      .catch(() => alive && setLetto({ chiave, c: null }));
    return () => {
      alive = false;
    };
  }, [chiave, date, groupId]);

  const fuoriConguaglio = value !== null && chiuso !== null;

  return (
    <Field
      label="Chi ha pagato"
      className={className}
      help={
        fuoriConguaglio
          ? undefined
          : value === null
            ? "Pagata dal fondo comune: non entra nel conguaglio."
            : "Chi ha anticipato se la vedrà restituire nel conguaglio."
      }
    >
      <div className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <Chip active={value === null} onClick={() => onChange(null)}>
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              value === null ? "bg-accent-ink/20" : "bg-surface-3"
            }`}
          >
            <Wallet className="h-3 w-3" aria-hidden />
          </span>
          {fondo}
        </Chip>

        {members.map((m) => (
          <Chip key={m.userId} active={value === m.userId} onClick={() => onChange(m.userId)}>
            <Avatar id={m.userId} name={m.name} size={20} />
            {m.userId === currentUserId ? "Io" : m.name}
          </Chip>
        ))}
      </div>

      {fuoriConguaglio && chiuso && (
        <p role="status" className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
          Il conguaglio dal {formatDate(chiuso.periodStart)} al {formatDate(chiuso.periodEnd)} è già
          chiuso: questo anticipo non verrà restituito finché l&apos;amministratore non lo riapre da
          Famiglia. Se è una spesa nuova, controlla la data.
        </p>
      )}
    </Field>
  );
}
