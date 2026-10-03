/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import {innerSvg, peopleOnCode, printableSvg} from '../src/features/qr/qrCard';

// Production's code for ASL WALLETS · IT (company 1, branch 82, department 2).
const qr = fs.readFileSync(path.join(__dirname, 'fixtures/qr-asl-wallets-it.svg'), 'utf8');

describe('printable QR card', () => {
  it('unwraps the server SVG', () => {
    const inner = innerSvg(qr)!;
    expect(inner.size).toBe(470);
    expect(inner.body.startsWith('<rect')).toBe(true);
    expect(inner.body).not.toContain('<svg');
    expect(inner.body).not.toContain('<?xml');
  });
  it('wraps it with the title, scaled to fit', () => {
    const card = printableSvg(qr, 'ASL WALLETS · IT')!;
    expect(card).toContain('ASL WALLETS · IT');
    expect(card).toContain(`scale(${440 / 470})`);
    expect(card.match(/<svg/g)).toHaveLength(1);
  });
  it('escapes names', () => {
    expect(printableSvg(qr, 'R&D <Lab>')).toContain('R&amp;D &lt;Lab&gt;');
  });
  it('rejects something that isn’t an SVG', () => {
    expect(printableSvg('<html>error</html>', 'x')).toBeNull();
  });
});

describe('peopleOnCode', () => {
  const people = [
    {name: 'Demo Employee', attendance_type: 'selfie', branch_name: 'ASL WALLETS', department_name: 'IT', status: '1'},
    {name: 'Asha', attendance_type: 'qr code', branch_name: 'ASL WALLETS', department_name: 'IT', status: '1'},
    {name: 'Ravi', attendance_type: 'QR Code', branch_name: 'asl wallets ', department_name: 'it', status: '1'},
    {name: 'Left', attendance_type: 'qr code', branch_name: 'ASL WALLETS', department_name: 'IT', status: '0'},
    {name: 'Sales', attendance_type: 'qr code', branch_name: 'ASL WALLETS', department_name: 'Sales', status: '1'},
  ];
  it('counts active QR people at that branch and department', () => {
    expect(peopleOnCode(people, 'ASL WALLETS', 'IT').map(p => p.name)).toEqual(['Asha', 'Ravi']);
  });
});
