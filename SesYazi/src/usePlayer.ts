/**
 * Tek dosyalık WAV oynatıcı.
 *
 * AVAudioPlayer ilerleme olayı yayınlamadığı için konumu yoklayarak
 * takip ediyoruz; 4 Hz kaydırma çubuğu için fazlasıyla yeterli.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-sound';

// Kayıt sırasında kategori 'PlayAndRecord' oluyor; oynatmadan önce
// 'Playback'e almazsak ses kulaklık yerine ahizeden çıkabiliyor.
Sound.setCategory('Playback');

export function usePlayer(yol: string | null) {
  const [caliyor, setCaliyor] = useState(false);
  const [konum, setKonum] = useState(0);
  const [uzunluk, setUzunluk] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const ses = useRef<Sound | null>(null);
  const sayac = useRef<ReturnType<typeof setInterval> | null>(null);

  const sayaciDurdur = () => {
    if (sayac.current) {
      clearInterval(sayac.current);
      sayac.current = null;
    }
  };

  // Yol değişince eskiyi bırak, yenisini yükle
  useEffect(() => {
    sayaciDurdur();
    ses.current?.release();
    ses.current = null;
    setCaliyor(false);
    setKonum(0);
    setUzunluk(0);
    setHata(null);

    if (!yol) return;

    setYukleniyor(true);
    const s = new Sound(yol, '', err => {
      setYukleniyor(false);
      if (err) {
        setHata('Ses dosyası açılamadı');
        return;
      }
      ses.current = s;
      setUzunluk(s.getDuration());
    });

    return () => {
      sayaciDurdur();
      s.release();
      ses.current = null;
    };
  }, [yol]);

  const duraklat = useCallback(() => {
    ses.current?.pause();
    sayaciDurdur();
    setCaliyor(false);
  }, []);

  const oynat = useCallback(() => {
    const s = ses.current;
    if (!s) return;

    setCaliyor(true);
    s.play(bitti => {
      sayaciDurdur();
      setCaliyor(false);
      // Başarıyla bitti: başa sar. Hata ile bittiyse konumu koru.
      if (bitti) {
        s.setCurrentTime(0);
        setKonum(0);
      }
    });

    sayac.current = setInterval(() => {
      s.getCurrentTime(sn => setKonum(sn));
    }, 250);
  }, []);

  const degistir = useCallback(() => {
    if (caliyor) duraklat();
    else oynat();
  }, [caliyor, duraklat, oynat]);

  /** 0..1 aralığında bir orana atlar. */
  const atla = useCallback(
    (oran: number) => {
      const s = ses.current;
      if (!s || !uzunluk) return;
      const hedef = Math.max(0, Math.min(uzunluk, oran * uzunluk));
      s.setCurrentTime(hedef);
      setKonum(hedef);
    },
    [uzunluk],
  );

  return {
    caliyor,
    konum,
    uzunluk,
    yukleniyor,
    hata,
    hazir: !!ses.current,
    oynat,
    duraklat,
    degistir,
    atla,
  };
}
