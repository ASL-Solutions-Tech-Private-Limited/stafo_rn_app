import type {CompanyEmployee} from '../../api/types';

/** Size of the exported printable card (portrait, in px). */
export const CARD_W = 600;
export const CARD_H = 760;
const QR = 440;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The server's SVG with its outer <svg> (and XML declaration) removed, plus its viewBox size. */
export function innerSvg(svg: string) {
  const open = svg.match(/<svg\b[^>]*>/);
  const close = svg.lastIndexOf('</svg>');
  if (!open || close < 0) {
    return null;
  }
  const box = open[0].match(/viewBox="\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/);
  const size = box ? Number(box[1]) : Number(open[0].match(/width="([\d.]+)"/)?.[1] ?? 0);
  if (!size) {
    return null;
  }
  return {body: svg.slice(open.index! + open[0].length, close), size};
}

/**
 * One printable card: title, the code, and how to use it. Rendered and
 * exported as a PNG for sharing and saving.
 */
export function printableSvg(qrSvg: string, title: string) {
  const inner = innerSvg(qrSvg);
  if (!inner) {
    return null;
  }
  const scale = QR / inner.size;
  const x = (CARD_W - QR) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="#FFFFFF"/>
<text x="${
    CARD_W / 2
  }" y="64" text-anchor="middle" font-size="20" font-weight="700" letter-spacing="3" fill="#64748B">STAFO ATTENDANCE</text>
<text x="${CARD_W / 2}" y="112" text-anchor="middle" font-size="34" font-weight="800" fill="#0F172A">${esc(
    title,
  )}</text>
<g transform="translate(${x} 150) scale(${scale})">${inner.body}</g>
<text x="${CARD_W / 2}" y="${
    150 + QR + 64
  }" text-anchor="middle" font-size="22" fill="#475569">Scan in the STAFO app to punch in or out</text>
</svg>`;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** Active people on QR attendance at this branch and department (the ones who scan this code). */
export function peopleOnCode(
  people: Pick<CompanyEmployee, 'name' | 'attendance_type' | 'branch_name' | 'department_name' | 'status'>[],
  branchName: string,
  departmentName: string,
) {
  return people.filter(
    p =>
      (p.status ?? '1') === '1' &&
      norm(p.attendance_type).startsWith('qr') &&
      norm(p.branch_name) === norm(branchName) &&
      norm(p.department_name) === norm(departmentName),
  );
}
