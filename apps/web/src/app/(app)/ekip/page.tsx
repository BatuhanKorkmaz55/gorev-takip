"use client";

import Link from "next/link";
import { useState } from "react";
import { ROLE_META, type Role, type UserWithStats } from "@gorev/shared";
import { Copy, Ellipsis, KeyRound, Pencil, RefreshCw, UserCheck, UserMinus, UserPlus, UserX } from "lucide-react";
import { useCreateUser, useRemoveUser, useUpdateUser, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { cn, randomPassword } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { MenuItem, Popover } from "@/components/Popover";
import { useToast } from "@/components/Toast";
import { Button, Field, IconButton, Input, Select, Spinner } from "@/components/ui";

type Editing = { mode: "create" } | { mode: "edit"; user: UserWithStats } | { mode: "password"; user: UserWithStats };

export default function TeamPage() {
  const me = useSession();
  const isAdmin = me.role === "ADMIN";
  const { data: users, isLoading } = useUsers();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<UserWithStats | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const update = useUpdateUser();
  const toast = useToast();

  const active = users?.filter((u) => u.active) ?? [];
  const inactive = users?.filter((u) => !u.active) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ekip</h1>
          <p className="text-sm text-zinc-500">{active.length} aktif kişi · kişiye tıklayarak işlerini gör</p>
        </div>
        {isAdmin && (
          <Button variant="primary" className="ml-auto" onClick={() => setEditing({ mode: "create" })}>
            <UserPlus className="size-4" /> Kişi ekle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((u) => (
              <MemberCard
                key={u.id}
                user={u}
                isMe={u.id === me.id}
                isAdmin={isAdmin}
                onEdit={() => setEditing({ mode: "edit", user: u })}
                onPassword={() => setEditing({ mode: "password", user: u })}
                onRemove={() => setRemoving(u)}
              />
            ))}
          </div>

          {inactive.length > 0 && (
            <div className="mt-8">
              <button type="button" onClick={() => setShowInactive(!showInactive)} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
                {showInactive ? "▾" : "▸"} Ekipten ayrılanlar ({inactive.length})
              </button>
              {showInactive && (
                <div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                  {inactive.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar user={u} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-700">{u.name}</p>
                        <p className="truncate text-xs text-zinc-500">{u.email}</p>
                      </div>
                      <Link href={`/gorevler?scope=all&assigneeId=${u.id}&status=all`} className="text-xs text-zinc-500 hover:text-zinc-800">
                        Geçmiş işleri
                      </Link>
                      {isAdmin && (
                        <Button
                          size="sm"
                          onClick={() =>
                            update.mutate(
                              { id: u.id, active: true },
                              { onSuccess: () => toast(`${u.name} yeniden aktif`), onError: (e) => toast(e.message, { tone: "error" }) },
                            )
                          }
                        >
                          <UserCheck className="size-4" /> Aktifleştir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editing?.mode === "create" && <UserFormModal onClose={() => setEditing(null)} />}
      {editing?.mode === "edit" && <UserFormModal user={editing.user} onClose={() => setEditing(null)} />}
      {editing?.mode === "password" && <ResetPasswordModal user={editing.user} onClose={() => setEditing(null)} />}
      {removing && <RemoveModal user={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function MemberCard({
  user,
  isMe,
  isAdmin,
  onEdit,
  onPassword,
  onRemove,
}: {
  user: UserWithStats;
  isMe: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onRemove: () => void;
}) {
  const s = user.stats;
  const total = s.open + s.done || 1;
  return (
    <div className="group relative rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition hover:border-zinc-300 hover:shadow-sm">
      <Link href={`/gorevler?scope=all&assigneeId=${user.id}`} className="absolute inset-0 rounded-xl" aria-label={`${user.name} görevleri`} />
      <div className="flex items-start gap-3">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-zinc-900">
            {user.name}
            {isMe && <span className="text-xs font-normal text-zinc-400">(sen)</span>}
          </p>
          <p className="truncate text-xs text-zinc-500">{user.title || user.email}</p>
          {user.role === "ADMIN" && (
            <span className="mt-1 inline-block rounded-md bg-accent-50 px-1.5 py-0.5 text-[11px] font-medium text-accent-700">{ROLE_META.ADMIN.label}</span>
          )}
        </div>
        {isAdmin && (
          <div className="relative z-10">
            <Popover
              align="end"
              trigger={({ toggle }) => (
                <IconButton label="İşlemler" onClick={toggle}>
                  <Ellipsis className="size-4" />
                </IconButton>
              )}
            >
              {(close) => (
                <>
                  <MenuItem
                    onClick={() => {
                      close();
                      onEdit();
                    }}
                  >
                    <Pencil className="size-4" /> Düzenle
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      close();
                      onPassword();
                    }}
                  >
                    <KeyRound className="size-4" /> Şifre sıfırla
                  </MenuItem>
                  {!isMe && (
                    <MenuItem
                      danger
                      onClick={() => {
                        close();
                        onRemove();
                      }}
                    >
                      <UserMinus className="size-4" /> Ekipten çıkar
                    </MenuItem>
                  )}
                </>
              )}
            </Popover>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Açık" value={s.open} />
        <MiniStat label="Devam" value={s.inProgress} className="text-blue-600" />
        <MiniStat label="Geciken" value={s.overdue} className={s.overdue ? "text-red-600" : undefined} />
        <MiniStat label="Biten" value={s.done} className="text-emerald-600" />
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-100" title="İş dağılımı">
        <span className="bg-blue-500" style={{ width: `${(s.inProgress / total) * 100}%` }} />
        <span className="bg-amber-400" style={{ width: `${(s.blocked / total) * 100}%` }} />
        <span className="bg-zinc-300" style={{ width: `${((s.open - s.inProgress - s.blocked) / total) * 100}%` }} />
        <span className="bg-emerald-500" style={{ width: `${(s.done / total) * 100}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className={cn("text-lg font-semibold tabular-nums text-zinc-900", className)}>{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function CredentialBox({ email, password }: { email: string; password: string }) {
  const toast = useToast();
  const text = `Görev Takip giriş bilgilerin:\nAdres: ${typeof window !== "undefined" ? location.origin : ""}\nE-posta: ${email}\nŞifre: ${password}`;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="font-medium">Hazır! Bu bilgileri kişiyle paylaş:</p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}</pre>
      </div>
      <Button
        className="w-full"
        onClick={() => {
          void navigator.clipboard?.writeText(text);
          toast("Giriş bilgileri kopyalandı");
        }}
      >
        <Copy className="size-4" /> Kopyala
      </Button>
      <p className="text-xs text-zinc-500">Kişi giriş yaptıktan sonra menüden kendi şifresini değiştirebilir.</p>
    </div>
  );
}

function UserFormModal({ user, onClose }: { user?: UserWithStats; onClose: () => void }) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "MEMBER");
  const [password, setPassword] = useState(() => (user ? "" : randomPassword()));
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (user) {
        await update.mutateAsync({ id: user.id, name, email, title: title || null, role });
        toast("Bilgiler güncellendi");
        onClose();
      } else {
        await create.mutateAsync({ name, email, title: title || null, role, password });
        setCreated({ email, password });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal open onClose={onClose} title={user ? "Kişiyi düzenle" : created ? "Kişi eklendi" : "Ekibe kişi ekle"}>
      {created ? (
        <CredentialBox {...created} />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Ad soyad">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </Field>
          <Field label="E-posta">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unvan / Birim" hint="İsteğe bağlı">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Muhasebe" />
            </Field>
            <Field label="Yetki">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full">
                <option value="MEMBER">{ROLE_META.MEMBER.label}</option>
                <option value="ADMIN">{ROLE_META.ADMIN.label}</option>
              </Select>
            </Field>
          </div>
          {!user && (
            <Field label="Geçici şifre" hint="Otomatik oluşturuldu; istersen değiştir.">
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" required minLength={6} />
                <IconButton label="Yeni şifre üret" onClick={() => setPassword(randomPassword())} className="size-9 border border-zinc-200">
                  <RefreshCw className="size-4" />
                </IconButton>
              </div>
            </Field>
          )}
          <p className="text-xs text-zinc-500">
            <b>Üye</b> görev ekler, atar ve günceller. <b>Yönetici</b> ayrıca ekibe kişi ekleyip çıkarabilir.
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
              {user ? "Kaydet" : "Ekle"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserWithStats; onClose: () => void }) {
  const update = useUpdateUser();
  const [password, setPassword] = useState(() => randomPassword());
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title={`${user.name} · şifre sıfırla`}>
      {done ? (
        <CredentialBox email={user.email} password={password} />
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await update.mutateAsync({ id: user.id, password });
              setDone(true);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <Field label="Yeni şifre">
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" minLength={6} required />
              <IconButton label="Yeni şifre üret" onClick={() => setPassword(randomPassword())} className="size-9 border border-zinc-200">
                <RefreshCw className="size-4" />
              </IconButton>
            </div>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Şifreyi değiştir
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
                const r = await remove.mutateAsync(user.id);
                toast(
                  `${user.name} ekipten çıkarıldı` + (r.unassigned ? ` · ${r.unassigned} açık görevin ataması kaldırıldı` : ""),
                );
                onClose();
              } catch (e) {
                toast(errorMessage(e), { tone: "error" });
              }
            }}
          >
            <UserX className="size-4" /> Ekipten çıkar
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm text-zinc-600">
        <p>
          <b>{user.name}</b> artık giriş yapamayacak ve görev atanacaklar listesinde görünmeyecek.
        </p>
        {user.stats.open > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            Üzerindeki <b>{user.stats.open} açık görevin</b> ataması kaldırılacak; bu görevleri başkasına atayabilirsin.
          </p>
        )}
        <p className="text-xs text-zinc-500">Geçmiş kayıtlar korunur. İstersen daha sonra yeniden aktifleştirebilirsin.</p>
      </div>
    </Modal>
  );
}
