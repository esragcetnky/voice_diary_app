/** Günlük listesi — kayıtlar güne göre gruplanmış. */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { yazi, olcu, type Theme } from '../theme';
import { gunAnahtari, gunBasligi, kelimeSayisi, saat, sure } from '../format';
import { ozet, type Entry } from '../entries';

type Props = {
  t: Theme;
  entries: Entry[];
  onAc: (id: string) => void;
  onGeri: () => void;
};

export function ListScreen({ t, entries, onAc, onGeri }: Props) {
  const [arama, setArama] = useState('');

  const bolumler = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    const suzulmus = q
      ? entries.filter(e => e.text.toLocaleLowerCase('tr-TR').includes(q))
      : entries;

    // Güne göre grupla; entries zaten yeniden eskiye sıralı geliyor.
    const gruplar = new Map<number, Entry[]>();
    for (const e of suzulmus) {
      const g = gunAnahtari(e.createdAt);
      const mevcut = gruplar.get(g);
      if (mevcut) mevcut.push(e);
      else gruplar.set(g, [e]);
    }

    return [...gruplar.entries()]
      .sort(([a], [b]) => b - a)
      .map(([gun, data]) => ({ gun, title: gunBasligi(gun), data }));
  }, [entries, arama]);

  const { adet, toplamSn } = ozet(entries);

  return (
    <View style={[s.kok, { backgroundColor: t.zemin }]}>
      {/* Başlık */}
      <View style={s.ust}>
        <Pressable onPress={onGeri} hitSlop={14} style={s.geri}>
          <Text style={[s.geriOk, { color: t.vurgu }]}>‹</Text>
          <Text style={[yazi.altBaslik, { color: t.vurgu }]}>Kayıt</Text>
        </Pressable>
      </View>

      <View style={s.baslikAlani}>
        <Text style={[yazi.baslikBuyuk, { color: t.metin }]}>Günlüğüm</Text>
        {adet > 0 && (
          <Text style={[yazi.ikincil, s.altSatir, { color: t.soluk }]}>
            {adet} kayıt · toplam {sure(toplamSn)}
          </Text>
        )}
      </View>

      {entries.length > 0 && (
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder="Kayıtlarda ara"
          placeholderTextColor={t.soluk}
          clearButtonMode="while-editing"
          style={[
            s.arama,
            {
              backgroundColor: t.zeminIkincil,
              color: t.metin,
              borderColor: t.cizgiSolgun,
            },
          ]}
        />
      )}

      <SectionList
        sections={bolumler}
        keyExtractor={e => e.id}
        contentContainerStyle={s.listeIc}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={s.bos}>
            <Text style={[s.bosBaslik, { color: t.metinIkincil }]}>
              {arama ? 'Eşleşen kayıt yok' : 'Henüz kayıt yok'}
            </Text>
            <Text style={[yazi.ikincil, s.ortali, { color: t.soluk }]}>
              {arama
                ? 'Başka bir kelime deneyin.'
                : 'Kayıt ekranına dönüp ilk günlüğünüzü\nsesli olarak bırakın.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[s.gunBaslik, { color: t.soluk }]}>
            {section.title.toLocaleUpperCase('tr-TR')}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onAc(item.id)}
            style={({ pressed }) => [
              s.satir,
              {
                backgroundColor: t.kart,
                borderColor: t.cizgi,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <View style={s.satirUst}>
              <Text style={[yazi.altBaslik, { color: t.metin }]}>
                {saat(item.createdAt)}
              </Text>
              <View style={s.satirEtiketler}>
                {item.isEdited && (
                  <Text style={[yazi.minik, { color: t.soluk }]}>
                    düzenlendi
                  </Text>
                )}
                {item.audioFile && (
                  <View
                    style={[s.sesEtiket, { backgroundColor: t.zeminIkincil }]}
                  >
                    <Text style={[yazi.minik, { color: t.metinIkincil }]}>
                      ♪ {sure(item.durationSec)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {item.text ? (
              <Text
                numberOfLines={3}
                style={[yazi.govde, s.onizleme, { color: t.metinIkincil }]}
              >
                {item.text}
              </Text>
            ) : (
              <Text style={[yazi.govde, s.bosMetin, { color: t.soluk }]}>
                Metin yok — yalnızca ses kaydı
              </Text>
            )}

            {item.text.length > 0 && (
              <Text style={[yazi.minik, s.kelimeSatiri, { color: t.soluk }]}>
                {kelimeSayisi(item.text)} kelime
                {!item.isCorrected && ' · düzeltilmemiş'}
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1, paddingHorizontal: olcu.kenar },
  ust: { paddingTop: 6, height: 34, justifyContent: 'center' },
  geri: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  geriOk: { fontSize: 30, marginRight: 3, marginTop: -4, fontWeight: '400' },
  baslikAlani: { paddingTop: 6, paddingBottom: 14 },
  arama: {
    borderRadius: olcu.radyusKucuk,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 8,
  },
  listeIc: { paddingBottom: 32, flexGrow: 1 },
  gunBaslik: {
    ...yazi.minik,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  satir: {
    borderRadius: olcu.radyus,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  satirUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  satirEtiketler: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sesEtiket: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  bos: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  altSatir: { marginTop: 2 },
  ortali: { textAlign: 'center' },
  onizleme: { marginTop: 6 },
  bosMetin: { marginTop: 6, fontStyle: 'italic' },
  kelimeSatiri: { marginTop: 8 },
  bosBaslik: { fontSize: 18, fontWeight: '600' },
});
