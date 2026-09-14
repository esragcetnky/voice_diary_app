/**
 * Günlük kayıtlarının saklanması.
 *
 * Metin `gunluk.json` içinde bir dizin dosyasında, ses ise `kayitlar/`
 * altında WAV olarak duruyor.
 *
 * ÖNEMLİ: Kayıtta ses dosyasının **tam yolu değil, yalnızca adı** tutulur.
 * iOS'ta uygulama konteynerinin UUID'si her yeniden kurulumda değişir
 * (Sideloadly ile 7 günde bir yeniden imzalarken de olur). Tam yol
 * saklansaydı her yenilemeden sonra tüm sesler kayıp görünürdü.
 * Yol, okuma anında `sesYolu()` ile üretilir.
 */
import {
  DocumentDirectoryPath,
  exists,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from '@dr.pogodin/react-native-fs';

export const SES_DIZINI = `${DocumentDirectoryPath}/kayitlar`;
const DIZIN_DOSYASI = `${DocumentDirectoryPath}/gunluk.json`;

export type Entry = {
  id: string;
  /** Kaydın oluşturulma anı (epoch ms). */
  createdAt: number;
  /** Kullanıcıya gösterilen metin. Düzeltme çalıştıysa düzeltilmiş hâli. */
  text: string;
  /** Canlı modun ürettiği ham metin — düzeltmeyle karşılaştırmak için. */
  liveText: string;
  /** Düzeltme geçişi tamamlandı mı? */
  isCorrected: boolean;
  /** Metin elle düzenlendi mi? */
  isEdited: boolean;
  /** Yalnızca dosya adı, yol değil. Ses silinmişse null. */
  audioFile: string | null;
  durationSec: number;
};

type Dizin = { version: 1; entries: Entry[] };

/** Kayıt adından tam ses yolunu üretir. */
export const sesYolu = (e: Entry) =>
  e.audioFile ? `${SES_DIZINI}/${e.audioFile}` : null;

export const yeniSesAdi = () => `kayit-${Date.now()}.wav`;

export async function hazirla() {
  await mkdir(SES_DIZINI);
}

export async function tumKayitlar(): Promise<Entry[]> {
  try {
    if (!(await exists(DIZIN_DOSYASI))) return [];
    const ham = await readFile(DIZIN_DOSYASI, 'utf8');
    const d = JSON.parse(ham) as Dizin;
    if (!d || !Array.isArray(d.entries)) return [];
    // En yeni en üstte
    return d.entries.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    // Bozuk dizin dosyası uygulamayı kilitlemesin; boş başla.
    return [];
  }
}

async function yaz(entries: Entry[]) {
  const d: Dizin = { version: 1, entries };
  await writeFile(DIZIN_DOSYASI, JSON.stringify(d), 'utf8');
}

export async function ekle(e: Entry): Promise<Entry[]> {
  const hepsi = await tumKayitlar();
  const yeni = [e, ...hepsi.filter(x => x.id !== e.id)];
  await yaz(yeni);
  return yeni.sort((a, b) => b.createdAt - a.createdAt);
}

export async function guncelle(
  id: string,
  degisiklik: Partial<Entry>,
): Promise<Entry[]> {
  const hepsi = await tumKayitlar();
  const yeni = hepsi.map(x => (x.id === id ? { ...x, ...degisiklik } : x));
  await yaz(yeni);
  return yeni;
}

/** Kaydı ve ses dosyasını birlikte siler. */
export async function sil(id: string): Promise<Entry[]> {
  const hepsi = await tumKayitlar();
  const hedef = hepsi.find(x => x.id === id);

  if (hedef) {
    const yol = sesYolu(hedef);
    // Ses zaten yoksa sorun değil; kaydı yine de sil.
    if (yol && (await exists(yol))) {
      try {
        await unlink(yol);
      } catch {}
    }
  }

  const yeni = hepsi.filter(x => x.id !== id);
  await yaz(yeni);
  return yeni;
}

/** Toplam kayıt sayısı ve süresi — liste başlığındaki özet için. */
export function ozet(entries: Entry[]) {
  return {
    adet: entries.length,
    toplamSn: entries.reduce((t, e) => t + e.durationSec, 0),
  };
}
