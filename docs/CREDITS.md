# Credits and licences

The app's **code** is © 2026 Tenluke, under the
[GNU AGPL, version 3 or later](https://www.gnu.org/licenses/agpl-3.0.html) (see `LICENSE`).
Source code: <https://github.com/tenluke/kaku>.

The **character data** is not ours. It comes from the open projects below and stays under their
licences. We claim no copyright over it.

| Data                                     | Source                                                                                                                                                                          | Licence                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Stroke shapes and order (kana and kanji) | [KanjiVG](https://kanjivg.tagaini.net/) © 2009–2026 Ulrich Apel                                                                                                                 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)                                                                     |
| Kanji meanings, readings, stroke counts  | [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © James William Breen and the [Electronic Dictionary Research and Development Group](https://www.edrdg.org/) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with the [EDRDG licence](https://www.edrdg.org/edrdg/licence.html) |
| Words and their meanings                 | [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) © James William Breen and the [EDRDG](https://www.edrdg.org/)                                    | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with the [EDRDG licence](https://www.edrdg.org/edrdg/licence.html) |
| JLPT levels N5–N1                        | [Jonathan Waller's JLPT lists](https://www.tanos.co.uk/jlpt/), taken from [kanji-data](https://github.com/davidluzgouveia/kanji-data) © David Gouveia                           | Lists: [CC BY](https://creativecommons.org/licenses/by/4.0/) · kanji-data: MIT                                                      |

**Changes made to the data.** The KanjiVG strokes are converted from SVG files into JSON stroke
paths. The JMdict meanings are shortened, and only common words written in kana are kept. The
converted data in `src/data/generated/` stays under the licences above. The exact versions used
are recorded in `src/data/generated/sources.json`.

**Logo.** The logo (`src/assets/logo.svg`, `src/assets/apple-touch-icon.png`) draws 書 with
KanjiVG's strokes, so it is an adaptation of KanjiVG, under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), not under the AGPL.

**Books.** The _Remembering the Kanji_ frame numbers (6th edition) come from KANJIDIC2. The app
was not made for _Remembering the Kanji_ by James W. Heisig, but it can be used alongside it. It
is not affiliated with the author or publisher and contains none of the book's text.
