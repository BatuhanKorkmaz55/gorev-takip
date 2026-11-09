# Görev Takip — tasarım sistemi

Görev Takip üç iş içindir: **görev ver, görevi yap, tamamla.** Ekranda bu üç işe yaramayan hiçbir şey durmaz. Her ekran, bilgisayarla arası iyi olmayan bir ekip arkadaşının da ilk bakışta anlayacağı kadar sade ve okunur olmalı.

## İlkeler

1. **Az şey, açık şey.** Bir görevin yalnızca başlığı, kimin verdiği, kimin yapacağı, son tarihi, durumu ve notları vardır. Öncelik, etiket, alt adım, yüzde yoktur.
2. **Üç durum, hep yazıyla.** Yapılacak · Devam ediyor · Tamamlandı. Renk ve simge yalnızca destekler.
3. **Durum menüsü yok, düğme var.** Görevi yapan kişi satırda "Başla", "Tamamla" ya da "Geri al" düğmesine basar. Görevi yapmayan kişi bu düğmeleri hiç görmez.
4. **Kelimeyle tarih.** "Bugün", "Yarın", "2 gün gecikti", "Cuma, 7 Kas".
5. **Büyük hedefler.** Tıklanan her şey en az 44px (`control-h`); görev satırı en az 64px (`row-min-h`).
6. **Açılır parçalar hiç kesilmez.** Menü ve pencereler sayfanın en üst katmanında açılır; aşağıda yer yoksa yukarı açılır, ekrandan taşacaksa kendi içinde kaydırılır.

## Sayfalar

Yalnızca üç sayfa vardır; her yerde tek ana düğme **"Görev ver"**dir.

- **Görevlerim:** bana verilenler. Bölümler: Yapılacak, Devam ediyor, Tamamlanan (kapalı başlar). Liste ya da pano olarak görülebilir.
- **Verdiğim görevler:** başkasına verdiklerim. Durumu yalnızca görürüm, değiştiremem.
- **Ekip:** kişiler ve her birinin açık görev sayısı. Yönetici kişi ekler, şifre sıfırlar, çıkarır.

## Yazı ve dil

- Kısa, sade Türkçe. Bir satırda bir bilgi: "Veren: Ayşe · Yarın", "Mehmet yapacak · 2 gün gecikti".
- Düğmeler fiildir ve tek kelimeye yakındır: "Görev ver", "Başla", "Tamamla", "Geri al", "Not ekle", "Kaydet".
- İpucu satırı, alt başlık, kısayol açıklaması yazılmaz. Boş ekran tek cümle söyler: "Şu an üzerinde görev yok."
- Ünlem ve emoji kullanılmaz.

## Görsel temeller

- **Yazı tipi:** Atkinson Hyperlegible Next (Google Fonts, latin-ext). Gövde `body` 16px; hiçbir metin `small` (14px) altına inmez. Sayfa başlığı `display`, görev detay başlığı `title-lg`.
- **Renk:** nötr öncelikli. Zemin `paper`, kartlar `surface`, metin `ink` / `ink-muted`. Ana düğme `ink` dolgu + `on-ink` metin. Vurgu `accent` (bağlantı, odak, seçili menü).
- **Kontrast:** tüm metin çiftleri en az 4.5:1; kontrol kenarları `line-strong`. `line` yalnızca ayırıcıdır.
- **Tema:** varsayılan **koyu**. Açık tema kullanıcı menüsündeki "Açık tema" ile seçilir ve tarayıcıda hatırlanır (`gt-theme`). Koyu değerler `globals.css` içinde `:root[data-theme="dark"]` altında aynı token adlarıyla tanımlı; bileşenlerde sabit renk (`white`, `#…`) kullanılmaz, her zaman token kullanılır. Dolgulu yüzeyde metin `on-ink` / `on-danger`, örtü `scrim`.
- **Köşe ve gölge:** düğme/giriş `radius-md`, kart `radius-lg`, etiket `radius-sm`; kartta `shadow-card`, açılır parçada `shadow-pop`.

## Durum dili

| Durum | Zemin | Metin | Simge |
| --- | --- | --- | --- |
| Yapılacak | `status-todo` | `status-todo-ink` | boş halka, `status-todo-dot` |
| Devam ediyor | `status-progress` | `status-progress-ink` | yarım dolu halka, `status-progress-dot` |
| Tamamlandı | `status-done` | `status-done-ink` | dolu daire + onay, `status-done-dot` |

Tarih vurgusu: gecikmiş `danger` / `danger-soft`, bugün `status-blocked-ink` / `status-blocked`. Diğer tarihler `ink-muted`.

## Bileşen kuralları

- **Görev ver formu:** tek satır. "Ne yapılacak?" alanı, "Kime?" seçimi (varsayılan "Ben"), isteğe bağlı "Ne zamana?" (Bugün, Yarın ya da tarih seç) ve "Ekle" düğmesi. Görevlerim'in üstünde durur; "Görev ver" düğmesiyle pencerede de açılır.
- **Görev satırı:** başlık `body`; altında `small` + `ink-muted` tek bilgi satırı. Sağda durum etiketi; görevi yapan kişiyse yanında eylem düğmeleri: Yapılacak → "Başla" + "Tamamla", Devam ediyor → "Tamamla", Tamamlandı → "Geri al".
- **Durum etiketi:** simge + kelime, `label`, `radius-sm`; tıklanmaz, yalnızca gösterir.
- **Pano:** üç kolon (Yapılacak, Devam ediyor, Tamamlandı). Kart yalnızca görevi yapan kişi için sürüklenir.
- **Görev detayı:** başlık; "Veren → Yapan", "Son tarih", durum; eylem düğmeleri (yalnızca yapan kişi); açıklama; "Not ekle" kutusu; geçmiş. Görevi veren kişi ya da yönetici "Düzenle" ve "Sil"i görür.
- **Açılır menü:** sayfanın üst katmanında, tetikleyicinin hemen altında ya da yer yoksa üstünde açılır; en fazla ekran yüksekliği kadar uzar, fazlası kaydırılır.
- **Odak:** klavyeyle gezinmede `accent` renginde 2px halka, 2px boşlukla.

## Yetki

- Durumu yalnızca görevi yapan kişi değiştirir (yönetici ve görevi veren de değiştiremez).
- Düzenleme ve silme: görevi veren kişi ya da yönetici.
- Not: görevi yapan, veren ya da yönetici.

## Simgeler

Lucide çizgi simgeleri, 20px, 1.75 çizgi, metin rengini alır; her zaman bir kelimenin yanında durur. Yalnızca simgeli düğme sadece "Kapat" içindir ve `aria-label` taşır.

## Logo

Ayrı bir logo dosyası yoktur. İşaret: `ink` dolgulu `radius-md` kare içinde `brand-signal` renginde onay çizgisi, yanında `heading` ağırlığında "Görev Takip".

## Kodda nerede?

- Token'ların JSON hâli: [`tasarim-tokenlari.json`](tasarim-tokenlari.json); uygulamadaki karşılıkları (Tailwind `@theme`): [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css)
- Yetki kuralları (API ve arayüz aynısını kullanır): [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts)
- Eylem düğmeleri: [`apps/web/src/components/TaskActions.tsx`](../apps/web/src/components/TaskActions.tsx); kesilmeyen açılır menü: [`apps/web/src/components/Popover.tsx`](../apps/web/src/components/Popover.tsx)
- Kelimeyle tarih: [`packages/shared/src/dates.ts`](../packages/shared/src/dates.ts) (`dueLabel`)

Bu sistem ve ekran tasarımları (masaüstü Görevlerim, görev detayı, mobil Görevlerim) Claude Design ile hazırlandı.
