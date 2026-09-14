/**
 * Türkçe tarih/süre biçimlendirme.
 *
 * Intl'e güvenmek yerine adları elle yazıyoruz: Hermes'in Intl desteği
 * platforma göre değişiyor ve uygulama zaten yalnızca Türkçe.
 */

const AYLAR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const GUNLER = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

const iki = (n: number) => String(n).padStart(2, '0');

/** Gün başlangıcına yuvarlanmış epoch — gün gruplama anahtarı. */
export const gunAnahtari = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** "Bugün" · "Dün" · "12 Eylül Cuma" · "12 Eylül 2025 Cuma" */
export function gunBasligi(ms: number): string {
  const g = gunAnahtari(ms);
  const bugun = gunAnahtari(Date.now());
  const gun = 86_400_000;

  if (g === bugun) return 'Bugün';
  if (g === bugun - gun) return 'Dün';

  const d = new Date(ms);
  const yilFarkli = d.getFullYear() !== new Date().getFullYear();
  const yil = yilFarkli ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${AYLAR[d.getMonth()]}${yil} ${GUNLER[d.getDay()]}`;
}

/** "14:32" */
export const saat = (ms: number) => {
  const d = new Date(ms);
  return `${iki(d.getHours())}:${iki(d.getMinutes())}`;
};

/** "3 Ekim 2025, 14:32" — detay ekranı için tam tarih. */
export function tamTarih(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${saat(
    ms,
  )}`;
}

/** Saniyeyi "1:07" biçimine çevirir. */
export const sure = (sn: number) => {
  const s = Math.max(0, Math.round(sn));
  return `${Math.floor(s / 60)}:${iki(s % 60)}`;
};

/** "12 kelime" */
export function kelimeSayisi(metin: string): number {
  const t = metin.trim();
  return t ? t.split(/\s+/).length : 0;
}

export const formatMB = (bayt: number) =>
  `${(bayt / 1024 / 1024).toFixed(0)} MB`;
