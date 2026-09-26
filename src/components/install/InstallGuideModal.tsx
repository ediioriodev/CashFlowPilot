"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, MoreVertical, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button, Modal } from "@/components/ui/kit";
import type { InstallPlatform } from "@/context/InstallContext";

interface Step {
  icon: React.ElementType;
  text: React.ReactNode;
}

/**
 * Guida all'installazione per i browser che non permettono di farlo con
 * un tocco. I passi dipendono dalla piattaforma e, su iOS, anche dal
 * browser: in Safari il tasto Condividi sta nella barra in basso (in alto
 * su iPad), in Chrome ed Edge per iOS sta nella barra dell'indirizzo.
 */
export default function InstallGuideModal({
  open,
  onClose,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  platform: InstallPlatform | null;
}) {
  // Il modale si apre solo dopo un tocco, quindi sul client: niente
  // rischio di differenze con il render del server.
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;

  const { title, description, steps, note } = content(platform, ua);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        platform === "in-app-browser" ? (
          <CopyLinkButton />
        ) : (
          <Button variant="primary" onClick={onClose}>
            Ho capito
          </Button>
        )
      }
    >
      <ol className="flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-md bg-surface-2 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">
              {i + 1}
            </span>
            <span className="flex-1 pt-1 text-sm leading-relaxed">{s.text}</span>
            <s.icon className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
          </li>
        ))}
      </ol>
      {note && <p className="mt-3 text-xs leading-relaxed text-faint">{note}</p>}
    </Modal>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold">{children}</strong>;

function content(platform: InstallPlatform | null, ua: string) {
  if (platform === "ios") {
    const ipad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
    const otherBrowser = /CriOS|FxiOS|EdgiOS/i.test(ua);
    const where = otherBrowser
      ? "nella barra dell'indirizzo, in alto a destra"
      : ipad
        ? "in alto a destra, accanto all'indirizzo"
        : "nella barra in basso, al centro";
    return {
      title: "Installa su iPhone e iPad",
      description: "Su iOS l'installazione si fa dal menu Condividi. Bastano tre tocchi.",
      steps: [
        { icon: Share, text: <>Tocca <B>Condividi</B> {where}.</> },
        {
          icon: SquarePlus,
          text: (
            <>
              Scorri e scegli <B>Aggiungi alla schermata Home</B>. Se non la vedi, tocca <B>Altro</B> in fondo
              all&apos;elenco.
            </>
          ),
        },
        {
          icon: Check,
          text: (
            <>
              Lascia attivo <B>Apri come app web</B>, se compare, e tocca <B>Aggiungi</B> in alto a destra.
            </>
          ),
        },
      ] as Step[],
      note: "L'icona compare nella schermata Home. Aprila da lì: solo così funzionano anche le notifiche.",
    };
  }

  if (platform === "in-app-browser") {
    return {
      title: "Apri nel browser",
      description:
        "Stai usando il browser interno di un'altra app, che non permette di installare. Apri questa pagina in Chrome o Safari.",
      steps: [
        {
          icon: MoreVertical,
          text: (
            <>
              Tocca il menu <B>⋯</B> o <B>⋮</B> dell&apos;app in cui ti trovi.
            </>
          ),
        },
        {
          icon: ExternalLink,
          text: (
            <>
              Scegli <B>Apri nel browser</B> (o <B>Apri in Safari</B> / <B>Apri in Chrome</B>). In alternativa copia il
              link e incollalo nel browser.
            </>
          ),
        },
        { icon: Download, text: <>Dal browser, torna qui e tocca di nuovo <B>Installa l&apos;app</B>.</> },
      ] as Step[],
      note: null,
    };
  }

  // Android senza dialogo nativo (Firefox, o evento non ancora arrivato)
  // e, come ripiego, qualsiasi altro caso.
  return {
    title: "Installa su Android",
    description: "Il tuo browser non apre il dialogo da solo, ma l'installazione si fa dal suo menu.",
    steps: [
      {
        icon: MoreVertical,
        text: (
          <>
            Apri il menu <B>⋮</B> del browser: in alto a destra in Chrome, in basso in Firefox e Samsung Internet.
          </>
        ),
      },
      {
        icon: SquarePlus,
        text: (
          <>
            Tocca <B>Installa app</B> oppure <B>Aggiungi a schermata Home</B>.
          </>
        ),
      },
      { icon: Check, text: <>Conferma con <B>Installa</B>.</> },
    ] as Step[],
    note: "Non trovi la voce? Forse l'app è già installata: cercala nella schermata Home o nel cassetto delle app.",
  };
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      toast.success("Link copiato");
    } catch {
      toast.error("Copia non riuscita: tieni premuto sull'indirizzo e copialo a mano");
    }
  };
  return (
    <Button variant="primary" icon={copied ? Check : Copy} onClick={copy}>
      {copied ? "Copiato" : "Copia link"}
    </Button>
  );
}
