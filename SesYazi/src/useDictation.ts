/**
 * Dikte motoru.
 *
 * Tek mikrofon açılışıyla iki şey birden yapıyoruz:
 *
 *   1. CANLI   — RealtimeTranscriber sesi VAD ile dilimleyip küçük "base"
 *                modeline veriyor, kelimeler konuşurken ekrana düşüyor.
 *   2. DÜZELTME — aynı akış `audioOutputPath` ile WAV olarak diske de
 *                yazılıyor. Kayıt bitince bu WAV daha büyük "small"
 *                modeliyle baştan çevriliyor ve canlı metnin yerini alıyor.
 *
 * İkinci bir mikrofon açmaya gerek yok; ses tek kaynaktan geliyor.
 * Hiçbir aşamada ses cihazdan çıkmıyor.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
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
import {AudioPcmStreamAdapter} from 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter';
import {
  DocumentDirectoryPath,
  appendFile,
  exists,
  mkdir,
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

const RECORDING_DIR = `${DocumentDirectoryPath}/kayitlar`;

export type Phase =
  | 'hazirlaniyor' // modeller indiriliyor / belleğe yükleniyor
  | 'hazir'
  | 'kayitta'
  | 'duzeltiliyor' // kayıt bitti, small model çalışıyor
  | 'hata';

export function useDictation() {
  const [phase, setPhase] = useState<Phase>('hazirlaniyor');
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [konusuyor, setKonusuyor] = useState(false);
  const [hazirlikMesaji, setHazirlikMesaji] = useState('Başlatılıyor…');
  const [indirme, setIndirme] = useState<DownloadProgress | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sureSn, setSureSn] = useState(0);

  const liveCtx = useRef<WhisperContext | null>(null);
  const finalCtx = useRef<WhisperContext | null>(null);
  const vadCtx = useRef<WhisperVadContext | null>(null);
  const transcriber = useRef<RealtimeTranscriber | null>(null);
  const wavPath = useRef<string | null>(null);

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
            if (!iptal) {
              setIndirme(p);
            }
          });
          setIndirme(null);
        };

        // Sadece kayda başlamak için gerekenler. "small" modelini ilk
        // düzeltmeye kadar bekletiyoruz ki uygulama daha çabuk açılsın.
        await indir('vad', 'Konuşma algılayıcı indiriliyor…');
        await indir('live', 'Canlı model indiriliyor…');
        if (iptal) {
          return;
        }

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
        if (iptal) {
          return;
        }

        await mkdir(RECORDING_DIR);
        setPhase('hazir');
        setHazirlikMesaji('');
      } catch (e: any) {
        if (iptal) {
          return;
        }
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
    if (phase !== 'kayitta') {
      return;
    }
    const t = setInterval(() => setSureSn(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const basla = useCallback(async () => {
    if (phase !== 'hazir' || !liveCtx.current || !vadCtx.current) {
      return;
    }

    slices.current.clear();
    setLiveText('');
    setFinalText('');
    setHata(null);
    setSureSn(0);

    const path = `${RECORDING_DIR}/kayit-${Date.now()}.wav`;
    wavPath.current = path;

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
        audioOutputPath: path,
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
          setKonusuyor(ev.type === 'speech_start' || ev.type === 'speech_continue'),
        onError: e => setHata(e),
      },
    );

    await transcriber.current.start();
    setPhase('kayitta');
  }, [phase]);

  const bitir = useCallback(async () => {
    if (phase !== 'kayitta') {
      return;
    }

    await transcriber.current?.stop();
    transcriber.current = null;
    setKonusuyor(false);
    setPhase('duzeltiliyor');

    try {
      const path = wavPath.current;
      if (!path || !(await exists(path))) {
        // Ses dosyası yoksa elimizdeki tek şey canlı metin.
        setPhase('hazir');
        return;
      }

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

      const {promise} = finalCtx.current.transcribe(path, {
        language: 'tr',
        // Burada doğruluk önemli: beam search + sıcaklık geri çekilmesi.
        beamSize: 5,
        bestOf: 5,
        temperature: 0,
        temperatureInc: 0.2,
        maxThreads: 4,
      });
      const {result} = await promise;
      setFinalText(result.trim());
    } catch (e: any) {
      setHata(e?.message ?? String(e));
    } finally {
      setHazirlikMesaji('');
      setPhase('hazir');
    }
  }, [phase]);

  const temizle = useCallback(() => {
    slices.current.clear();
    setLiveText('');
    setFinalText('');
    setSureSn(0);
  }, []);

  return {
    phase,
    liveText,
    finalText,
    /** Kullanıcıya gösterilecek en iyi metin. */
    displayText: finalText || liveText,
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
