# SesYazi — çevrimdışı Türkçe sesli günlük (iOS)

Konuşarak günlük tutmanızı sağlayan React Native uygulaması. Her kayıt
**hem ses hem metin** olarak saklanır. Ses hiçbir aşamada internete
gitmez; tüm çeviri cihaz üstünde, açık kaynak Whisper modelleriyle yapılır.

## Nasıl çalışır

İki mod aynı anda çalışır:

| Mod | Model | Ne zaman | Rolü |
|---|---|---|---|
| Canlı | `ggml-base-q5_1` (57 MB) | Siz konuşurken | Kelimeler anında ekrana düşer |
| Düzeltme | `ggml-small-q5_1` (181 MB) | Kayıt bitince | Metni baştan, daha doğru yazar |

Tek mikrofon açılışı kullanılır: `RealtimeTranscriber` sesi hem VAD ile
dilimleyip canlı modele verir, hem de `audioOutputPath` ile WAV olarak
diske yazar. Kayıt bitince bu WAV düzeltme modeline gider ve sonuç
otomatik olarak günlüğe kaydedilir.

## Ekranlar

- **Kayıt** — mikrofon, canlı metin, konuşma algılama göstergesi
- **Günlüğüm** — kayıtlar güne göre gruplanmış, metin içinde arama
- **Detay** — sesi dinle (kaydırmalı ilerleme çubuğu), metni düzenle,
  kopyala, sil; canlı modun ham metnini düzeltilmiş hâliyle karşılaştır

## Veri nerede duruyor

| Ne | Nerede |
|---|---|
| Metinler | `Documents/gunluk.json` |
| Ses kayıtları | `Documents/kayitlar/kayit-<zaman>.wav` |
| Modeller | `Documents/models/` |

> **Tasarım notu:** Kayıtta ses dosyasının **tam yolu değil, yalnızca adı**
> tutulur. iOS'ta uygulama konteynerinin UUID'si her yeniden kurulumda
> değişir — Sideloadly ile 7 günde bir yeniden imzalarken de. Tam yol
> saklansaydı her yenilemeden sonra bütün sesler kayıp görünürdü.
> Yol, okuma anında `sesYolu()` ile üretilir.

Hiçbir veri dışarı gönderilmez ve uygulama silinirse hepsi silinir —
yedekleme yoktur.

---

## Kurulum: Windows'tan iPhone'a

iOS derlemesi macOS + Xcode ister. Mac almadan çözüm:

### 1. Depoyu GitHub'a gönderin

```powershell
cd C:\Users\esrag\Desktop\voice_app
git remote add origin https://github.com/<kullanici>/<depo>.git
git push -u origin main
```

### 2. IPA'yı bulutta derletin

GitHub → **Actions** → **iOS derle (imzasız IPA)** → **Run workflow**.
İş bitince sayfanın altındaki **Artifacts** bölümünden `SesYazi-ipa`
dosyasını indirin, zip'ten `SesYazi.ipa`'yı çıkarın.

macOS runner dakikası ücretsiz kotadan 10x katsayıyla düşer; bu derleme
yaklaşık 10-15 dakika sürer.

### 3. Telefona kurun

1. [Sideloadly](https://sideloadly.io) kurun (Windows sürümü).
2. iTunes'un **Apple sitesinden indirilen** sürümü gerekli — Microsoft
   Store sürümü çalışmaz.
3. iPhone'u kabloyla bağlayın, `.ipa`'yı Sideloadly'ye sürükleyin,
   Apple ID'nizi girin, **Start**.
4. Telefonda: **Ayarlar → Genel → VPN ve Aygıt Yönetimi** → Apple ID'nize
   dokunup **Güven**.

Ücretsiz Apple ID ile imza **7 gün** geçerlidir; Sideloadly'nin otomatik
yenileme özelliği süresi dolmadan yeniden imzalar. Ücretli Apple Developer
hesabıyla (yılda 99 $) bu süre 1 yıla çıkar.

### 4. İlk açılış

Uygulama ilk açılışta modelleri indirir (toplam ~240 MB, tek seferlik).
Sonrasında **uçak modunda da çalışır**.

---

## Türkçe fine-tune modeline geçmek

Şu an resmi çok-dilli Whisper modelleri kullanılıyor. Bunlar Türkçe'yi
destekliyor ama Türkçe'ye özel eğitilmiş modeller belirgin şekilde daha
iyi sonuç veriyor. Hazır GGML formatında Türkçe model bulunmadığı için
dönüştürmek gerekiyor — bunun için de bir iş akışı hazır.

1. GitHub → **Actions** → **Türkçe modeli GGML'e dönüştür** → **Run workflow**
2. `hf_repo` alanına modeli yazın, `quantization` olarak `q5_1` bırakın
3. Çıkan `.bin` dosyasını artifact'lerden indirin
4. Bir **GitHub Release**'e yükleyin (ham dosya URL'si lazım)
5. [`SesYazi/src/models.ts`](SesYazi/src/models.ts) içindeki `MODELS`
   kaydında `url`, `file` ve `bytes` alanlarını güncelleyin

Uygulama kodunun geri kalanı değişmez.

### Aday modeller

| Model | Boyut (q5_1) | Not |
|---|---|---|
| `ysdede/whisper-base-turkish-1.1` | ~57 MB | Canlı mod için uygun |
| `ogulcanakca/whisper-small-tr` | ~181 MB | Common Voice 23, gürültüye dayanıklı |
| `emredeveloper/whisper-small-tr` | ~181 MB | Düzeltme modu için iyi aday |
| `selimc/whisper-large-v3-turbo-turkish` | ~570 MB | En doğru, ama aşağıdaki uyarıya bakın |

> **large-v3-turbo uyarısı:** Bu boyut `increased-memory-limit` ve
> `extended-virtual-addressing` yetkilendirmelerini gerektirir. Bu
> yetkilendirmeler ücretsiz Apple ID profillerinde bulunmadığı için
> Sideloadly ile imzalamayı bozar. Ücretli geliştirici hesabı şart.
> Mevcut base + small ikilisi bu yetkilendirmelere ihtiyaç duymaz.

---

## Geliştirme

```powershell
cd SesYazi
npm install
npm start              # Metro
npx tsc --noEmit       # tip kontrolü
npx eslint App.tsx src/
```

Bundle'ın derlendiğini Windows'ta doğrulayabilirsiniz (Mac gerekmez):

```powershell
npx react-native bundle --platform ios --dev false `
  --entry-file index.js --bundle-output nul
```

### Dosya düzeni

| Dosya | İşi |
|---|---|
| [`src/models.ts`](SesYazi/src/models.ts) | Model kaydı, indirme, boyut doğrulama |
| [`src/useDictation.ts`](SesYazi/src/useDictation.ts) | Canlı akış + düzeltme geçişi |
| [`src/entries.ts`](SesYazi/src/entries.ts) | Günlük kayıtlarının saklanması |
| [`src/usePlayer.ts`](SesYazi/src/usePlayer.ts) | WAV oynatıcı |
| [`src/format.ts`](SesYazi/src/format.ts) | Türkçe tarih/süre biçimlendirme |
| [`src/theme.ts`](SesYazi/src/theme.ts) | Renk paleti, tipografi ölçeği |
| [`src/screens/`](SesYazi/src/screens/) | Kayıt, liste ve detay ekranları |
| [`App.tsx`](SesYazi/App.tsx) | Kabuk ve ekran yönlendirmesi |
| [`.github/workflows/build-ios.yml`](.github/workflows/build-ios.yml) | Bulutta IPA derleme |
| [`.github/workflows/convert-model.yml`](.github/workflows/convert-model.yml) | HF → GGML dönüştürme |

Ekran geçişleri için navigasyon kütüphanesi kullanılmıyor — üç ekran için
`App.tsx` içinde basit bir durum makinesi yetiyor ve üç native bağımlılık
(`react-native-screens`, `safe-area-context`, navigasyon) eklemekten
kurtarıyor. Her native bağımlılık bulut derlemesinde risk demek.

### Bilinen tuhaflık: `/index` soneki

`useDictation.ts` içinde import şöyle:

```ts
from 'whisper.rn/realtime-transcription/index'
```

Sondaki `/index` **şart**. whisper.rn'in `package.json` `exports`
haritasındaki `"./*"` deseni `whisper.rn/realtime-transcription` için
`src/realtime-transcription.ts` arıyor (öyle bir dosya yok), Metro'nun
geri düşüşü de paket kökünde arıyor (orada da yok). `/index` verince
desen `src/realtime-transcription/index.ts`'e denk geliyor.

Aynı sebeple `tsconfig.json` içinde `paths` eşlemesi var — `tsc`'nin
Metro gibi bir geri düşüşü olmadığı için tipleri elle yönlendiriyoruz.

---

## Sorun giderme

**Derleme `RNAudioPcmStream` sembollerini bulamıyor.**
`@fugood/react-native-audio-pcm-stream` podspec'i kaynakları `iOS/*.{h,m}`
diye arıyor, ama paketteki klasörün adı küçük harfle `ios`. GitHub'ın
macOS runner'ları büyük/küçük harf duyarsız dosya sistemi kullandığı için
normalde sorun çıkmaz. Duyarlı bir diskte derliyorsanız klasörü
`iOS` olarak yeniden adlandırın veya podspec'i düzeltin.

**Uygulama açılışta modeli indirirken takılıyor.**
Yarım kalan dosya `isModelReady()` boyut kontrolüne takılır ve bir sonraki
açılışta baştan indirilir. Elle temizlemek için uygulamayı silip yeniden
kurun.

**Canlı metin geliyor ama düzeltme adımı çok uzun sürüyor.**
İlk düzeltmede `small` modeli indirilip belleğe yükleniyor; sonraki
kayıtlarda bu adım atlanır. Hâlâ yavaşsa `models.ts` içinde düzeltme
modelini `base`'e çekin.

---

## Modeli uygulamaya gömmek

Modeller varsayılan olarak ilk açılışta indiriliyor; böylece IPA küçük
kalıyor ve haftalık yeniden imzalama hızlı oluyor. Gömmek isterseniz:

1. `.bin` dosyalarını `SesYazi/assets/` altına koyun
2. `SesYazi/metro.config.js` içinde `resolver.assetExts`'e `'bin'` ekleyin
3. `models.ts`'teki `modelPath()` yerine `require('../assets/...')`
   kullanıp `initWhisper`'a doğrudan verin

Bu durumda IPA ~250 MB olur ve Sideloadly ile her yükleme belirgin
şekilde yavaşlar.

---

## Gizlilik

- Ses kaydı ve metin cihazdan çıkmaz.
- Ağ erişimi yalnızca ilk açılıştaki model indirmesi içindir.
- İndirme bittikten sonra uygulama uçak modunda tam çalışır.
- `Info.plist` içinde `NSAllowsArbitraryLoads` kapalı bırakıldı.
