import { describe, expect, it } from 'vitest';
import { parseKanjidic } from './kanjidic.ts';

// A trimmed copy of a real KANJIDIC2 entry, plus one kanji with no readings or grade.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE kanjidic2 [ <!ELEMENT kanjidic2 (header,character*)> ]>
<kanjidic2>
<header><file_version>4</file_version><date_of_creation>2026-11-10</date_of_creation></header>
<character>
<literal>日</literal>
<misc><grade>1</grade><stroke_count>4</stroke_count><freq>1</freq><jlpt>4</jlpt></misc>
<dic_number><dic_ref dr_type="nelson_c">2097</dic_ref><dic_ref dr_type="heisig6">12</dic_ref></dic_number>
<reading_meaning><rmgroup>
<reading r_type="pinyin">ri4</reading>
<reading r_type="ja_on">ニチ</reading>
<reading r_type="ja_on">ジツ</reading>
<reading r_type="ja_kun">ひ</reading>
<reading r_type="ja_kun">-か</reading>
<meaning>day</meaning>
<meaning>sun</meaning>
<meaning m_lang="fr">jour</meaning>
</rmgroup><nanori>あ</nanori></reading_meaning>
</character>
<character>
<literal>丶</literal>
<misc><stroke_count>1</stroke_count><stroke_count>2</stroke_count></misc>
</character>
</kanjidic2>`;

describe('parseKanjidic', () => {
  const kanjidic = parseKanjidic(SAMPLE);

  it('reads the file date', () => {
    expect(kanjidic.dateOfCreation).toBe('2026-11-10');
  });

  it('reads English meanings and Japanese readings only', () => {
    expect(kanjidic.entries[0]).toEqual({
      character: '日',
      meanings: ['day', 'sun'],
      onReadings: ['ニチ', 'ジツ'],
      kunReadings: ['ひ', '-か'],
      strokeCount: 4,
      grade: 1,
      frequency: 1,
      rtkFrame: 12,
    });
  });

  it('handles missing readings, grade, frequency and RTK frame, and uses the first stroke count', () => {
    expect(kanjidic.entries[1]).toEqual({
      character: '丶',
      meanings: [],
      onReadings: [],
      kunReadings: [],
      strokeCount: 1,
      grade: null,
      frequency: null,
      rtkFrame: null,
    });
  });
});
