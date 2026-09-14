/** Renk paleti ve tipografi ölçeği. Açık/koyu tema. */

export type Theme = typeof acik;

export const acik = {
  zemin: '#FBFBFC',
  zeminIkincil: '#F2F2F5',
  kart: '#FFFFFF',
  cizgi: '#E5E5EA',
  cizgiSolgun: '#F0F0F3',

  metin: '#14141A',
  metinIkincil: '#5B5B66',
  soluk: '#9A9AA5',

  vurgu: '#3B6FE0',
  vurguZemin: '#ECF1FD',
  vurguMetin: '#FFFFFF',

  canli: '#DC3A2E',
  canliZemin: '#FDEDEB',

  iyi: '#17804A',
  iyiZemin: '#E8F5EE',

  uyari: '#9A6B00',
  uyariZemin: '#FDF3E0',

  kotu: '#C0392B',
  kotuZemin: '#FDEDEB',

  golge: '#000000',
};

export const koyu: Theme = {
  zemin: '#0C0C0F',
  zeminIkincil: '#141418',
  kart: '#18181D',
  cizgi: '#2A2A31',
  cizgiSolgun: '#1F1F25',

  metin: '#F4F4F7',
  metinIkincil: '#B0B0BC',
  soluk: '#7A7A86',

  vurgu: '#5B93FF',
  vurguZemin: '#141F33',
  vurguMetin: '#FFFFFF',

  canli: '#FF6A5C',
  canliZemin: '#2A1513',
  iyi: '#4ADE80',
  iyiZemin: '#10241A',

  uyari: '#E0A93B',
  uyariZemin: '#251C0C',

  kotu: '#FF6A5C',
  kotuZemin: '#2A1513',

  golge: '#000000',
};

/** Tipografi ölçeği — ekranlar arası tutarlılık için. */
export const yazi = {
  baslikBuyuk: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  baslik: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.3 },
  altBaslik: { fontSize: 16, fontWeight: '600' as const },
  govde: { fontSize: 17, lineHeight: 26 },
  govdeGunluk: { fontSize: 18, lineHeight: 30 },
  ikincil: { fontSize: 14, lineHeight: 20 },
  kucuk: { fontSize: 12.5, fontWeight: '500' as const },
  minik: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
};

export const olcu = {
  kenar: 20,
  radyus: 16,
  radyusKucuk: 10,
};
