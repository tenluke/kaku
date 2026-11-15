# 書く · Kaku

Practise writing Japanese by hand. Kaku shows you a reading or a meaning, you draw the
character from memory, and the app checks your strokes: their shape, count, order and direction.

It runs entirely in your browser. There is no account, and your data stays on your device.

## Features

- **Kana**: hiragana and katakana, including the voiced sounds and the digraphs.
- **Kanji**: the JLPT levels N5 to N1.
- **Words**: write real words made only of the kana you selected.
- **Hints**: first the number of strokes, then the strokes one by one, in the right order.
- **Lists**: save your own lists of characters, in main lists with sublists.
- **Books**: follow _Remembering the Kanji_ 1 (6th edition) in frame order.
- **Progress**: see how well you know each character.
- **Backup & transfer**: move your progress, lists and settings to another device.
- **Light and dark theme**, following your system on the first visit.

## Use it

**Online:** open **<https://tenluke.github.io/kaku/>** in your browser. There is nothing to
install.

**Offline:**
[download kaku.html](https://github.com/tenluke/kaku/releases/download/latest/kaku.html) and
open it in a browser. It is one file with everything inside, and it works without internet.

Your progress is saved in the browser you use, separately for the website and for the file
(keep the file in one place). To move your progress, use ⋯ → Backup & transfer.

## Run it from the source code

You need [Node.js](https://nodejs.org/) 22.18 or newer and [Git](https://git-scm.com/).

```bash
git clone https://github.com/tenluke/kaku.git
```

```bash
cd kaku
```

```bash
npm start
```

`npm start` installs the tools, runs the tests and starts the app. Open the address it prints
(such as `http://localhost:5173/`) in your browser.

## Development

The app is written in TypeScript and built with Vite. It uses no UI framework and has no server.

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm start`            | Install, run the tests, then start the dev server           |
| `npm run dev`          | Start a local dev server that reloads on every change       |
| `npm test`             | Run the tests once (`npm run test:watch` keeps running)     |
| `npm run lint`         | Check the code for mistakes with ESLint                     |
| `npm run format`       | Format all files with Prettier                              |
| `npm run typecheck`    | Check the TypeScript types                                  |
| `npm run audit`        | Check the tools for known security problems                 |
| `npm run build`        | Build the website into `dist/`                              |
| `npm run build:single` | Build the single offline file into `dist-single/index.html` |
| `npm run data`         | Download the sources again and rebuild the character data   |

GitHub Actions runs these checks on every pull request. After every change on `main`, it
publishes the website on GitHub Pages and the single offline file as the "Latest build" release.

The character data in `src/data/generated/` is made by `npm run data`. The files are committed,
so you only need to run it to update the data. A workflow does this every month.

## Licence

© 2026 Tenluke. Kaku is free software under the **GNU Affero General Public License**, version 3
or later. See [LICENSE](LICENSE).

In short: anyone may use, study, change and share this code. Anyone who shares a changed version,
or runs it as a website for others, must publish their source code under the same licence.

The licence covers the app's code. The character data and the logo keep their own licences:

- Stroke data and the logo: [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel, CC BY-SA 3.0.
- Kanji meanings and readings:
  [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © James William Breen and the
  Electronic Dictionary Research and Development Group, CC BY-SA 4.0
  ([EDRDG licence](https://www.edrdg.org/edrdg/licence.html)).
- Words and their meanings:
  [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project), from the same
  group under the same licence.
- JLPT levels: [Jonathan Waller's lists](https://www.tanos.co.uk/jlpt/), via
  [kanji-data](https://github.com/davidluzgouveia/kanji-data).

Details: [docs/CREDITS.md](docs/CREDITS.md).

Kaku is not affiliated with the author or publisher of _Remembering the Kanji_ and contains none
of the book's text.
