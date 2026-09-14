/** Kayıt ekranı — mikrofon, canlı metin, hazırlık durumu. */
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { yazi, olcu, type Theme } from '../theme';
import { formatMB, gunBasligi, sure, tamTarih } from '../format';
import type { DownloadProgress } from '../models';
import type { Phase } from '../useDictation';

type Props = {
  t: Theme;
  phase: Phase;
  liveText: string;
  konusuyor: boolean;
  hazirlikMesaji: string;
  indirme: DownloadProgress | null;
  hata: string | null;
  sureSn: number;
  kayitSayisi: number;
  onBasla: () => void;
  onBitir: () => void;
  onGunluk: () => void;
};

export function RecordScreen({
  t,
  phase,
  liveText,
  konusuyor,
  hazirlikMesaji,
  indirme,
  hata,
  sureSn,
  kayitSayisi,
  onBasla,
  onBitir,
  onGunluk,
}: Props) {
  const kayitta = phase === 'kayitta';
  const mesgul = phase === 'hazirlaniyor' || phase === 'duzeltiliyor';

  // Konuşma algılandığında mikrofonun etrafında genişleyen halka
  const nabiz = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!kayitta || !konusuyor) {
      nabiz.stopAnimation();
      nabiz.setValue(0);
      return;
    }
    const dongu = Animated.loop(
      Animated.timing(nabiz, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    dongu.start();
    return () => dongu.stop();
  }, [kayitta, konusuyor, nabiz]);

  return (
    <View style={[s.kok, { backgroundColor: t.zemin }]}>
      {/* Başlık */}
      <View style={s.baslikAlani}>
        <Text style={[yazi.baslikBuyuk, { color: t.metin }]}>
          {gunBasligi(Date.now())}
        </Text>
        <Text style={[yazi.ikincil, s.altSatir, { color: t.soluk }]}>
          {tamTarih(Date.now()).split(',')[0]}
        </Text>
      </View>

      {/* Canlı metin */}
      <ScrollView
        style={[s.kagit, { backgroundColor: t.kart, borderColor: t.cizgi }]}
        contentContainerStyle={s.kagitIc}
      >
        {liveText ? (
          <Text style={[yazi.govdeGunluk, { color: t.metin }]} selectable>
            {liveText}
          </Text>
        ) : (
          <View style={s.bosAlan}>
            <Text style={[s.bosBaslik, { color: t.metinIkincil }]}>
              {kayitta ? 'Dinliyorum…' : 'Bugün ne oldu?'}
            </Text>
            <Text style={[yazi.ikincil, s.ortali, { color: t.soluk }]}>
              {kayitta
                ? 'Konuşmaya başlayın, kelimeler burada belirecek.'
                : 'Mikrofona dokunup anlatın. Hem sesiniz hem\nyazıya dökülmüş hâli günlüğünüze kaydedilir.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Durum */}
      <View style={s.durumAlani}>
        {kayitta && (
          <View style={[s.rozet, { backgroundColor: t.canliZemin }]}>
            <View
              style={[
                s.nokta,
                { backgroundColor: konusuyor ? t.canli : t.soluk },
              ]}
            />
            <Text style={[yazi.kucuk, { color: t.canli }]}>
              {konusuyor ? 'Konuşma algılandı' : 'Sessizlik'} · {sure(sureSn)}
            </Text>
          </View>
        )}

        {phase === 'duzeltiliyor' && (
          <View style={[s.rozet, { backgroundColor: t.vurguZemin }]}>
            <ActivityIndicator size="small" color={t.vurgu} />
            <Text style={[yazi.kucuk, { color: t.vurgu }]}>
              {hazirlikMesaji || 'Metin düzeltiliyor…'}
            </Text>
          </View>
        )}
      </View>

      {/* Model indirme */}
      {phase === 'hazirlaniyor' && (
        <View
          style={[s.kutu, { backgroundColor: t.kart, borderColor: t.cizgi }]}
        >
          <View style={s.kutuSatir}>
            <ActivityIndicator size="small" color={t.vurgu} />
            <Text style={[yazi.ikincil, s.esnek, { color: t.metin }]}>
              {hazirlikMesaji}
            </Text>
          </View>
          {indirme && (
            <>
              <View style={[s.cubukDis, { backgroundColor: t.cizgi }]}>
                <View
                  style={[
                    s.cubukIc,
                    {
                      backgroundColor: t.vurgu,
                      width: `${Math.round(indirme.ratio * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[yazi.kucuk, { color: t.soluk }]}>
                {formatMB(indirme.receivedBytes)} /{' '}
                {formatMB(indirme.totalBytes)} · tek seferlik indirme
              </Text>
            </>
          )}
        </View>
      )}

      {!!hata && (
        <View
          style={[
            s.kutu,
            { backgroundColor: t.kotuZemin, borderColor: t.kotu },
          ]}
        >
          <Text style={[yazi.ikincil, { color: t.kotu }]}>{hata}</Text>
        </View>
      )}

      {/* Mikrofon */}
      <View style={s.altAlan}>
        <View style={s.mikSarmal}>
          {kayitta && konusuyor && (
            <Animated.View
              pointerEvents="none"
              style={[
                s.halka,
                {
                  borderColor: t.canli,
                  opacity: nabiz.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 0],
                  }),
                  transform: [
                    {
                      scale: nabiz.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.8],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          <Pressable
            onPress={kayitta ? onBitir : onBasla}
            disabled={mesgul}
            accessibilityLabel={kayitta ? 'Kaydı bitir' : 'Kayda başla'}
            style={({ pressed }) => [
              s.mik,
              {
                backgroundColor: kayitta ? t.canli : t.vurgu,
                opacity: mesgul ? 0.4 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            {mesgul ? (
              <ActivityIndicator color="#fff" />
            ) : kayitta ? (
              <View style={s.kare} />
            ) : (
              <View style={s.daire} />
            )}
          </Pressable>
        </View>

        <Text style={[yazi.kucuk, s.mikIpucu, { color: t.soluk }]}>
          {kayitta
            ? 'Bitirmek için dokunun'
            : mesgul
            ? 'Lütfen bekleyin'
            : 'Kayda başlamak için dokunun'}
        </Text>

        <Pressable
          onPress={onGunluk}
          disabled={kayitta}
          style={({ pressed }) => [
            s.gunlukDugme,
            {
              backgroundColor: t.zeminIkincil,
              opacity: kayitta ? 0.3 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[yazi.altBaslik, { color: t.metin }]}>Günlüğüm</Text>
          {kayitSayisi > 0 && (
            <View style={[s.sayac, { backgroundColor: t.vurgu }]}>
              <Text style={[yazi.minik, { color: t.vurguMetin }]}>
                {kayitSayisi}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1, paddingHorizontal: olcu.kenar },
  baslikAlani: { paddingTop: 8, paddingBottom: 18 },
  kagit: { flex: 1, borderRadius: olcu.radyus, borderWidth: 1 },
  kagitIc: { padding: 20, flexGrow: 1 },
  bosAlan: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bosBaslik: { fontSize: 19, fontWeight: '600' },
  durumAlani: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nokta: { width: 8, height: 8, borderRadius: 4 },
  kutu: {
    borderRadius: olcu.radyusKucuk,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  kutuSatir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cubukDis: { height: 6, borderRadius: 3, overflow: 'hidden' },
  cubukIc: { height: 6, borderRadius: 3 },
  altAlan: { alignItems: 'center', paddingBottom: 8 },
  altSatir: { marginTop: 2 },
  ortali: { textAlign: 'center' },
  esnek: { flexShrink: 1 },
  mikIpucu: { marginTop: 14 },
  mikSarmal: { alignItems: 'center', justifyContent: 'center' },
  halka: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
  },
  mik: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daire: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff' },
  kare: { width: 26, height: 26, borderRadius: 5, backgroundColor: '#fff' },
  gunlukDugme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  sayac: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
