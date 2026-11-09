# Görev Takip

Ekip için **sade** iş takibi. Üç iş var, o kadar: **görev ver, görevi yap, tamamla.**

Arayüz okunurluk için tasarlandı: Atkinson Hyperlegible Next yazı tipi, 16px metin, en az 4.5:1 kontrast, en az 44px düğmeler. Varsayılan koyu tema; açık tema kullanıcı menüsünden seçilir. Durumlar yazıyla, tarihler kelimeyle ("Bugün", "Yarın", "2 gün gecikti") gösterilir. Tasarım kuralları: [docs/TASARIM.md](docs/TASARIM.md).

**Monorepo:** Next.js 16 (web) · Node.js + Express 5 (API) · PostgreSQL + Prisma · pnpm workspaces

```
apps/
  api/        Express API, Prisma şeması, migration'lar, demo verisi
  web/        Next.js arayüzü (App Router, Tailwind 4, TanStack Query)
packages/
  shared/     Ortak tipler, doğrulama şemaları (zod), yetki kuralları, tarih metinleri
docs/
  TASARIM.md  Tasarım sistemi: ilkeler, renkler, yazı ölçeği, bileşen kuralları
```

## Nasıl çalışır?

- **Görev ver:** "Ne yapılacak?", "Kime?" (varsayılan: Ben) ve isteğe bağlı "Ne zamana?" seç, "Ekle"ye bas.
- **Durumlar:** Yapılacak · Devam ediyor · Tamamlandı. Görevi yapan kişi satırdaki **Başla**, **Tamamla** ya da **Geri al** düğmesine basar. Tamamladıktan sonra bildirimdeki "Geri al" ile vazgeçilebilir.
- **Sayfalar:**
  - **Görevlerim:** bana verilenler.
  - **Verdiğim görevler:** başkasına verdiklerim; durumu yalnızca görürüm.
  - **Ekip:** kişiler ve açık görev sayıları; bir kişiye tıklayınca görevleri açılır.
  - Görevlerim ve Verdiğim görevler, **Liste** ya da **Pano** olarak görülebilir.
- **Görev detayı:** kim verdi, kim yapıyor, son tarih, açıklama, **Not ekle** ve geçmiş (kim, ne zaman, ne yaptı).
- **Yetkiler** (API'de zorunlu, [`permissions.ts`](packages/shared/src/permissions.ts)):
  - Durumu **yalnızca görevi yapan kişi** değiştirir; görevi veren de, yönetici de değiştiremez.
  - Görevi düzenlemek ve silmek: görevi veren kişi ya da yönetici.
  - Not eklemek: görevi yapan, veren ya da yönetici.
  - Kişi eklemek, şifre sıfırlamak ve kişiyi çıkarmak: yönetici. Çıkarılan kişinin açık görevleri görevi verenlere geri döner. Aynı e-posta tekrar eklenirse hesap yeniden açılır.

## Kurulum

Gereksinimler: Node.js 22+, pnpm 10+, PostgreSQL 15+.

```bash
# 1) Veritabanı (Docker ile) — yerel PostgreSQL kullanıyorsanız bu adımı atlayın
pnpm db:up

# 2) Ortam değişkenleri
cp apps/api/.env.example apps/api/.env       # DATABASE_URL ve JWT_SECRET'ı düzenleyin
cp apps/web/.env.example apps/web/.env.local

# 3) Bağımlılıklar + tablolar + demo verisi
pnpm bootstrap

# 4) Geliştirme sunucuları (API :4000, Web :3000)
pnpm dev
```

Tarayıcıda http://localhost:3000 açın.

- **Demo verisiyle:** `pnpm db:seed` örnek bir ekip ve görevler oluşturur. Demo hesapları ve şifresi `apps/api/prisma/seed.ts` dosyasının başında yazılı. ⚠️ Seed mevcut tüm verileri siler.
- **Boş veritabanıyla:** Hiç kullanıcı yoksa giriş sayfası sizi **İlk kurulum** ekranına yönlendirir; orada yönetici hesabını oluşturup ekibi eklersiniz.

### macOS'ta Homebrew PostgreSQL ile

Docker kullanmıyorsan Homebrew'in PostgreSQL'ini ayrı bir portta (5434) çalıştırabilirsin; `.env.example` bu portu bekler:

```bash
LC_ALL=en_US.UTF-8 /opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /opt/homebrew/var/postgresql@17 -o "-p 5434" -l /opt/homebrew/var/log/postgresql@17.log start
```

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | API ve web'i birlikte başlatır |
| `pnpm build` / `pnpm start` | Üretim derlemesi / çalıştırma |
| `pnpm db:migrate` | Şema değişikliğinden sonra yeni migration oluşturur |
| `pnpm db:deploy` | Migration'ları uygular (üretim) |
| `pnpm db:seed` | Demo verisini yükler (mevcut veriyi siler) |
| `pnpm db:studio` | Prisma Studio ile veritabanını görüntüler |
| `pnpm typecheck` | Tüm paketlerde TypeScript kontrolü |
| `pnpm test` | Yetki kuralı ve tarih testleri |

## Mimari notlar

- Tarayıcı yalnızca web sunucusuyla konuşur; Next.js `/api/*` isteklerini `API_URL`'e iletir (`apps/web/next.config.ts`). Böylece oturum çerezi aynı kökende kalır, CORS gerekmez.
- Oturum: `httpOnly` JWT çerezi (30 gün). Her istekte kullanıcı veritabanından okunur; pasife alınan kişinin oturumu hemen düşer.
- Durum değiştiren isteklerde `application/json` zorunlu (basit CSRF koruması); girişte deneme sınırı var.
- Görev işlemleri `apps/api/src/lib/taskService.ts` içinde tek noktadan yapılır ve her biri önce yetki kuralını kontrol eder; değişiklikler geçmişe kayıt olarak düşer.
- Açılır menüler ve pencereler sayfanın en üst katmanında (portal) açılır; kartların ya da panellerin altında kalmaz, ekrana sığmazsa yukarı açılır.
- "Bugün" ve "gecikti" hesapları `APP_TZ` (varsayılan `Europe/Istanbul`) saat dilimine göre yapılır.

## Üretime alırken

- `JWT_SECRET` için uzun rastgele bir değer verin (`openssl rand -hex 32`); `NODE_ENV=production` iken çerez yalnızca HTTPS üzerinden gönderilir.
- `pnpm build && pnpm db:deploy && pnpm start`. Web için `API_URL`, API için `DATABASE_URL`, `WEB_ORIGIN`, `APP_TZ` ayarlayın.
