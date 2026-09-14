/**
 * Dikte motoru.
 *
 * Tek mikrofon açılışıyla iki şey birden yapıyoruz:
 *
 *   1. CANLI   — RealtimeTranscriber sesi VAD ile dilimleyip küçük "base"
 *                modeline veriyor, kelimeler konuşurken ekrana düşüyor.
 *   2. DÜZELTME — aynı akış `audioOutputPath` ile WAV olarak diske de
 *                yazılıyor. Kayıt bitince bu WAV daha büyük "small"
 *                modeliyle baştan çevriliyor.
 *
 * WAV dosyası silinmiyor: günlük kaydının ses tarafı o dosya.
 * Hiçbir aşamada ses cihazdan çıkmıyor.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initWhisper,
  initWhisperVad,
  type WhisperContext,
  type WhisperVadContext,
} from 'whisper.rn';
// Dikkat: buradaki "/index" soneki şart. whisper.rn'in "exports" haritasındaki
// "./*" deseni 'whisper.rn/realtime-transcription' için src/realtime-transcription.ts
// arıyor (yok), Metro'nun geri düşüşü de paket kökünde arıyor (yine yok).
// "/index" verince desen src/realtime-transcription/index.ts'e denk geliyor.
import {
  RealtimeTranscriber,
  RingBufferVad,
} from 'whisper.rn/realtime-transcription/index';
import { AudioPcmStreamAdapter } from 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter';
import {
  appendFile,
  exists,
  readFile,
  unlink,
  writeFile,
} from '@dr.pogodin/react-native-fs';

import {
  ensureModel,
  modelPath,
  type DownloadProgress,
  type ModelRole,
} from './models';
import { SES_DIZINI, hazirla, yeniSesAdi, type Entry } from './entries';

/** whisper.rn'in WavFileWriter'ının beklediği dar fs arayüzü. */
const fsAdapter = {
  writeFile: (p: string, d: string, enc: string) =>
    writeFile(p, d, enc as 'base64'),
  appendFile: (p: string, d: string, enc: string) =>
    appendFile(p, d, enc as 'base64'),
  readFile: (p: string, enc: string) => readFile(p, enc as 'base64'),
  exists,
  unlink,
};

export type Phase =
  | 'hazirlaniyor' // modeller indiriliyor / belleğe yükleniyor
  | 'hazir'
  | 'kayitta'
  | 'duzeltiliyor' // kayıt bitti, small model çalışıyor
  | 'hata';

/** Kayıt bitince üretilen, günlüğe yazılmaya hazır veri. */
export type KayitSonucu = Omit<Entry, 'isEdited'>;

export function useDictation() {
  const [phase, setPhase] = useState<Phase>('hazirlaniyor');
  const [liveText, setLiveText] = useState('');
  const [konusuyor, setKonusuyor] = useState(false);
  const [hazirlikMesaji, setHazirlikMesaji] = useState('Başlatılıyor…');
  const [indirme, setIndirme] = useState<DownloadProgress | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sureSn, setSureSn] = useState(0);

  const liveCtx = useRef<WhisperContext | null>(null);
  const finalCtx = useRef<WhisperContext | null>(null);
  const vadCtx = useRef<WhisperVadContext | null>(null);
  const transcriber = useRef<RealtimeTranscriber | null>(null);
  const sesAdi = useRef<string | null>(null);
  const baslangic = useRef<number>(0);

  /**
   * Her dilim yeniden çevrildikçe metni tazeleniyor, bu yüzden dilim
   * sırasına göre saklayıp birleştiriyoruz — üst üste eklemek aynı
   * cümleyi iki kez yazdırırdı.
   */
  const slices = useRef<Map<number, string>>(new Map());

  const birlestir = () =>
    [...slices.current.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, t]) => t.trim())
      .filter(Boolean)
      .join(' ');

  // --- Kurulum: modelleri indir ve belleğe yükle -------------------------
  useEffect(() => {
    let iptal = false;

    (async () => {
      try {
        const indir = async (role: ModelRole, etiket: string) => {
          setHazirlikMesaji(etiket);
          await ensureModel(role, p => {
            if (!iptal) setIndirme(p);
          });
          setIndirme(null);
        };

        // Sadece kayda başlamak için gerekenler. "small" modelini ilk
        // düzeltmeye kadar bekletiyoruz ki uygulama daha çabuk açılsın.
        await indir('vad', 'Konuşma algılayıcı indiriliyor…');
        await indir('live', 'Canlı model indiriliyor…');
        if (iptal) return;

        setHazirlikMesaji('Model belleğe yükleniyor…');
        vadCtx.current = await initWhisperVad({
          filePath: modelPath('vad'),
          useGpu: true,
          nThreads: 2,
        });
        liveCtx.current = await initWhisper({
          filePath: modelPath('live'),
          useGpu: true,
          useCoreMLIos: true,
        });
        if (iptal) return;

        await hazirla();
        setPhase('hazir');
        setHazirlikMesaji('');
      } catch (e: any) {
        if (iptal) return;
        setHata(e?.message ?? String(e));
        setPhase('hata');
      }
    })();

    return () => {
      iptal = true;
      transcriber.current?.stop().catch(() => {});
      liveCtx.current?.release().catch(() => {});
      finalCtx.current?.release().catch(() => {});
      vadCtx.current?.release().catch(() => {});
    };
  }, []);

  // --- Kayıt süresi sayacı ----------------------------------------------
  useEffect(() => {
    if (phase !== 'kayitta') return;
    const t = setInterval(
      () => setSureSn(Math.round((Date.now() - baslangic.current) / 1000)),
      500,
    );
    return () => clearInterval(t);
  }, [phase]);

  const basla = useCallback(async () => {
    if (phase !== 'hazir' || !liveCtx.current || !vadCtx.current) return;

    slices.current.clear();
    setLiveText('');
    setHata(null);
    setSureSn(0);
    baslangic.current = Date.now();

    const ad = yeniSesAdi();
    sesAdi.current = ad;

    transcriber.current = new RealtimeTranscriber(
      {
        whisperContext: liveCtx.current,
        vadContext: new RingBufferVad(vadCtx.current, {
          // Türkçe'de cümle araları kısa; fazla muhafazakâr bir eşik
          // cümlenin ortasını kesiyor. 'default' iyi dengeyi veriyor.
          vadPreset: 'default',
          sampleRate: 16000,
        }),
        audioStream: new AudioPcmStreamAdapter(),
        fs: fsAdapter,
      },
      {
        audioSliceSec: 30,
        audioMinSec: 1,
        maxSlicesInMemory: 3,
        audioOutputPath: `${SES_DIZINI}/${ad}`,
        transcribeOptions: {
          language: 'tr',
          // Canlı tarafta hız önemli: greedy decode, tek geçiş.
          beamSize: 1,
          bestOf: 1,
          temperature: 0,
          maxThreads: 4,
        },
        // Önceki dilimlerin metnini prompt'a eklemek Türkçe'de özel isim
        // ve ek tutarlılığını belirgin şekilde düzeltiyor.
        promptPreviousSlices: true,
        realtimeProcessingPauseMs: 200,
        audioStreamConfig: {
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
        },
      },
      {
        onTranscribe: ev => {
          if (ev.type === 'transcribe' && ev.data?.result) {
            slices.current.set(ev.sliceIndex, ev.data.result);
            setLiveText(birlestir());
          }
        },
        onVad: ev =>
          setKonusuyor(
            ev.type === 'speech_start' || ev.type === 'speech_continue',
          ),
        onError: e => setHata(e),
      },
    );

    await transcriber.current.start();
    setPhase('kayitta');
  }, [phase]);

  /**
   * Kaydı bitirir, düzeltme geçişini çalıştırır ve günlüğe yazılmaya
   * hazır kaydı döndürür. Konuşma hiç algılanmadıysa null döner.
   */
  const bitir = useCallback(async (): Promise<KayitSonucu | null> => {
    if (phase !== 'kayitta') return null;

    const gecenSn = Math.round((Date.now() - baslangic.current) / 1000);
    await transcriber.current?.stop();
    transcriber.current = null;
    setKonusuyor(false);

    const ad = sesAdi.current;
    const canli = birlestir();
    const yol = ad ? `${SES_DIZINI}/${ad}` : null;
    const sesVar = !!yol && (await exists(yol));

    setPhase('duzeltiliyor');

    let metin = canli;
    let duzeltildi = false;

    try {
      if (sesVar) {
        if (!finalCtx.current) {
          setHazirlikMesaji('Düzeltme modeli hazırlanıyor…');
          await ensureModel('final', setIndirme);
          setIndirme(null);
          finalCtx.current = await initWhisper({
            filePath: modelPath('final'),
            useGpu: true,
            useCoreMLIos: true,
          });
          setHazirlikMesaji('');
        }

        const { promise } = finalCtx.current.transcribe(yol!, {
          language: 'tr',
          // Burada doğruluk önemli: beam search + sıcaklık geri çekilmesi.
          beamSize: 5,
          bestOf: 5,
          temperature: 0,
          temperatureInc: 0.2,
          maxThreads: 4,
        });
        const { result } = await promise;
        const temiz = result.trim();
        if (temiz) {
          metin = temiz;
          duzeltildi = true;
        }
      }
    } catch (e: any) {
      // Düzeltme başarısız olsa bile canlı metni kaybetmeyelim.
      setHata(e?.message ?? String(e));
    } finally {
      setHazirlikMesaji('');
      setPhase('hazir');
    }

    // Ne ses ne metin varsa kaydedecek bir şey yok.
    if (!metin && !sesVar) return null;

    return {
      id: `${baslangic.current}`,
      createdAt: baslangic.current,
      text: metin,
      liveText: canli,
      isCorrected: duzeltildi,
      audioFile: sesVar ? ad : null,
      durationSec: gecenSn,
    };
  }, [phase]);

  /** Kayda başlamadan ekranı temizler. */
  const temizle = useCallback(() => {
    slices.current.clear();
    setLiveText('');
    setSureSn(0);
  }, []);

  return {
    phase,
    liveText,
    konusuyor,
    hazirlikMesaji,
    indirme,
    hata,
    sureSn,
    basla,
    bitir,
    temizle,
  };
}
