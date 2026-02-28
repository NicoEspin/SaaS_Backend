import { Prisma } from '@prisma/client';

export type VatFromGrossResult = {
  vatRate: Prisma.Decimal;
  gross: Prisma.Decimal;
  net: Prisma.Decimal;
  vat: Prisma.Decimal;
};

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function computeVatFromGross(
  gross: Prisma.Decimal,
  vatRate: Prisma.Decimal,
): VatFromGrossResult {
  if (vatRate.lte(0)) {
    return {
      vatRate,
      gross: roundMoney(gross),
      net: roundMoney(gross),
      vat: new Prisma.Decimal(0),
    };
  }

  const denominator = vatRate.plus(1);
  const net = roundMoney(gross.div(denominator));
  const vat = roundMoney(roundMoney(gross).minus(net));
  return { vatRate, gross: roundMoney(gross), net, vat };
}
