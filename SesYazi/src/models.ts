/**
 * Model kayıt defteri ve indirme yöneticisi.
 *
 * Modeller uygulamaya gömülmez, ilk açılışta indirilir. Sebebi:
 * gömülü 180 MB'lık bir IPA'yı Sideloadly ile her hafta yeniden
 * imzalamak eziyet olur. İndirme tek seferliktir; sonrasında
 * uygulama uçak modunda da çalışır (ses asla cihazdan çıkmaz).
 *
 * Modelleri gömmek isterseniz README'deki "Modeli gömme" bölümüne bakın.
 */
import {
  DocumentDirectoryPath,
  downloadFile,
  exists,
  mkdir,
  stat,
  unlink,
} from '@dr.pogodin/react-native-fs';

export const MODEL_DIR = `${DocumentDirectoryPath}/models`;

export type ModelRole = 'live' | 'final' | 'vad';

export type ModelSpec = {
  role: ModelRole;
  /** Diskteki dosya adı. */
  file: string;
  url: string;
  /** Beklenen boyut (bayt). İndirmenin tam bittiğini doğrulamak için. */
  bytes: number;
  label: string;
  note: string;
};

/**
 * Aşama 1: resmi çok-dilli whisper modelleri. Türkçe'yi zaten destekliyorlar.
 *
 * Aşama 2'de Türkçe fine-tune'a geçmek için:
 *   1. `.github/workflows/convert-model.yml` iş akışını çalıştırın
 *   2. çıkan .bin dosyasını bir yere yükleyin (GitHub Release yeterli)
 *   3. aşağıdaki `url`, `file` ve `bytes` alanlarını güncelleyin
 * Uygulama kodunun geri kalanı değişmez.
 */
export const MODELS: Record<ModelRole, ModelSpec> = {
  live: {
    role: 'live',
    file: 'ggml-base-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    bytes: 59_700_000,
    label: 'Canlı model (base)',
    note: 'Konuşurken anlık yazı için. Hızlı, orta doğrulukta.',
  },
  final: {
    role: 'final',
    file: 'ggml-small-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    bytes: 190_100_000,
    label: 'Düzeltme modeli (small)',
    note: 'Kayıt bitince metni baştan, daha doğru şekilde yazar.',
  },
  vad: {
    role: 'vad',
    file: 'ggml-silero-v6.2.0.bin',
    url: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin',
    bytes: 864_000,
    label: 'Konuşma algılayıcı (Silero VAD)',
    note: 'Sessizlikleri atlar, cümle bitişlerini yakalar.',
  },
};

export const modelPath = (role: ModelRole) => `${MODEL_DIR}/${MODELS[role].file}`;

/**
 * Dosya var mı ve boyutu makul mü? Yarım kalmış indirmeler
 * whisper'ı çalışma anında çökerttiği için boyut da kontrol ediliyor.
 * Beklenen değerler yaklaşık olduğundan %5 tolerans bırakıyoruz.
 */
export async function isModelReady(role: ModelRole): Promise<boolean> {
  const path = modelPath(role);
  if (!(await exists(path))) return false;
  const { size } = await stat(path);
  return Number(size) >= MODELS[role].bytes * 0.95;
}

export type DownloadProgress = {
  role: ModelRole;
  /** 0..1 */
  ratio: number;
  receivedBytes: number;
  totalBytes: number;
};

/**
 * Tek bir modeli indirir. Zaten varsa hiçbir şey yapmaz.
 * Yarım kalmış dosya bulursa siler ve baştan indirir — HTTP range
 * ile devam etmek HF'in CDN yönlendirmeleriyle güvenilir çalışmıyor.
 */
export async function ensureModel(
  role: ModelRole,
  onProgress?: (p: DownloadProgress) => void,
): Promise<string> {
  const spec = MODELS[role];
  const path = modelPath(role);

  if (await isModelReady(role)) return path;
  if (await exists(path)) await unlink(path);

  await mkdir(MODEL_DIR);

  const { promise } = downloadFile({
    fromUrl: spec.url,
    toFile: path,
    background: true,
    discretionary: false,
    cacheable: false,
    progressInterval: 250,
    progress: ({ bytesWritten, contentLength }) => {
      const total = contentLength > 0 ? contentLength : spec.bytes;
      onProgress?.({
        role,
        ratio: Math.min(1, bytesWritten / total),
        receivedBytes: bytesWritten,
        totalBytes: total,
      });
    },
  });

  const { statusCode } = await promise;
  if (statusCode !== 200) {
    // Bozuk dosyayı bırakma, yoksa isModelReady bir daha denemez
    if (await exists(path)) await unlink(path);
    throw new Error(`${spec.label} indirilemedi (HTTP ${statusCode})`);
  }

  return path;
}

export const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
