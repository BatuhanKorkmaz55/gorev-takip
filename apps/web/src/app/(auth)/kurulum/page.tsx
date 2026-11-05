"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { UserLite } from "@gorev/shared";
import { api, errorMessage } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";
import { AuthCard } from "../AuthCard";

export default function SetupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ needsSetup: boolean }>("/auth/setup")
      .then((r) => !r.needsSetup && router.replace("/giris"))
      .catch(() => {});
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api.post<{ user: UserLite }>("/auth/setup", { name, email, password });
      qc.setQueryData(["me"], r.user);
      router.replace("/ekip");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Hoş geldin! 👋" subtitle="İlk kurulum: yönetici hesabını oluştur. Sonra ekip arkadaşlarını ekleyebilirsin.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ad soyad">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Şifre" hint="En az 6 karakter">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Hesabı oluştur ve başla
        </Button>
      </form>
    </AuthCard>
  );
}
