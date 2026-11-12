import { describe, expect, it } from 'vitest';
import { parseJmdict } from './jmdict.ts';

// Trimmed copies of real JMdict entries. JMdict writes its codes as entities (&n;).
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE JMdict [ <!ENTITY n "noun (common) (futsuumeishi)"> ]>
<JMdict>
<!-- JMdict created: 2026-11-12 -->
<entry>
<ent_seq>1254210</ent_seq>
<k_ele><keb>犬</keb><ke_pri>ichi1</ke_pri></k_ele>
<k_ele><keb>狗</keb></k_ele>
<r_ele><reb>いぬ</reb><re_pri>ichi1</re_pri><re_pri>nf03</re_pri></r_ele>
<r_ele><reb>イヌ</reb><re_nokanji/></r_ele>
<sense><pos>&n;</pos><gloss>dog (Canis (lupus) familiaris)</gloss><gloss>canine</gloss></sense>
<sense><misc>&derog;</misc><gloss>snitch</gloss></sense>
</entry>
<entry>
<ent_seq>1000320</ent_seq>
<r_ele><reb>あそこ</reb><re_pri>spec1</re_pri></r_ele>
<r_ele><reb>あすこ</reb></r_ele>
<sense><stagr>あそこ</stagr><pos>&pn;</pos><gloss>there &amp; over there</gloss></sense>
</entry>
</JMdict>`;

describe('parseJmdict', () => {
  const jmdict = parseJmdict(SAMPLE);
  const [dog, there] = jmdict.entries;

  it('reads the file date and every entry', () => {
    expect(jmdict.dateOfCreation).toBe('2026-11-12');
    expect(jmdict.entries).toHaveLength(2);
  });

  it('reads kanji spellings and readings with their priority', () => {
    expect(dog?.kanji).toEqual([
      { text: '犬', common: true },
      { text: '狗', common: false },
    ]);
    expect(dog?.readings).toEqual([
      { kana: 'いぬ', common: true, frequencyBand: 3, onlyWithKanji: [], noKanji: false },
      { kana: 'イヌ', common: false, frequencyBand: null, onlyWithKanji: [], noKanji: true },
    ]);
  });

  it('reads codes written as entities, and a missing part of speech repeats the last one', () => {
    expect(dog?.senses).toEqual([
      {
        glosses: ['dog (Canis (lupus) familiaris)', 'canine'],
        partsOfSpeech: ['n'],
        notes: [],
        onlyForReadings: [],
      },
      { glosses: ['snitch'], partsOfSpeech: ['n'], notes: ['derog'], onlyForReadings: [] },
    ]);
  });

  it('keeps XML escapes and reads senses limited to one reading', () => {
    expect(there?.senses[0]).toMatchObject({
      glosses: ['there & over there'],
      onlyForReadings: ['あそこ'],
    });
  });
});
