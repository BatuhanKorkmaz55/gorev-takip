"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { UserLite } from "@gorev/shared";
import { api, errorMessage } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";
import { AuthCard } from "../AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // İlk kurulum gerekiyorsa veya zaten giriş yapılmışsa yönlendir
    api
      .get<{ needsSetup: boolean }>("/auth/setup")
      .then((r) => r.needsSetup && router.replace("/kurulum"))
      .catch(() => {});
    api
      .get<{ user: UserLite }>("/auth/me")
      .then(() => router.replace("/"))
      .catch(() => {});
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api.post<{ user: UserLite }>("/auth/login", { email, password });
      qc.clear();
      qc.setQueryData(["me"], r.user);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Giriş yap" subtitle="Ekibinin işlerini takip etmeye devam et.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
        </Field>
        <Field label="Şifre">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Giriş yap
        </Button>
        <p className="text-center text-xs text-zinc-500">Hesabın yoksa ekip yöneticinden seni eklemesini iste.</p>
      </form>
    </AuthCard>
  );
}
