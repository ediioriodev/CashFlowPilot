"use client";

import React, { useState } from "react";
import { Modal, Button } from "./kit";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

/**
 * Prima chiamava onConfirm() e onClose() in sequenza sincrona: il modale
 * spariva mentre la chiamata era ancora in volo e il pulsante non aveva
 * stato di caricamento. Ora si chiude solo a operazione conclusa.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Conferma",
  cancelText = "Annulla",
  isDestructive = false,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={message}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button variant={isDestructive ? "danger" : "primary"} loading={busy} onClick={run}>
            {confirmText}
          </Button>
        </>
      }
    />
  );
}
