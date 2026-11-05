"use client";

import Link from "next/link";
import { useState } from "react";
import { ROLE_META, type Role, type UserWithStats } from "@gorev/shared";
import { ChevronDown, Copy, KeyRound, Pencil, RefreshCw, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { useCreateUser, useRemoveUser, useUpdateUser, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { cn, randomPassword } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { MenuItem, Popover } from "@/components/Popover";
import { useToast } from "@/components/Toast";
import { Button, ErrorBox, Field, Input, Select, Spinner } from "@/components/ui";

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
    <div className="mx-auto flex max-w-[1104px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-[1_1_240px]">
          <h1 className="text-3xl font-bold text-ink">Ekip</h1>
          <p className="text-base text-ink-muted">{active.length} kişi çalışıyor. Bir kişinin işlerini görmek için adına tıkla.</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setEditing({ mode: "create" })}>
            <UserPlus className="size-5" aria-hidden="true" /> Ekibe kişi ekle
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <div>
              <Button variant="ghost" onClick={() => setShowInactive(!showInactive)} aria-expanded={showInactive}>
                <ChevronDown className={`size-5 transition-transform ${showInactive ? "" : "-rotate-90"}`} aria-hidden="true" />
                Ekipten ayrılanlar ({inactive.length})
              </Button>
              {showInactive && (
                <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                  {inactive.map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Avatar user={u} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-ink">{u.name}</p>
                        <p className="truncate text-sm text-ink-muted">{u.email}</p>
                      </div>
                      <Link href={`/gorevler?scope=all&assigneeId=${u.id}&status=all`} className="flex min-h-11 items-center text-base font-semibold text-accent hover:underline">
                        Geçmiş işlerini gör
                      </Link>
                      {isAdmin && (
                        <Button
                          onClick={() =>
                            update.mutate(
                              { id: u.id, active: true },
                              { onSuccess: () => toast(`${u.name} ekibe geri eklendi.`), onError: (e) => toast(e.message, { tone: "error" }) },
                            )
                          }
                        >
                          <UserCheck className="size-5" aria-hidden="true" /> Yeniden ekle
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
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/gorevler?scope=all&assigneeId=${user.id}`} className="block truncate text-lg font-bold text-ink hover:underline">
            {user.name}
            {isMe && <span className="text-base font-normal text-ink-muted"> (sen)</span>}
          </Link>
          <p className="truncate text-sm text-ink-muted">{user.title || user.email}</p>
          {user.role === "ADMIN" && (
            <span className="mt-1.5 inline-block rounded-sm bg-accent-soft px-2 py-0.5 text-sm font-semibold text-ink">{ROLE_META.ADMIN.label}</span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <MiniStat label="Açık iş" value={s.open} />
        <MiniStat label="Devam eden" value={s.inProgress} className="text-progress-ink" />
        <MiniStat label="Geciken" value={s.overdue} className={s.overdue ? "text-danger" : undefined} />
        <MiniStat label="Biten" value={s.done} className="text-done-ink" />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/gorevler?scope=all&assigneeId=${user.id}`} className="flex min-h-11 flex-1 items-center text-base font-semibold text-accent hover:underline">
          İşlerini gör
        </Link>
        {isAdmin && (
          <Popover
            align="end"
            trigger={({ toggle }) => (
              <Button size="sm" className="h-11" onClick={toggle}>
                İşlemler <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
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
                  <Pencil className="size-5" aria-hidden="true" /> Bilgilerini düzenle
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    close();
                    onPassword();
                  }}
                >
                  <KeyRound className="size-5" aria-hidden="true" /> Şifresini sıfırla
                </MenuItem>
                {!isMe && (
                  <MenuItem
                    danger
                    onClick={() => {
                      close();
                      onRemove();
                    }}
                  >
                    <UserMinus className="size-5" aria-hidden="true" /> Ekipten çıkar
                  </MenuItem>
                )}
              </>
            )}
          </Popover>
        )}
      </div>
    </article>
  );
}

function MiniStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={cn("text-xl font-bold text-ink tabular-nums", className)}>{value}</dd>
    </div>
  );
}

function CredentialBox({ email, password }: { email: string; password: string }) {
  const toast = useToast();
  const text = `Görev Takip giriş bilgilerin:\nAdres: ${typeof window !== "undefined" ? location.origin : ""}\nE-posta: ${email}\nŞifre: ${password}`;
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-done p-4 text-base text-done-ink">
        <p className="font-semibold">Hazır. Bu bilgileri kişiyle paylaş:</p>
        <pre className="mt-2 font-sans text-base whitespace-pre-wrap text-ink">{text}</pre>
      </div>
      <Button
        className="w-full"
        onClick={() => {
          void navigator.clipboard?.writeText(text);
          toast("Giriş bilgileri kopyalandı.");
        }}
      >
        <Copy className="size-5" aria-hidden="true" /> Bilgileri kopyala
      </Button>
      <p className="text-sm text-ink-muted">Kişi giriş yaptıktan sonra menüden kendi şifresini değiştirebilir.</p>
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
        toast("Bilgiler kaydedildi.");
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
        <form onSubmit={submit} className="space-y-4">
          <Field label="Ad soyad">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </Field>
          <Field label="E-posta">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
                <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <Button onClick={() => setPassword(randomPassword())}>
                  <RefreshCw className="size-5" aria-hidden="true" /> Yenile
                </Button>
              </div>
            </Field>
          )}
          <p className="text-sm text-ink-muted">
            <b className="text-ink">Üye</b> görev ekler, verir ve günceller. <b className="text-ink">Yönetici</b> ayrıca ekibe kişi ekleyip çıkarabilir.
          </p>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button type="button" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
              {user ? "Değişiklikleri kaydet" : "Kişiyi ekle"}
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
    <Modal open onClose={onClose} title={`${user.name}: şifre sıfırla`}>
      {done ? (
        <CredentialBox email={user.email} password={password} />
      ) : (
        <form
          className="space-y-4"
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
              <Input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              <Button onClick={() => setPassword(randomPassword())}>
                <RefreshCw className="size-5" aria-hidden="true" /> Yenile
              </Button>
            </div>
          </Field>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex flex-wrap justify-end gap-3">
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
                  `${user.name} ekipten çıkarıldı.` + (r.unassigned ? ` ${r.unassigned} açık görevi artık kimsede değil.` : ""),
                );
                onClose();
              } catch (e) {
                toast(errorMessage(e), { tone: "error" });
              }
            }}
          >
            Evet, ekipten çıkar
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-base text-ink">
        <p>
          <b>{user.name}</b> artık giriş yapamayacak ve görev atanacaklar listesinde görünmeyecek.
        </p>
        {user.stats.open > 0 && (
          <p className="rounded-md bg-blocked px-3.5 py-2.5 text-blocked-ink">
            Üzerindeki <b>{user.stats.open} açık görev</b> kimseye verilmemiş olarak kalacak; bunları başkasına verebilirsin.
          </p>
        )}
        <p className="text-sm text-ink-muted">Geçmiş kayıtlar korunur. İstersen daha sonra ekibe geri ekleyebilirsin.</p>
      </div>
    </Modal>
  );
}
