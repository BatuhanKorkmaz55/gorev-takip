"use client";

import { useState } from "react";
import type { UserWithStats } from "@gorev/shared";
import { ChevronDown, Copy, RefreshCw } from "lucide-react";
import { useCreateUser, useRemoveUser, useResetPassword, useTasks, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { cn, randomPassword } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { TaskRow } from "@/components/TaskRow";
import { useToast } from "@/components/Toast";
import { Button, Card, ErrorBox, Field, Input, Spinner } from "@/components/ui";

export default function TeamPage() {
  const me = useSession();
  const isAdmin = me.role === "ADMIN";
  const { data: users, isLoading } = useUsers();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<UserWithStats | null>(null);
  const [removing, setRemoving] = useState<UserWithStats | null>(null);

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="flex-[1_1_220px] text-3xl font-bold text-ink">Ekip</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Kişi ekle
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <Card className="divide-y divide-line">
          {users?.map((u) => (
            <Person key={u.id} user={u} isMe={u.id === me.id} isAdmin={isAdmin} onReset={() => setResetting(u)} onRemove={() => setRemoving(u)} />
          ))}
        </Card>
      )}

      {adding && <AddModal onClose={() => setAdding(false)} />}
      {resetting && <ResetModal user={resetting} onClose={() => setResetting(null)} />}
      {removing && <RemoveModal user={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function Person({
  user,
  isMe,
  isAdmin,
  onReset,
  onRemove,
}: {
  user: UserWithStats;
  isMe: boolean;
  isAdmin: boolean;
  onReset: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: tasks, isLoading } = useTasks({ scope: "user", userId: user.id, status: "open" }, open);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-[1_1_260px] cursor-pointer items-center gap-3 text-left"
        >
          <Avatar user={user} size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold text-ink">
              {user.name}
              {isMe && <span className="text-base font-normal text-ink-muted"> (sen)</span>}
            </span>
            <span className="block text-[15px] text-ink-muted">
              {user.openCount ? `${user.openCount} açık görev` : "Açık görevi yok"}
              {user.role === "ADMIN" && " · Yönetici"}
            </span>
          </span>
          <ChevronDown className={cn("ml-auto size-5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" className="h-11" onClick={onReset}>
              Şifre sıfırla
            </Button>
            {!isMe && (
              <Button size="sm" variant="ghost" className="h-11 text-danger" onClick={onRemove}>
                Çıkar
              </Button>
            )}
          </div>
        )}
      </div>
      {open && (
        <div className="border-t border-line bg-paper">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !tasks?.length ? (
            <p className="px-5 py-4 text-base text-ink-muted">Açık görevi yok.</p>
          ) : (
            <div className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} show="from" status />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Credentials({ email, password }: { email: string; password: string }) {
  const toast = useToast();
  const text = `Görev Takip\nAdres: ${typeof window !== "undefined" ? location.origin : ""}\nE-posta: ${email}\nŞifre: ${password}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-ink">Bu bilgileri kişiyle paylaş:</p>
      <pre className="rounded-md bg-done p-4 font-sans text-base whitespace-pre-wrap text-ink">{text}</pre>
      <Button
        onClick={() => {
          void navigator.clipboard?.writeText(text);
          toast("Kopyalandı.");
        }}
      >
        <Copy className="size-5" aria-hidden="true" /> Kopyala
      </Button>
    </div>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Şifre">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} minLength={6} required />
        <Button onClick={() => onChange(randomPassword())}>
          <RefreshCw className="size-5" aria-hidden="true" /> Yenile
        </Button>
      </div>
    </Field>
  );
}

function AddModal({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState(false);
  const [password, setPassword] = useState(() => randomPassword());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name, email, password, role: admin ? "ADMIN" : "MEMBER" });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal open onClose={onClose} title={done ? "Kişi eklendi" : "Kişi ekle"}>
      {done ? (
        <Credentials email={email} password={password} />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Ad soyad">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </Field>
          <Field label="E-posta">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <PasswordField value={password} onChange={setPassword} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
            <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} className="size-5" />
            Yönetici olsun (kişi ekleyip çıkarabilir)
          </label>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={onClose}>Vazgeç</Button>
            <Button type="submit" variant="primary" loading={create.isPending}>
              Ekle
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ResetModal({ user, onClose }: { user: UserWithStats; onClose: () => void }) {
  const reset = useResetPassword();
  const [password, setPassword] = useState(() => randomPassword());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <Modal open onClose={onClose} title={`${user.name}: şifre sıfırla`}>
      {done ? (
        <Credentials email={user.email} password={password} />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await reset.mutateAsync({ id: user.id, password });
              setDone(true);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <PasswordField value={password} onChange={setPassword} />
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={onClose}>Vazgeç</Button>
            <Button type="submit" variant="primary" loading={reset.isPending}>
              Kaydet
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RemoveModal({ user, onClose }: { user: UserWithStats; onClose: () => void }) {
  const remove = useRemoveUser();
  const toast = useToast();
  return (
    <Modal
      open
      onClose={onClose}
      title="Ekipten çıkarılsın mı?"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={async () => {
              try {
                await remove.mutateAsync(user.id);
                toast(`${user.name} ekipten çıkarıldı.`);
                onClose();
              } catch (e) {
                toast(errorMessage(e), { tone: "error" });
              }
            }}
          >
            Çıkar
          </Button>
        </>
      }
    >
      <p className="text-base text-ink">
        <b>{user.name}</b> artık giriş yapamayacak.
        {user.openCount > 0 && ` ${user.openCount} açık görevi, görevi verenlere geri döner.`}
      </p>
    </Modal>
  );
}
