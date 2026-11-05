/**
 * Demo verisi. Çalıştırma: pnpm db:seed
 * Mevcut tüm görevleri ve kullanıcıları SİLER, örnek bir ekip ve görevler oluşturur.
 *
 * Demo hesaplar (hepsinin şifresi: demo1234)
 *   yonetici@ornek.com  (Yönetici)
 *   ayse@ornek.com, mehmet@ornek.com, zeynep@ornek.com, can@ornek.com  (Üye)
 */
import "../src/lib/env";
import { addDaysKey, AVATAR_COLORS } from "@gorev/shared";
import type { ActivityType, Priority, TaskStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { keyToDate, todayKey } from "../src/lib/dates";

const DEMO_PASSWORD = "demo1234";

async function main() {
  await prisma.activity.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "tasks_number_seq" RESTART WITH 1`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const people = [
    { name: "Muhammed Bayındır", email: "yonetici@ornek.com", role: "ADMIN" as const, title: "Proje Yöneticisi" },
    { name: "Ayşe Yılmaz", email: "ayse@ornek.com", role: "MEMBER" as const, title: "Tasarım" },
    { name: "Mehmet Demir", email: "mehmet@ornek.com", role: "MEMBER" as const, title: "Yazılım" },
    { name: "Zeynep Kaya", email: "zeynep@ornek.com", role: "MEMBER" as const, title: "Satış" },
    { name: "Can Öztürk", email: "can@ornek.com", role: "MEMBER" as const, title: "Muhasebe" },
  ];
  const users = [];
  for (const [i, p] of people.entries()) {
    users.push(await prisma.user.create({ data: { ...p, passwordHash, color: AVATAR_COLORS[i] } }));
  }
  const [admin, ayse, mehmet, zeynep, can] = users;
  const today = todayKey();
  const ago = (h: number) => new Date(Date.now() - h * 3600_000);

  type Seed = {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    creator: (typeof users)[number];
    assignee?: (typeof users)[number];
    due?: number;
    tags?: string[];
    progress?: number;
    checklist?: [string, boolean][];
    createdHoursAgo: number;
    log?: { by: (typeof users)[number]; type: ActivityType; message?: string; meta?: object; hoursAgo: number }[];
  };

  const seeds: Seed[] = [
    {
      title: "Yeni web sitesi ana sayfa tasarımı",
      description: "Kurumsal kimliğe uygun, mobil uyumlu ana sayfa taslağı. Figma'da 2 alternatif hazırlanacak.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      creator: admin,
      assignee: ayse,
      due: 2,
      tags: ["web", "tasarım"],
      progress: 60,
      checklist: [
        ["Rakip analizi", true],
        ["Renk paleti ve tipografi", true],
        ["Masaüstü taslak", true],
        ["Mobil taslak", false],
        ["Sunum", false],
      ],
      createdHoursAgo: 72,
      log: [
        { by: ayse, type: "STATUS", meta: { from: "TODO", to: "IN_PROGRESS", fromLabel: "Yapılacak", toLabel: "Devam ediyor" }, message: "Rakip analiziyle başladım.", hoursAgo: 60 },
        { by: ayse, type: "PROGRESS", meta: { from: 0, to: 60 }, message: "Masaüstü taslak bitti, mobil tarafa geçiyorum.", hoursAgo: 5 },
      ],
    },
    {
      title: "Müşteri X için teklif dosyası",
      status: "TODO",
      priority: "URGENT",
      creator: zeynep,
      assignee: zeynep,
      due: 0,
      tags: ["satış"],
      createdHoursAgo: 20,
    },
    {
      title: "Ekim ayı faturalarının kontrolü",
      status: "DONE",
      priority: "NORMAL",
      creator: admin,
      assignee: can,
      due: -2,
      tags: ["muhasebe"],
      progress: 100,
      createdHoursAgo: 120,
      log: [
        { by: can, type: "STATUS", meta: { from: "TODO", to: "IN_PROGRESS", fromLabel: "Yapılacak", toLabel: "Devam ediyor" }, hoursAgo: 90 },
        { by: can, type: "STATUS", meta: { from: "IN_PROGRESS", to: "DONE", fromLabel: "Devam ediyor", toLabel: "Tamamlandı" }, message: "Tüm faturalar kontrol edildi, 2 hatalı fatura iade edildi.", hoursAgo: 26 },
      ],
    },
    {
      title: "Sunucu yedekleme betiğini düzelt",
      description: "Gece yedeği son 3 gündür hata veriyor. Log dosyası /var/log/backup.log",
      status: "BLOCKED",
      priority: "HIGH",
      creator: admin,
      assignee: mehmet,
      due: -1,
      tags: ["altyapı"],
      progress: 30,
      createdHoursAgo: 50,
      log: [
        { by: mehmet, type: "STATUS", meta: { from: "TODO", to: "IN_PROGRESS", fromLabel: "Yapılacak", toLabel: "Devam ediyor" }, hoursAgo: 40 },
        { by: mehmet, type: "STATUS", meta: { from: "IN_PROGRESS", to: "BLOCKED", fromLabel: "Devam ediyor", toLabel: "Beklemede" }, message: "Hosting firmasından disk erişim yetkisi bekleniyor.", hoursAgo: 8 },
      ],
    },
    {
      title: "Mobil uygulama giriş ekranı hatası",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      creator: ayse,
      assignee: mehmet,
      due: 4,
      tags: ["mobil", "hata"],
      progress: 40,
      createdHoursAgo: 30,
      log: [{ by: mehmet, type: "COMMENT", message: "Hatayı yeniden üretebildim, Android 14'te oluyor.", hoursAgo: 3 }],
    },
    {
      title: "Bayi toplantısı sunumu",
      status: "TODO",
      priority: "NORMAL",
      creator: zeynep,
      assignee: ayse,
      due: 6,
      tags: ["satış", "sunum"],
      createdHoursAgo: 10,
    },
    {
      title: "Çeyrek bütçe raporu",
      status: "TODO",
      priority: "HIGH",
      creator: admin,
      assignee: can,
      due: 9,
      tags: ["muhasebe", "rapor"],
      checklist: [
        ["Gider kalemlerini topla", false],
        ["Gelir tablosu", false],
      ],
      createdHoursAgo: 6,
    },
    {
      title: "Ekip içi eğitim planı",
      status: "TODO",
      priority: "LOW",
      creator: admin,
      due: 14,
      tags: ["ik"],
      createdHoursAgo: 4,
    },
    {
      title: "Sosyal medya kasım içerik takvimi",
      status: "DONE",
      priority: "NORMAL",
      creator: zeynep,
      assignee: ayse,
      tags: ["pazarlama"],
      progress: 100,
      createdHoursAgo: 96,
      log: [
        { by: ayse, type: "STATUS", meta: { from: "TODO", to: "DONE", fromLabel: "Yapılacak", toLabel: "Tamamlandı" }, message: "Takvim paylaşıldı, onay bekleniyor.", hoursAgo: 12 },
      ],
    },
    {
      title: "Ofis internet hattı yenileme",
      status: "TODO",
      priority: "NORMAL",
      creator: can,
      assignee: admin,
      due: 3,
      tags: ["ofis"],
      createdHoursAgo: 15,
    },
    {
      title: "API dokümantasyonunu güncelle",
      status: "IN_PROGRESS",
      priority: "LOW",
      creator: mehmet,
      assignee: mehmet,
      tags: ["yazılım"],
      progress: 20,
      createdHoursAgo: 48,
    },
  ];

  for (const s of seeds) {
    const status = s.status;
    const lastLog = s.log?.length ? Math.min(...s.log.map((l) => l.hoursAgo)) : s.createdHoursAgo;
    const task = await prisma.task.create({
      data: {
        title: s.title,
        description: s.description ?? null,
        status,
        priority: s.priority,
        progress: s.progress ?? 0,
        dueDate: s.due !== undefined ? keyToDate(addDaysKey(today, s.due)) : null,
        tags: s.tags ?? [],
        creatorId: s.creator.id,
        assigneeId: s.assignee?.id ?? null,
        completedAt: status === "DONE" ? ago(lastLog) : null,
        createdAt: ago(s.createdHoursAgo),
        checklist: s.checklist
          ? { create: s.checklist.map(([text, done], i) => ({ text, done, position: i })) }
          : undefined,
      },
    });
    await prisma.activity.create({
      data: {
        taskId: task.id,
        userId: s.creator.id,
        type: "CREATED",
        meta: s.assignee ? { assigneeId: s.assignee.id, assigneeName: s.assignee.name } : undefined,
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
          meta: l.meta,
          createdAt: ago(l.hoursAgo),
        },
      });
    }
  }

  console.log(`✔ ${users.length} kullanıcı ve ${seeds.length} görev oluşturuldu.`);
  console.log(`  Giriş: yonetici@ornek.com / şifre seed dosyasında (prisma/seed.ts)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
