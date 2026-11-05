# Görev Takip

Ekip için **basit ve hızlı** iş takibi. Görevini tek satırda yaz, Enter'a bas; kime, ne zaman, ne kadar acil olduğunu aynı satırda belirt. Her durum değişikliği ve not, görevin geçmişine otomatik düşer.

**Monorepo:** Next.js 16 (web) · Node.js + Express 5 (API) · PostgreSQL + Prisma · pnpm workspaces

```
apps/
  api/        Express API, Prisma şeması, migration'lar, demo verisi
  web/        Next.js arayüzü (App Router, Tailwind 4, TanStack Query)
packages/
  shared/     Ortak tipler, doğrulama şemaları (zod), hızlı giriş ayrıştırıcısı
```

## Özellikler

- **Tek satırda görev:** `Teklifi hazırla @ayşe yarın !acil #satış`
  - `@isim` kişiye ata (`@ben`, `@kimse`) — yazarken kişi önerisi çıkar
  - `bugün`, `yarın`, `cuma`, `haftaya`, `20.11`, `+3` → bitiş tarihi
  - `!acil` `!yüksek` `!düşük` (ya da `!!!` / `!!`) → öncelik
  - `#etiket` → etiket (mevcut etiketler önerilir)
  - Kişi yazmazsan görev sana atanır. Sözdizimini bilmeyenler için kutunun altında tıklanabilir **Kişi / Tarih / Öncelik / Etiket** düğmeleri var.
- **Durumlar:** Yapılacak · Devam ediyor · Beklemede · Tamamlandı · İptal. Listede yuvarlağa tek tıkla tamamla.
- **Güncelleme notu:** Görevi açıp "Ne yaptın?" kutusuna yaz, istersen aynı anda durumu da değiştir. Not, durum değişikliğinin açıklaması olarak geçmişe düşer.
- **Otomatik geçmiş:** Atama, öncelik, tarih, ilerleme, başlık, etiket, alt adım değişiklikleri kim/ne zaman bilgisiyle kaydedilir.
- **Alt adımlar (kontrol listesi), ilerleme yüzdesi, açıklama, etiketler.**
- **Panom:** açık/devam eden/geciken/bu hafta bitirdiğim sayıları, tarihe göre gruplanmış işlerim, başkalarına atadığım işler, ekipteki son hareketler.
- **Görevler:** Bana atanan / Atadıklarım / Oluşturduklarım / Tümü; arama, durum-kişi-öncelik-tarih filtreleri; duruma, kişiye, tarihe veya önceliğe göre gruplama. Filtreler adres çubuğunda tutulur, bağlantıyla paylaşılabilir.
- **Pano (Kanban):** kartları sürükleyip bırakarak durum değiştir.
- **Ekip:** her kişinin iş yükü (açık, devam, geciken, biten). Yönetici kişi ekler (geçici şifre otomatik üretilir ve paylaşmak için kopyalanır), düzenler, şifre sıfırlar, ekipten çıkarır. Çıkarılan kişinin açık görevlerinin ataması kaldırılır, geçmişi korunur; istenirse yeniden aktifleştirilir.
- **Kısayollar:** `N` yeni görev, `Esc` paneli kapat, `⌘/Ctrl + Enter` notu gönder.
- **Yetkiler:** Herkes görev ekler, atar, günceller. Görevi yalnızca oluşturan veya yönetici siler. Ekip yönetimi yalnızca yöneticide.
- Mobil uyumlu (alt gezinme çubuğu). Veriler 20 saniyede bir ve sekmeye dönünce tazelenir.

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

### Bu makinede (Homebrew PostgreSQL)

Geliştirme sırasında Homebrew'in PostgreSQL 17'si 5434 portunda çalıştırıldı (makinedeki diğer PostgreSQL kurulumlarıyla çakışmasın diye). Bilgisayar yeniden başladıktan sonra tekrar başlatmak için:

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
| `pnpm test` | Hızlı giriş ayrıştırıcısı testleri |

## Mimari notlar

- Tarayıcı yalnızca web sunucusuyla konuşur; Next.js `/api/*` isteklerini `API_URL`'e iletir (`apps/web/next.config.ts`). Böylece oturum çerezi aynı kökende kalır, CORS gerekmez.
- Oturum: `httpOnly` JWT çerezi (30 gün). Her istekte kullanıcı veritabanından okunur; pasife alınan kişinin oturumu hemen düşer.
- Durum değiştiren isteklerde `application/json` zorunlu (basit CSRF koruması); girişte deneme sınırı var.
- Görev güncellemeleri `apps/api/src/lib/taskService.ts` içinde tek noktadan yapılır: değişen her alan için zaman akışına kayıt düşülür, varsa not en önemli değişikliğe (tercihen durum) eklenir.
- "Bugün" ve "gecikti" hesapları `APP_TZ` (varsayılan `Europe/Istanbul`) saat dilimine göre yapılır.

## Üretime alırken

- `JWT_SECRET` için uzun rastgele bir değer verin (`openssl rand -hex 32`); `NODE_ENV=production` iken çerez yalnızca HTTPS üzerinden gönderilir.
- `pnpm build && pnpm db:deploy && pnpm start`. Web için `API_URL`, API için `DATABASE_URL`, `WEB_ORIGIN`, `APP_TZ` ayarlayın.
