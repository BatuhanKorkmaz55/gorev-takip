"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Modal } from "./Modal";
import { Button, Field, Input } from "./ui";
import { useToast } from "./Toast";

export function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password", { currentPassword, newPassword });
      toast("Şifren güncellendi");
      setCurrent("");
      setNew("");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Şifremi değiştir">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Mevcut şifre">
          <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
        </Field>
        <Field label="Yeni şifre" hint="En az 6 karakter">
          <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
