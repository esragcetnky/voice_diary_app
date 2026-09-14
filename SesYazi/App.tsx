/**
 * SesYazi — cihaz üstünde çalışan Türkçe dikte uygulaması.
 * Ses internete gitmez; tüm çeviri telefonun içinde yapılır.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {useDictation} from './src/useDictation';
import {formatMB} from './src/models';

const sureBicimle = (sn: number) =>
  `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}`;

function App(): React.JSX.Element {
  const karanlik = useColorScheme() === 'dark';
  const t = karanlik ? koyu : acik;

  const {
    phase,
    liveText,
    finalText,
    displayText,
    konusuyor,
    hazirlikMesaji,
    indirme,
    hata,
    sureSn,
    basla,
    bitir,
    temizle,
  } = useDictation();

  const [kopyalandi, setKopyalandi] = React.useState(false);

  const kopyala = () => {
    Clipboard.setString(displayText);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  };

  const kayitta = phase === 'kayitta';
  const mesgul = phase === 'hazirlaniyor' || phase === 'duzeltiliyor';

  return (
    <SafeAreaView style={[s.kok, {backgroundColor: t.zemin}]}>
      <StatusBar barStyle={karanlik ? 'light-content' : 'dark-content'} />

      {/* Başlık */}
      <View style={s.baslikSatiri}>
        <View>
          <Text style={[s.baslik, {color: t.metin}]}>SesYazi</Text>
          <Text style={[s.altBaslik, {color: t.soluk}]}>
            Çevrimdışı Türkçe dikte
          </Text>
        </View>
        {!!displayText && !mesgul && (
          <Pressable onPress={temizle} hitSlop={12}>
            <Text style={[s.metinDugme, {color: t.soluk}]}>Temizle</Text>
          </Pressable>
        )}
      </View>

      {/* Metin alanı */}
      <ScrollView
        style={[s.kagit, {backgroundColor: t.kart, borderColor: t.cizgi}]}
        contentContainerStyle={s.kagitIc}>
        {displayText ? (
          <Text style={[s.cikti, {color: t.metin}]} selectable>
            {displayText}
          </Text>
        ) : (
          <Text style={[s.yerTutucu, {color: t.soluk}]}>
            {kayitta
              ? 'Dinliyorum… konuşmaya başlayın.'
              : 'Mikrofona dokunup konuşun. Söyledikleriniz burada belirecek.'}
          </Text>
        )}
      </ScrollView>

      {/* Durum rozeti */}
      <View style={s.rozetSatiri}>
        {kayitta && (
          <View style={[s.rozet, {backgroundColor: t.canliZemin}]}>
            <View
              style={[
                s.nokta,
                {backgroundColor: konusuyor ? t.canli : t.soluk},
              ]}
            />
            <Text style={[s.rozetMetin, {color: t.canli}]}>
              {konusuyor ? 'Konuşma algılandı' : 'Sessizlik'} ·{' '}
              {sureBicimle(sureSn)}
            </Text>
          </View>
        )}

        {phase === 'duzeltiliyor' && (
          <View style={[s.rozet, {backgroundColor: t.bilgiZemin}]}>
            <ActivityIndicator size="small" color={t.bilgi} />
            <Text style={[s.rozetMetin, {color: t.bilgi}]}>
              {hazirlikMesaji || 'Metin düzeltiliyor…'}
            </Text>
          </View>
        )}

        {!!finalText && phase === 'hazir' && (
          <View style={[s.rozet, {backgroundColor: t.iyiZemin}]}>
            <Text style={[s.rozetMetin, {color: t.iyi}]}>
              ✓ Düzeltilmiş metin
            </Text>
          </View>
        )}

        {!finalText && !!liveText && phase === 'hazir' && (
          <View style={[s.rozet, {backgroundColor: t.bilgiZemin}]}>
            <Text style={[s.rozetMetin, {color: t.bilgi}]}>Canlı metin</Text>
          </View>
        )}
      </View>

      {/* Hazırlık / indirme */}
      {phase === 'hazirlaniyor' && (
        <View style={[s.kutu, {backgroundColor: t.kart, borderColor: t.cizgi}]}>
          <View style={s.kutuBaslik}>
            <ActivityIndicator size="small" color={t.bilgi} />
            <Text style={[s.kutuMetin, {color: t.metin}]}>
              {hazirlikMesaji}
            </Text>
          </View>
          {indirme && (
            <>
              <View style={[s.cubukDis, {backgroundColor: t.cizgi}]}>
                <View
                  style={[
                    s.cubukIc,
                    {
                      backgroundColor: t.bilgi,
                      width: `${Math.round(indirme.ratio * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[s.kucukMetin, {color: t.soluk}]}>
                {formatMB(indirme.receivedBytes)} / {formatMB(indirme.totalBytes)}
                {'  ·  tek seferlik indirme'}
              </Text>
            </>
          )}
        </View>
      )}

      {!!hata && (
        <View style={[s.kutu, {backgroundColor: t.kotuZemin, borderColor: t.kotu}]}>
          <Text style={[s.kutuMetin, {color: t.kotu}]}>{hata}</Text>
        </View>
      )}

      {/* Alt kontroller */}
      <View style={s.altBar}>
        <Pressable
          onPress={kopyala}
          disabled={!displayText}
          style={[
            s.yanDugme,
            {borderColor: t.cizgi, opacity: displayText ? 1 : 0.35},
          ]}>
          <Text style={[s.yanDugmeMetin, {color: t.metin}]}>
            {kopyalandi ? '✓ Kopyalandı' : 'Kopyala'}
          </Text>
        </Pressable>

        <Pressable
          onPress={kayitta ? bitir : basla}
          disabled={mesgul}
          style={({pressed}) => [
            s.mikDugme,
            {
              backgroundColor: kayitta ? t.canli : t.vurgu,
              opacity: mesgul ? 0.4 : pressed ? 0.8 : 1,
              transform: [{scale: pressed ? 0.96 : 1}],
            },
          ]}>
          {mesgul ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.mikIkon}>{kayitta ? '■' : '●'}</Text>
          )}
        </Pressable>

        {/* Simetri için boşluk — mikrofon tam ortada kalsın */}
        <View style={[s.yanDugme, s.gorunmez]} />
      </View>

      <Text style={[s.dipnot, {color: t.soluk}]}>
        Sesiniz cihazdan çıkmaz. Modeller indirildikten sonra uçak modunda
        da çalışır.
      </Text>
    </SafeAreaView>
  );
}

const acik = {
  zemin: '#F7F7F8',
  kart: '#FFFFFF',
  cizgi: '#E3E3E6',
  metin: '#16161A',
  soluk: '#8A8A92',
  vurgu: '#2D6BE4',
  canli: '#D8342B',
  canliZemin: '#FDECEA',
  bilgi: '#2D6BE4',
  bilgiZemin: '#EAF1FD',
  iyi: '#1B7F4B',
  iyiZemin: '#E7F5ED',
  kotu: '#C0392B',
  kotuZemin: '#FDECEA',
};

const koyu = {
  zemin: '#0E0E11',
  kart: '#1A1A1F',
  cizgi: '#2C2C33',
  metin: '#F2F2F5',
  soluk: '#8A8A92',
  vurgu: '#4C8DFF',
  canli: '#FF6B5E',
  canliZemin: '#2A1614',
  bilgi: '#4C8DFF',
  bilgiZemin: '#131E30',
  iyi: '#4ADE80',
  iyiZemin: '#12241A',
  kotu: '#FF6B5E',
  kotuZemin: '#2A1614',
};

const s = StyleSheet.create({
  kok: {flex: 1, paddingHorizontal: 20},
  baslikSatiri: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 16,
  },
  baslik: {fontSize: 28, fontWeight: '700', letterSpacing: -0.5},
  altBaslik: {fontSize: 13, marginTop: 2},
  metinDugme: {fontSize: 15, fontWeight: '500'},
  kagit: {flex: 1, borderRadius: 16, borderWidth: 1},
  kagitIc: {padding: 18},
  cikti: {fontSize: 19, lineHeight: 29},
  yerTutucu: {fontSize: 16, lineHeight: 24},
  rozetSatiri: {minHeight: 40, justifyContent: 'center', alignItems: 'center'},
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  nokta: {width: 8, height: 8, borderRadius: 4},
  rozetMetin: {fontSize: 13, fontWeight: '600'},
  kutu: {borderRadius: 14, borderWidth: 1, padding: 14, gap: 10},
  kutuBaslik: {flexDirection: 'row', alignItems: 'center', gap: 10},
  kutuMetin: {fontSize: 14, fontWeight: '500', flexShrink: 1},
  kucukMetin: {fontSize: 12},
  cubukDis: {height: 6, borderRadius: 3, overflow: 'hidden'},
  cubukIc: {height: 6, borderRadius: 3},
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  yanDugme: {
    minWidth: 96,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  gorunmez: {opacity: 0, borderWidth: 0},
  yanDugmeMetin: {fontSize: 15, fontWeight: '600'},
  mikDugme: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mikIkon: {color: '#FFFFFF', fontSize: 26},
  dipnot: {fontSize: 11, textAlign: 'center', paddingBottom: 10, lineHeight: 16},
});

export default App;
