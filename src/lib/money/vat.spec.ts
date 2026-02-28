import { Prisma } from '@prisma/client';

import { computeVatFromGross } from './vat';

describe('computeVatFromGross', () => {
  it('splits 121.00 gross into 100.00 + 21.00 (21%)', () => {
    const result = computeVatFromGross(
      new Prisma.Decimal('121.00'),
      new Prisma.Decimal('0.21'),
    );
    expect(result.net.toString()).toBe('100');
    expect(result.vat.toString()).toBe('21');
  });

  it('rounds correctly for non-exact divisions', () => {
    const result = computeVatFromGross(
      new Prisma.Decimal('100.00'),
      new Prisma.Decimal('0.21'),
    );
    expect(result.net.toString()).toBe('82.64');
    expect(result.vat.toString()).toBe('17.36');
  });

  it('handles zero vat rate', () => {
    const result = computeVatFromGross(
      new Prisma.Decimal('100.00'),
      new Prisma.Decimal('0'),
    );
    expect(result.net.toString()).toBe('100');
    expect(result.vat.toString()).toBe('0');
  });
});
