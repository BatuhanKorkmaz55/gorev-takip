# Görev Takip — tasarım sistemi

Görev Takip, bir ekibin "kim, neyi, ne zamana kadar yapıyor" sorusunu tek bakışta cevaplayan iş takip uygulamasıdır. Tasarımın tek ölçütü **okunurluk ve kolaylık**: her ekran, bilgisayarla arası iyi olmayan bir ekip arkadaşının da ilk seferde anlayacağı kadar açık olmalı. Süs yok, gizli düğme yok, tahmin ettiren simge yok.

## İlkeler

1. **Her durum bir kelimeyle yazılır.** Renk ve simge yalnızca destekler; "Devam ediyor", "Beklemede", "Tamamlandı" her zaman yazıyla görünür.
2. **Tek ana eylem görünür.** Her sayfanın üstünde "Yeni görev ekle" kutusu vardır; sayfada en fazla bir koyu (ink) buton bulunur.
3. **Gizli etkileşim yok.** Üzerine gelince beliren buton kullanılmaz. Durum değiştir, kişi ata gibi işler her satırda görünür durur.
4. **Kelimeyle tarih.** "Bugün", "Yarın", "2 gün gecikti", "Cuma, 7 Kas" — asla yalnızca "07.11".
5. **Büyük hedefler.** Tıklanan her şey en az 44px (`control-h`), görev satırı en az 64px (`row-min-h`).

## Yazı ve dil

- Sade Türkçe, ikinci tekil şahıs, kısa cümle: "Ne yaptın? Kısa bir not bırak."
- Buton metni fiille başlar: "Görevi ekle", "Notu kaydet", "Ekipten çıkar".
- Teknik terim yok: "assign" değil "ata", "status" değil "durum", "comment" değil "not".
- Ünlem ve emoji kullanılmaz. Boş ekranlar ne yapılacağını söyler: "Üzerinde açık iş yok. Yukarıdaki kutuya yazıp ekleyebilirsin."

## Görsel temeller

- **Yazı tipi:** Atkinson Hyperlegible Next (Google Fonts, latin-ext; Türkçe karakterleri tam destekler). Okunurluk için tasarlanmıştır: I/l/1 ve 0/O birbirinden ayrılır.
- **Boyutlar:** gövde `body` 16px. Hiçbir metin `small` (14px) altına inmez. Sayfa başlığı `display` 30px, görev detay başlığı `title-lg` 24px, kart başlığı `title` 20px.
- **Renk:** nötr öncelikli. Zemin `paper`, kartlar `surface`, metin `ink` ve `ink-muted`. Tek vurgu rengi `accent` (mavi): bağlantı, odak halkası, seçili menü. Ana buton dolgusu `ink`, üzerindeki metin `on-ink`.
- **Kontrast:** tüm metin çiftleri en az 4.5:1 (tokenların notunda yazılı). Kontrol kenarları `line-strong` (3.6:1). `line` yalnızca ayırıcıdır.
- **Köşeler:** etiket `radius-sm`, buton/giriş `radius-md`, kart/panel `radius-lg`.
- **Gölge:** kartlarda yalnızca `shadow-card`; açılır menü ve paneller `shadow-pop`.
- **Satır boyu:** içerik `content-max` (1040px) genişliği aşmaz.

## Durum dili

| Durum | Zemin | Metin | Simge |
| --- | --- | --- | --- |
| Yapılacak | `status-todo` | `status-todo-ink` | boş halka, `status-todo-dot` |
| Devam ediyor | `status-progress` | `status-progress-ink` | yarım dolu halka, `status-progress-dot` |
| Beklemede | `status-blocked` | `status-blocked-ink` | duraklat simgesi, `status-blocked-dot` |
| Tamamlandı | `status-done` | `status-done-ink` | dolu daire + onay, `status-done-dot` |
| İptal | `status-cancel` | `status-cancel-ink` | çarpı |

Simgeler birbirinden şekil olarak da ayrılır; renk körlüğünde de durum okunur. Gecikmiş tarih `danger` / `danger-soft`, bugünkü tarih `status-blocked-ink` ile yazılır ve her zaman kelimeyle ("Bugün", "3 gün gecikti").

## Bileşen kuralları

- **Hızlı ekleme kutusu:** `quickadd-h` yüksekliğinde, üstünde görünür etiket ("Yeni görev ekle"), altında açık başlıklı seçiciler: "Kime: Bana", "Ne zaman: Tarih yok", "Öncelik: Normal", "Etiket". Kısayollar (`@kişi`, `yarın`, `!acil`, `#etiket`) bir ipucu satırında yazılıdır ama zorunlu değildir.
- **Görev satırı:** solda 24px onay kutusu (`line-strong` kenar, `radius-sm`) — işaretlemek görevi tamamlar. Ortada başlık `body`, altında `small` + `ink-muted` ile "Kişi · tarih · etiket". Sağda her zaman görünen durum etiketi; tıklanınca durum menüsü açılır.
- **Durum etiketi:** simge + kelime, `label` stili, `radius-sm`, 32px yükseklik; satır içinde düğme olarak çalışır.
- **Butonlar:** ana buton `ink` dolgu + `on-ink` metin; ikincil buton `surface` + `line-strong` kenar; tehlikeli işlem `danger`. Hepsi `control-h`, `radius-md`, metin `body-strong`.
- **Görev detay paneli:** sırasıyla başlık, durum seçici (5 büyük düğme, yazılı), **"Ne yaptın?" not kutusu**, bilgiler (Sorumlu, Bitiş tarihi, Öncelik, İlerleme, Etiketler), açıklama, alt adımlar, geçmiş. En sık yapılan iş (durum + not) en üstte.
- **Odak:** klavyeyle gezinmede `accent` renginde 2px halka, 2px boşlukla.

## Simgeler

Lucide çizgi simgeleri, 20px, 1.75 çizgi kalınlığı, metin rengini alır. Simge her zaman bir kelimenin yanında durur; yalnızca simgeli düğmeye `aria-label` ve araç ipucu verilir (yalnızca kapat ve "diğer" menüsü için).

## Logo

Ayrı bir logo dosyası yoktur. İşaret: `ink` dolgulu `radius-md` kare içinde `brand-signal` renginde onay çizgisi, yanında `heading` ağırlığında "Görev Takip" yazısı.

## Kodda nerede?

- Token'ların JSON hâli: [`tasarim-tokenlari.json`](tasarim-tokenlari.json)
- Uygulamadaki karşılıkları (Tailwind `@theme`): [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) — örn. `bg-paper`, `text-ink-muted`, `bg-progress text-progress-ink`
- Durum etiketleri ve kelimeyle tarih: [`apps/web/src/components/TaskIcons.tsx`](../apps/web/src/components/TaskIcons.tsx), [`packages/shared/src/dates.ts`](../packages/shared/src/dates.ts) (`dueLabel`)

Bu sistem ve ekran tasarımları (masaüstü Özet, görev detayı, mobil Görevlerim) Claude Design ile hazırlandı.
