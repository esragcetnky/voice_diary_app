/** Kayıt detayı — sesi dinle, metni oku/düzenle, kopyala, sil. */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { yazi, olcu, type Theme } from '../theme';
import { kelimeSayisi, sure, tamTarih } from '../format';
import { sesYolu, type Entry } from '../entries';
import { usePlayer } from '../usePlayer';

type Props = {
  t: Theme;
  entry: Entry;
  onGeri: () => void;
  onKaydet: (id: string, metin: string) => void;
  onSil: (id: string) => void;
};

export function DetailScreen({ t, entry, onGeri, onKaydet, onSil }: Props) {
  const [duzenle, setDuzenle] = useState(false);
  const [taslak, setTaslak] = useState(entry.text);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hamGoster, setHamGoster] = useState(false);

  const cubukGenislik = useRef(1);
  const p = usePlayer(sesYolu(entry));

  const oran = p.uzunluk > 0 ? p.konum / p.uzunluk : 0;

  const kopyala = () => {
    Clipboard.setString(entry.text);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  };

  const silSor = () => {
    Alert.alert(
      'Kayıt silinsin mi?',
      'Bu kaydın metni ve ses dosyası kalıcı olarak silinecek. Geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => onSil(entry.id) },
      ],
    );
  };

  const kaydet = () => {
    onKaydet(entry.id, taslak.trim());
    setDuzenle(false);
  };

  const hamFarkli =
    entry.isCorrected && entry.liveText.trim() && entry.liveText !== entry.text;

  return (
    <View style={[s.kok, { backgroundColor: t.zemin }]}>
      {/* Üst bar */}
      <View style={s.ust}>
        <Pressable onPress={onGeri} hitSlop={14} style={s.geri}>
          <Text style={[s.geriOk, { color: t.vurgu }]}>‹</Text>
          <Text style={[yazi.altBaslik, { color: t.vurgu }]}>Günlüğüm</Text>
        </Pressable>

        {duzenle ? (
          <Pressable onPress={kaydet} hitSlop={14}>
            <Text style={[yazi.altBaslik, { color: t.vurgu }]}>Bitti</Text>
          </Pressable>
        ) : (
          entry.text.length > 0 && (
            <Pressable
              onPress={() => {
                setTaslak(entry.text);
                setDuzenle(true);
              }}
              hitSlop={14}
            >
              <Text style={[yazi.altBaslik, { color: t.vurgu }]}>Düzenle</Text>
            </Pressable>
          )
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.icerik}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        {/* Tarih */}
        <Text style={[yazi.baslik, { color: t.metin }]}>
          {tamTarih(entry.createdAt)}
        </Text>
        <View style={s.etiketSatiri}>
          <Text style={[yazi.kucuk, { color: t.soluk }]}>
            {kelimeSayisi(entry.text)} kelime · {sure(entry.durationSec)}
          </Text>
          {entry.isCorrected ? (
            <View style={[s.etiket, { backgroundColor: t.iyiZemin }]}>
              <Text style={[yazi.minik, { color: t.iyi }]}>düzeltilmiş</Text>
            </View>
          ) : (
            <View style={[s.etiket, { backgroundColor: t.uyariZemin }]}>
              <Text style={[yazi.minik, { color: t.uyari }]}>ham metin</Text>
            </View>
          )}
          {entry.isEdited && (
            <View style={[s.etiket, { backgroundColor: t.zeminIkincil }]}>
              <Text style={[yazi.minik, { color: t.metinIkincil }]}>
                elle düzenlendi
              </Text>
            </View>
          )}
        </View>

        {/* Ses oynatıcı */}
        {entry.audioFile ? (
          <View
            style={[
              s.oynatici,
              { backgroundColor: t.kart, borderColor: t.cizgi },
            ]}
          >
            <Pressable
              onPress={p.degistir}
              disabled={!p.hazir}
              accessibilityLabel={p.caliyor ? 'Duraklat' : 'Oynat'}
              style={({ pressed }) => [
                s.oynatDugme,
                {
                  backgroundColor: t.vurgu,
                  opacity: !p.hazir ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}
            >
              {p.yukleniyor ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : p.caliyor ? (
                <View style={s.duraklatIkon}>
                  <View style={s.duraklatCubuk} />
                  <View style={s.duraklatCubuk} />
                </View>
              ) : (
                <View style={s.oynatIkon} />
              )}
            </Pressable>

            <View style={s.cubukAlani}>
              <Pressable
                onLayout={e => {
                  cubukGenislik.current = e.nativeEvent.layout.width || 1;
                }}
                onPress={e =>
                  p.atla(e.nativeEvent.locationX / cubukGenislik.current)
                }
                style={s.cubukVurus}
              >
                <View style={[s.cubukDis, { backgroundColor: t.cizgi }]}>
                  <View
                    style={[
                      s.cubukIc,
                      { backgroundColor: t.vurgu, width: `${oran * 100}%` },
                    ]}
                  />
                </View>
              </Pressable>
              <View style={s.zamanSatiri}>
                <Text style={[yazi.minik, { color: t.soluk }]}>
                  {sure(p.konum)}
                </Text>
                <Text style={[yazi.minik, { color: t.soluk }]}>
                  {sure(p.uzunluk || entry.durationSec)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.sesYok, { backgroundColor: t.zeminIkincil }]}>
            <Text style={[yazi.ikincil, { color: t.soluk }]}>
              Bu kaydın ses dosyası yok.
            </Text>
          </View>
        )}

        {!!p.hata && (
          <Text style={[yazi.kucuk, s.hataMetni, { color: t.kotu }]}>
            {p.hata}
          </Text>
        )}

        {/* Metin */}
        {duzenle ? (
          <TextInput
            value={taslak}
            onChangeText={setTaslak}
            multiline
            autoFocus
            textAlignVertical="top"
            style={[
              s.duzenleAlani,
              {
                backgroundColor: t.kart,
                borderColor: t.vurgu,
                color: t.metin,
              },
            ]}
          />
        ) : entry.text ? (
          <Text
            style={[yazi.govdeGunluk, { color: t.metin }, s.metin]}
            selectable
          >
            {entry.text}
          </Text>
        ) : (
          <Text style={[yazi.govde, { color: t.soluk }, s.metin]}>
            Bu kayıtta metin yok. Konuşma algılanmamış olabilir.
          </Text>
        )}

        {/* Ham metin karşılaştırması */}
        {hamFarkli && !duzenle && (
          <View style={s.hamAlani}>
            <Pressable onPress={() => setHamGoster(v => !v)} hitSlop={8}>
              <Text style={[yazi.kucuk, { color: t.vurgu }]}>
                {hamGoster
                  ? 'Ham metni gizle'
                  : 'Canlı modun ham metnini göster'}
              </Text>
            </Pressable>
            {hamGoster && (
              <View
                style={[
                  s.hamKutu,
                  {
                    backgroundColor: t.zeminIkincil,
                    borderColor: t.cizgiSolgun,
                  },
                ]}
              >
                <Text style={[yazi.ikincil, { color: t.metinIkincil }]}>
                  {entry.liveText}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* İşlemler */}
        {!duzenle && (
          <View style={s.islemler}>
            <Pressable
              onPress={kopyala}
              disabled={!entry.text}
              style={({ pressed }) => [
                s.islemDugme,
                {
                  borderColor: t.cizgi,
                  opacity: !entry.text ? 0.35 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[yazi.altBaslik, { color: t.metin }]}>
                {kopyalandi ? '✓ Kopyalandı' : 'Metni kopyala'}
              </Text>
            </Pressable>

            <Pressable
              onPress={silSor}
              style={({ pressed }) => [
                s.islemDugme,
                { borderColor: t.kotu, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[yazi.altBaslik, { color: t.kotu }]}>Kaydı sil</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1, paddingHorizontal: olcu.kenar },
  ust: {
    paddingTop: 6,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  geri: { flexDirection: 'row', alignItems: 'center' },
  geriOk: { fontSize: 30, marginRight: 3, marginTop: -4, fontWeight: '400' },
  icerik: { paddingTop: 14, paddingBottom: 40 },
  etiketSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  etiket: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  oynatici: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: olcu.radyus,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  oynatDugme: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oynatIkon: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  duraklatIkon: { flexDirection: 'row', gap: 5 },
  duraklatCubuk: {
    width: 4.5,
    height: 17,
    borderRadius: 1.5,
    backgroundColor: '#fff',
  },
  cubukAlani: { flex: 1, gap: 6 },
  cubukVurus: { paddingVertical: 8 },
  cubukDis: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  cubukIc: { height: 5, borderRadius: 2.5 },
  zamanSatiri: { flexDirection: 'row', justifyContent: 'space-between' },
  sesYok: { borderRadius: olcu.radyusKucuk, padding: 14, marginTop: 18 },
  metin: { marginTop: 22 },
  hataMetni: { marginTop: 8 },
  duzenleAlani: {
    marginTop: 22,
    minHeight: 220,
    borderRadius: olcu.radyus,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 18,
    lineHeight: 28,
  },
  hamAlani: { marginTop: 20, gap: 10 },
  hamKutu: { borderRadius: olcu.radyusKucuk, borderWidth: 1, padding: 14 },
  islemler: { marginTop: 30, gap: 10 },
  islemDugme: {
    borderWidth: 1,
    borderRadius: olcu.radyusKucuk,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
