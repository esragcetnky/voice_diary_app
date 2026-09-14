/**
 * SesYazi — cihaz üstünde çalışan Türkçe sesli günlük.
 *
 * Her kayıt hem ses (WAV) hem metin olarak saklanır.
 * Ses internete gitmez; tüm çeviri telefonun içinde yapılır.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import { acik, koyu } from './src/theme';
import { useDictation } from './src/useDictation';
import { ekle, guncelle, sil, tumKayitlar, type Entry } from './src/entries';
import { RecordScreen } from './src/screens/RecordScreen';
import { ListScreen } from './src/screens/ListScreen';
import { DetailScreen } from './src/screens/DetailScreen';

type Ekran = { ad: 'kayit' } | { ad: 'liste' } | { ad: 'detay'; id: string };

function App(): React.JSX.Element {
  const karanlik = useColorScheme() === 'dark';
  const t = karanlik ? koyu : acik;

  const [ekran, setEkran] = useState<Ekran>({ ad: 'kayit' });
  const [entries, setEntries] = useState<Entry[]>([]);

  const d = useDictation();

  // Geçişlerde hafif bir yumuşama
  const gecis = useRef(new Animated.Value(1)).current;
  const git = useCallback(
    (hedef: Ekran) => {
      gecis.setValue(0);
      setEkran(hedef);
      Animated.timing(gecis, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
    [gecis],
  );

  useEffect(() => {
    tumKayitlar().then(setEntries);
  }, []);

  /** Kaydı bitir, günlüğe yaz, detayını aç. */
  const bitirVeKaydet = useCallback(async () => {
    const sonuc = await d.bitir();
    if (!sonuc) {
      // Konuşma algılanmadı; kaydedecek bir şey yok.
      d.temizle();
      return;
    }
    const entry: Entry = { ...sonuc, isEdited: false };
    setEntries(await ekle(entry));
    d.temizle();
    git({ ad: 'detay', id: entry.id });
  }, [d, git]);

  const metniKaydet = useCallback(async (id: string, metin: string) => {
    setEntries(await guncelle(id, { text: metin, isEdited: true }));
  }, []);

  const kaydiSil = useCallback(
    async (id: string) => {
      setEntries(await sil(id));
      git({ ad: 'liste' });
    },
    [git],
  );

  const secili =
    ekran.ad === 'detay' ? entries.find(e => e.id === ekran.id) : undefined;

  return (
    <SafeAreaView style={[s.kok, { backgroundColor: t.zemin }]}>
      <StatusBar barStyle={karanlik ? 'light-content' : 'dark-content'} />
      <Animated.View style={[s.kok, { opacity: gecis }]}>
        {ekran.ad === 'kayit' && (
          <RecordScreen
            t={t}
            phase={d.phase}
            liveText={d.liveText}
            konusuyor={d.konusuyor}
            hazirlikMesaji={d.hazirlikMesaji}
            indirme={d.indirme}
            hata={d.hata}
            sureSn={d.sureSn}
            kayitSayisi={entries.length}
            onBasla={d.basla}
            onBitir={bitirVeKaydet}
            onGunluk={() => git({ ad: 'liste' })}
          />
        )}

        {ekran.ad === 'liste' && (
          <ListScreen
            t={t}
            entries={entries}
            onAc={id => git({ ad: 'detay', id })}
            onGeri={() => git({ ad: 'kayit' })}
          />
        )}

        {/* Kayıt silinmişse listeye geri düş */}
        {ekran.ad === 'detay' &&
          (secili ? (
            <DetailScreen
              t={t}
              entry={secili}
              onGeri={() => git({ ad: 'liste' })}
              onKaydet={metniKaydet}
              onSil={kaydiSil}
            />
          ) : (
            <ListScreen
              t={t}
              entries={entries}
              onAc={id => git({ ad: 'detay', id })}
              onGeri={() => git({ ad: 'kayit' })}
            />
          ))}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
});

export default App;
