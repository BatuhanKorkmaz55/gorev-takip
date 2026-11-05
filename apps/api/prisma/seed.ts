/**
 * Demo verisi. Çalıştırma: pnpm db:seed
 * Mevcut tüm görevleri ve kullanıcıları SİLER, örnek bir ekip ve görevler oluşturur.
 *
 * Demo hesaplar (hepsinin şifresi: demo1234)
 *   yonetici@ornek.com  (Yönetici)
 *   ayse@ornek.com, mehmet@ornek.com, zeynep@ornek.com, can@ornek.com  (Üye)
 */
import "../src/lib/env";
import { AVATAR_COLORS, STATUS_META, addDaysKey } from "@gorev/shared";
import type { ActivityType, TaskStatus, User } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { keyToDate, todayKey } from "../src/lib/dates";

const DEMO_PASSWORD = "demo1234";

async function main() {
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "tasks_number_seq" RESTART WITH 1`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const people = [
    { name: "Selin Aksoy", email: "yonetici@ornek.com", role: "ADMIN" as const },
    { name: "Ayşe Yılmaz", email: "ayse@ornek.com", role: "MEMBER" as const },
    { name: "Mehmet Demir", email: "mehmet@ornek.com", role: "MEMBER" as const },
    { name: "Zeynep Kaya", email: "zeynep@ornek.com", role: "MEMBER" as const },
    { name: "Can Öztürk", email: "can@ornek.com", role: "MEMBER" as const },
  ];
  const users: User[] = [];
  for (const [i, p] of people.entries()) {
    users.push(await prisma.user.create({ data: { ...p, passwordHash, color: AVATAR_COLORS[i] } }));
  }
  const [selin, ayse, mehmet, zeynep, can] = users;
  const today = todayKey();
  const ago = (h: number) => new Date(Date.now() - h * 3600_000);

  type Log = { by: User; type: ActivityType; message?: string; to?: TaskStatus; hoursAgo: number };
  type Seed = {
    title: string;
    description?: string;
    status: TaskStatus;
    from: User;
    to: User;
    due?: number;
    createdHoursAgo: number;
    log?: Log[];
  };

  const seeds: Seed[] = [
    { title: "Müşteri X için teklif dosyası", status: "TODO", from: zeynep, to: selin, due: 0, createdHoursAgo: 20 },
    { title: "Ofis internet hattı yenileme", status: "TODO", from: can, to: selin, due: 3, createdHoursAgo: 15 },
    {
      title: "Bayi sözleşmesini gözden geçir",
      description: "3. madde (ödeme vadesi) bayiyle konuşulup netleşecek.",
      status: "IN_PROGRESS",
      from: selin,
      to: selin,
      due: -2,
      createdHoursAgo: 96,
      log: [{ by: selin, type: "STATUS", to: "IN_PROGRESS", message: "Bayiyle görüştüm, 3. maddeyi revize edip gönderecekler.", hoursAgo: 24 }],
    },
    {
      title: "Yeni web sitesi ana sayfa tasarımı",
      description: "Kurumsal kimliğe uygun, mobil uyumlu ana sayfa taslağı.",
      status: "IN_PROGRESS",
      from: selin,
      to: ayse,
      due: 2,
      createdHoursAgo: 72,
      log: [{ by: ayse, type: "STATUS", to: "IN_PROGRESS", message: "Masaüstü taslak bitti, mobil tarafa geçiyorum.", hoursAgo: 5 }],
    },
    {
      title: "Sunucu yedekleme betiğini düzelt",
      description: "Gece yedeği son 3 gündür hata veriyor.",
      status: "IN_PROGRESS",
      from: selin,
      to: mehmet,
      due: -1,
      createdHoursAgo: 50,
      log: [
        { by: mehmet, type: "STATUS", to: "IN_PROGRESS", hoursAgo: 40 },
        { by: mehmet, type: "COMMENT", message: "Hosting firmasından disk erişim yetkisi bekliyorum.", hoursAgo: 8 },
      ],
    },
    { title: "Çeyrek bütçe raporu", status: "TODO", from: selin, to: can, due: 9, createdHoursAgo: 6 },
    { title: "Bayi toplantısı sunumu", status: "TODO", from: zeynep, to: ayse, due: 6, createdHoursAgo: 10 },
    {
      title: "Ekim ayı faturalarının kontrolü",
      status: "DONE",
      from: selin,
      to: can,
      due: -2,
      createdHoursAgo: 120,
      log: [{ by: can, type: "STATUS", to: "DONE", message: "Tüm faturalar kontrol edildi, 2 hatalı fatura iade edildi.", hoursAgo: 26 }],
    },
    {
      title: "Sosyal medya kasım içerik takvimi",
      status: "DONE",
      from: zeynep,
      to: ayse,
      createdHoursAgo: 96,
      log: [{ by: ayse, type: "STATUS", to: "DONE", message: "Takvim paylaşıldı.", hoursAgo: 12 }],
    },
    {
      title: "Müşteri listesini güncelle",
      status: "DONE",
      from: selin,
      to: selin,
      createdHoursAgo: 60,
      log: [{ by: selin, type: "STATUS", to: "DONE", hoursAgo: 30 }],
    },
  ];

  for (const s of seeds) {
    const lastDone = s.log?.find((l) => l.to === "DONE");
    const task = await prisma.task.create({
      data: {
        title: s.title,
        description: s.description ?? null,
        status: s.status,
        dueDate: s.due !== undefined ? keyToDate(addDaysKey(today, s.due)) : null,
        creatorId: s.from.id,
        assigneeId: s.to.id,
        completedAt: lastDone ? ago(lastDone.hoursAgo) : null,
        createdAt: ago(s.createdHoursAgo),
      },
    });
    await prisma.activity.create({
      data: {
        taskId: task.id,
        userId: s.from.id,
        type: "CREATED",
        meta: { assigneeId: s.to.id, assigneeName: s.to.name },
        createdAt: ago(s.createdHoursAgo),
      },
    });
    for (const l of s.log ?? []) {
      await prisma.activity.create({
        data: {
          taskId: task.id,
          userId: l.by.id,
          type: l.type,
          message: l.message ?? null,
          meta: l.to ? { to: l.to, toLabel: STATUS_META[l.to].label } : undefined,
          createdAt: ago(l.hoursAgo),
        },
      });
    }
  }

  console.log(`✔ ${users.length} kişi ve ${seeds.length} görev oluşturuldu.`);
  console.log(`  Giriş bilgileri: prisma/seed.ts dosyasının başında`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
