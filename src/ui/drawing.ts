import type { Stroke } from '../checking/geometry';

/*
 * The drawing area: a canvas for your strokes, and an SVG on top for the guide lines,
 * hints and the animated answer. Coordinates are in "canvas units": each character box
 * is 400 × 400, whatever its size on screen. Boxes go left to right, in more than one row
 * when a long word doesn't fit the screen.
 */

export const BOX_SIZE = 400;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PIXEL_RATIO = 2; // draw at double resolution so lines stay sharp on high-DPI screens
type DrawColor = 'ink' | 'guide' | 'hint' | 'answer' | 'number' | 'wrong';

/** A drawing colour from the theme (style.css, --draw-…), so it follows light and dark mode. */
const color = (name: DrawColor): string =>
  getComputedStyle(document.documentElement).getPropertyValue(`--draw-${name}`).trim();
// Small kana (ゃ of きゃ, っ …) are drawn smaller and lower in their box, as they are written.
const SMALL_KANA = new Set([...'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ']);
// The smallest a box may get on screen (in CSS pixels) before boxes wrap to a new row.
const MIN_BOX_PIXELS = 150;
const MAX_STAGE_PIXELS = 720;

interface DrawnPoint {
  x: number;
  y: number;
  width: number;
  time: number;
}

const stage = document.getElementById('drawing-stage') as HTMLDivElement;
const canvas = stage.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d') as CanvasRenderingContext2D;
const overlay = document.getElementById('overlay') as unknown as SVGSVGElement;

let width = BOX_SIZE;
let height = BOX_SIZE;
let columns = 1;
let strokes: DrawnPoint[][] = [];
let activeStroke: DrawnPoint[] | null = null;
let locked = false;
let layers: SVGGElement[] = [];

/** Line width follows pen pressure, or speed for mouse and touch (faster = thinner). */
function pointFromEvent(event: PointerEvent, last?: DrawnPoint): DrawnPoint {
  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * width) / rect.width;
  const y = ((event.clientY - rect.top) * height) / rect.height;
  let lineWidth = 9;
  if (last) {
    const speed = Math.hypot(x - last.x, y - last.y) / Math.max(1, event.timeStamp - last.time);
    lineWidth =
      event.pointerType === 'pen'
        ? 4 + event.pressure * 9
        : last.width * 0.7 + Math.max(4, Math.min(12, 12 - speed * 5)) * 0.3;
  }
  return { x, y, width: lineWidth, time: event.timeStamp };
}

function redraw(): void {
  context.clearRect(0, 0, width, height);
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index++) {
      const from = stroke[index - 1] as DrawnPoint;
      const to = stroke[index] as DrawnPoint;
      context.lineWidth = to.width;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  }
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number>,
) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/** Where a box's top-left corner is, in canvas units. */
const boxOrigin = (box: number) => ({
  x: (box % columns) * BOX_SIZE,
  y: Math.floor(box / columns) * BOX_SIZE,
});

/** Guide box with dashed centre lines, one per character. */
function drawGuides(characterCount: number): void {
  for (let box = 0; box < characterCount; box++) {
    const { x, y } = boxOrigin(box);
    overlay.appendChild(
      svgElement('rect', {
        x: x + 3,
        y: y + 3,
        width: 394,
        height: 394,
        rx: 6,
        fill: 'none',
        stroke: color('guide'),
        'stroke-width': 2,
        'data-box': box,
      }),
    );
    overlay.appendChild(
      svgElement('path', {
        d: `M${x + 200} ${y + 10}V${y + 390}M${x + 10} ${y + 200}H${x + 390}`,
        stroke: color('guide'),
        'stroke-dasharray': '6 8',
      }),
    );
  }
}

/** How many boxes fit side by side on this screen. */
function columnsFor(characterCount: number): number {
  const available = Math.min(
    MAX_STAGE_PIXELS,
    stage.parentElement?.clientWidth || MAX_STAGE_PIXELS,
  );
  return Math.max(1, Math.min(characterCount, Math.floor(available / MIN_BOX_PIXELS)));
}

/** Where KanjiVG's 109 × 109 drawing goes in a box. */
function layerTransform(box: number, character: string): string {
  const { x, y } = boxOrigin(box);
  return SMALL_KANA.has(character)
    ? `translate(${x + 90} ${y + 150}) scale(1.9)`
    : `translate(${x + 44} ${y + 44}) scale(2.86)`;
}

/** Clears everything and prepares the area for new characters, one box each. */
export function resetDrawing(characters: readonly string[]): void {
  const count = characters.length;
  columns = columnsFor(count);
  width = BOX_SIZE * columns;
  height = BOX_SIZE * Math.ceil(count / columns);
  strokes = [];
  activeStroke = null;
  locked = false;
  canvas.width = width * PIXEL_RATIO;
  canvas.height = height * PIXEL_RATIO;
  context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = color('ink');
  stage.style.aspectRatio = `${width} / ${height}`;
  stage.style.maxWidth = count > 1 ? `${MAX_STAGE_PIXELS}px` : '400px';
  stage.classList.remove('done');
  overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
  overlay.replaceChildren();
  drawGuides(count);
  layers = characters.map((character, box) => {
    const layer = svgElement('g', { transform: layerTransform(box, character) });
    overlay.appendChild(layer);
    return layer;
  });
  redraw();
}

/** How many boxes are in a row now (the checker needs it to tell the boxes apart). */
export const boxColumns = (): number => columns;

/** Outlines the boxes that need another try in red (an empty list removes the marks). */
export function markBoxes(wrongBoxes: readonly number[]): void {
  overlay.querySelectorAll<SVGRectElement>('rect[data-box]').forEach((rect) => {
    const isWrong = wrongBoxes.includes(Number(rect.dataset.box));
    rect.setAttribute('stroke', isWrong ? color('wrong') : color('guide'));
  });
}

/** Stops drawing (after the answer is shown) and fades your strokes. */
export function lockDrawing(): void {
  locked = true;
  activeStroke = null;
  stage.classList.add('done');
}

export const drawnStrokes = (): Stroke[] =>
  strokes.map((stroke) => stroke.map((point) => ({ x: point.x, y: point.y })));

export const hasDrawing = (): boolean => strokes.some((stroke) => stroke.length > 1);

export function undoStroke(): void {
  if (locked) return;
  strokes.pop();
  redraw();
}

export function clearStrokes(): void {
  if (locked) return;
  strokes = [];
  redraw();
}

/** The box a stroke belongs to: the one where it starts (as the checker counts it). */
function boxOfStroke(stroke: DrawnPoint[]): number {
  const start = stroke[0] as DrawnPoint;
  const column = Math.min(columns - 1, Math.max(0, Math.floor(start.x / BOX_SIZE)));
  const row = Math.max(0, Math.floor(start.y / BOX_SIZE));
  return row * columns + column;
}

/** Clears only these boxes, so a long word keeps the kana that were already right. */
export function clearBoxes(boxes: readonly number[]): void {
  if (locked) return;
  strokes = strokes.filter((stroke) => !boxes.includes(boxOfStroke(stroke)));
  redraw();
}

function addPath(
  box: number,
  pathData: string,
  color: string,
  opacity: number,
  className = '',
): SVGPathElement {
  const path = svgElement('path', {
    d: pathData,
    fill: 'none',
    stroke: color,
    'stroke-width': 4.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity,
  });
  if (className) path.classList.add(className);
  layers[box]?.appendChild(path);
  return path;
}

/** Draws the path from start to end like a pen, over `seconds`, after `delay` seconds. */
function animatePath(path: SVGPathElement, seconds: number, delay: number): void {
  const length = path.getTotalLength();
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);
  path.getBoundingClientRect(); // makes the browser apply the start state before animating
  path.style.transition = `stroke-dashoffset ${seconds}s ease ${delay}s`;
  path.style.strokeDashoffset = '0';
}

export interface ReferenceStroke {
  box: number;
  path: string;
}

/** Shows one stroke of the answer as a hint. */
export function showHintStroke(stroke: ReferenceStroke): void {
  animatePath(addPath(stroke.box, stroke.path, color('hint'), 0.7, 'hint'), 1.5, 0);
}

/** Replays all strokes in order (after every hint has been used). */
export function replayHints(allStrokes: readonly ReferenceStroke[]): void {
  overlay.querySelectorAll('.hint').forEach((element) => element.remove());
  allStrokes.forEach((stroke, order) =>
    animatePath(addPath(stroke.box, stroke.path, color('hint'), 0.7, 'hint'), 0.7, order * 0.8),
  );
}

/**
 * Puts the stroke's number next to its start point, appearing when that stroke starts
 * drawing. Small and slightly see-through, so complex kanji don't get too cluttered.
 */
function addStrokeNumber(
  box: number,
  path: SVGPathElement,
  numberInBox: Map<number, number>,
  delay: number,
): void {
  const start = path.getPointAtLength(0);
  const strokeNumber = (numberInBox.get(box) ?? 0) + 1;
  numberInBox.set(box, strokeNumber);
  const label = svgElement('text', {
    x: start.x - 4,
    y: start.y - 2,
    fill: color('number'),
    'font-size': 5.5,
    'text-anchor': 'middle',
  });
  label.textContent = String(strokeNumber);
  label.style.opacity = '0';
  label.style.transition = 'opacity .3s';
  layers[box]?.appendChild(label);
  // A timer, not a CSS transition delay: a browser may skip the transition of an element
  // added in the same frame, which made every number appear at once.
  window.setTimeout(() => (label.style.opacity = '0.85'), delay * 1000);
}

/** Draws the full answer stroke by stroke, numbering each stroke at its start. */
export function revealAnswer(allStrokes: readonly ReferenceStroke[]): void {
  const numberInBox = new Map<number, number>();
  allStrokes.forEach((stroke, order) => {
    const path = addPath(stroke.box, stroke.path, color('answer'), 1);
    const delay = order * 0.7;
    animatePath(path, 0.6, delay);
    addStrokeNumber(stroke.box, path, numberInBox, delay);
  });
}

export function initDrawing(): void {
  stage.addEventListener('pointerdown', (event) => {
    if (locked) return;
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    activeStroke = [pointFromEvent(event)];
    strokes.push(activeStroke);
  });
  stage.addEventListener('pointermove', (event) => {
    if (!activeStroke) return;
    const last = activeStroke[activeStroke.length - 1] as DrawnPoint;
    const point = pointFromEvent(event, last);
    // Skip tiny moves: they add points without changing the line.
    if (Math.hypot(point.x - last.x, point.y - last.y) > 1.5) {
      activeStroke.push(point);
      redraw();
    }
  });
  const endStroke = () => {
    if (!activeStroke) return;
    if (activeStroke.length < 2) strokes.pop(); // a tap, not a stroke
    activeStroke = null;
    redraw();
  };
  stage.addEventListener('pointerup', endStroke);
  stage.addEventListener('pointercancel', endStroke);
}
