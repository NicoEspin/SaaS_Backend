import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import {
  InvoiceDocType,
  InvoiceMode,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

import type { AuthUser } from '../../../common/auth/auth.types';
import { PrismaService } from '../../../common/database/prisma.service';
import { newId } from '../../../common/ids/new-id';
import type { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import type { IssueInvoiceDto } from './dto/issue-invoice.dto';
import {
  InvoicePdfService,
  type InvoicePdfData,
} from './pdf/invoice-pdf.service';

export type InvoiceListItemView = {
  id: string;
  number: string;
  displayNumber: string | null;
  status: InvoiceStatus;
  mode: InvoiceMode | null;
  docType: InvoiceDocType | null;
  issuedAt: Date | null;
  customerId: string | null;
  customerNameSnapshot: string | null;
  total: string;
  createdAt: Date;
};

export type InvoiceListResult = {
  items: InvoiceListItemView[];
  nextCursor: string | null;
};

export type InvoiceLineView = {
  id: string;
  productId: string | null;
  productCodeSnapshot: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  vatRate: string;
  netUnitPrice: string;
  netLineTotal: string;
  vatAmount: string;
};

export type InvoiceView = {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string | null;
  customerId: string | null;
  number: string;
  displayNumber: string | null;
  mode: InvoiceMode | null;
  docType: InvoiceDocType | null;
  status: InvoiceStatus;
  issuedAt: Date | null;
  customerNameSnapshot: string | null;
  customerTaxIdSnapshot: string | null;
  customerAddressSnapshot: string | null;
  subtotal: string;
  netSubtotal: string;
  taxTotal: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
  lines: InvoiceLineView[];
};

function moneyToString(value: Prisma.Decimal): string {
  return value.toString();
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: InvoicePdfService,
  ) {}

  async list(
    user: AuthUser,
    branchId: string,
    query: ListInvoicesQueryDto,
  ): Promise<InvoiceListResult> {
    await this.requireBranch(user.tenantId, branchId);

    const limit = query.limit ?? 50;
    const take = limit + 1;

    const where: Prisma.InvoiceWhereInput = {
      tenantId: user.tenantId,
      branchId,
    };
    if (query.cursor) where.id = { lt: query.cursor };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: {
        id: true,
        number: true,
        displayNumber: true,
        status: true,
        mode: true,
        docType: true,
        issuedAt: true,
        customerId: true,
        customerNameSnapshot: true,
        total: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((r) => ({
        id: r.id,
        number: r.number,
        displayNumber: r.displayNumber,
        status: r.status,
        mode: r.mode,
        docType: r.docType,
        issuedAt: r.issuedAt,
        customerId: r.customerId,
        customerNameSnapshot: r.customerNameSnapshot,
        total: moneyToString(r.total),
        createdAt: r.createdAt,
      })),
      nextCursor,
    };
  }

  async getById(
    user: AuthUser,
    branchId: string,
    invoiceId: string,
  ): Promise<InvoiceView> {
    await this.requireBranch(user.tenantId, branchId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId, branchId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        orderId: true,
        customerId: true,
        number: true,
        displayNumber: true,
        mode: true,
        docType: true,
        status: true,
        issuedAt: true,
        customerNameSnapshot: true,
        customerTaxIdSnapshot: true,
        customerAddressSnapshot: true,
        subtotal: true,
        netSubtotal: true,
        taxTotal: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        lines: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            productId: true,
            productCodeSnapshot: true,
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            vatRate: true,
            netUnitPrice: true,
            netLineTotal: true,
            vatAmount: true,
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      branchId: invoice.branchId,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      number: invoice.number,
      displayNumber: invoice.displayNumber,
      mode: invoice.mode,
      docType: invoice.docType,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      customerNameSnapshot: invoice.customerNameSnapshot,
      customerTaxIdSnapshot: invoice.customerTaxIdSnapshot,
      customerAddressSnapshot: invoice.customerAddressSnapshot,
      subtotal: moneyToString(invoice.subtotal),
      netSubtotal: moneyToString(invoice.netSubtotal),
      taxTotal: moneyToString(invoice.taxTotal),
      total: moneyToString(invoice.total),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      lines: invoice.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productCodeSnapshot: l.productCodeSnapshot,
        description: l.description,
        quantity: l.quantity,
        unitPrice: moneyToString(l.unitPrice),
        lineTotal: moneyToString(l.lineTotal),
        vatRate: moneyToString(l.vatRate),
        netUnitPrice: moneyToString(l.netUnitPrice),
        netLineTotal: moneyToString(l.netLineTotal),
        vatAmount: moneyToString(l.vatAmount),
      })),
    };
  }

  async issue(
    user: AuthUser,
    branchId: string,
    invoiceId: string,
    dto: IssueInvoiceDto,
  ): Promise<InvoiceView> {
    await this.requireBranch(user.tenantId, branchId);

    const mode = dto.mode ?? 'INTERNAL';
    if (mode === 'ARCA') {
      throw new NotImplementedException('ARCA issuance not implemented yet');
    }

    const docType = dto.docType === 'A' ? InvoiceDocType.A : InvoiceDocType.B;

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId: user.tenantId, branchId },
        select: {
          id: true,
          status: true,
          customerId: true,
          customerNameSnapshot: true,
          customerTaxIdSnapshot: true,
          customerTaxIdTypeSnapshot: true,
          customerVatConditionSnapshot: true,
          customerAddressSnapshot: true,
        },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException('Invoice is not in DRAFT status');
      }

      if (docType === InvoiceDocType.A) {
        if (!invoice.customerId) {
          throw new BadRequestException('Factura A requires a customer');
        }
      }

      let snapshots = {
        customerNameSnapshot: invoice.customerNameSnapshot,
        customerTaxIdSnapshot: invoice.customerTaxIdSnapshot,
        customerTaxIdTypeSnapshot: invoice.customerTaxIdTypeSnapshot,
        customerVatConditionSnapshot: invoice.customerVatConditionSnapshot,
        customerAddressSnapshot: invoice.customerAddressSnapshot,
      };

      if (invoice.customerId && !invoice.customerNameSnapshot) {
        const customer = await tx.customer.findFirst({
          where: {
            id: invoice.customerId,
            tenantId: user.tenantId,
            isActive: true,
          },
          select: {
            name: true,
            taxId: true,
            taxIdType: true,
            vatCondition: true,
            address: true,
          },
        });
        if (customer) {
          snapshots = {
            customerNameSnapshot: customer.name,
            customerTaxIdSnapshot: customer.taxId,
            customerTaxIdTypeSnapshot: customer.taxIdType,
            customerVatConditionSnapshot: customer.vatCondition,
            customerAddressSnapshot: customer.address,
          };
        }
      }

      const seq = await this.nextSequenceNumber(
        tx,
        user.tenantId,
        branchId,
        InvoiceMode.INTERNAL,
        docType,
      );
      const displayNumber = `${dto.docType}-${String(seq).padStart(8, '0')}`;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
          mode: InvoiceMode.INTERNAL,
          docType,
          displayNumber,
          ...snapshots,
        },
        select: { id: true },
      });
    });

    return this.getById(user, branchId, invoiceId);
  }

  async pdfInternal(
    user: AuthUser,
    branchId: string,
    invoiceId: string,
  ): Promise<Buffer> {
    const invoice = await this.getById(user, branchId, invoiceId);

    const [tenant, branch] = await Promise.all([
      this.prisma.tenant.findFirst({
        where: { id: user.tenantId },
        select: { name: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: branchId, tenantId: user.tenantId },
        select: { name: true },
      }),
    ]);

    const data: InvoicePdfData = {
      tenantName: tenant?.name ?? 'Tenant',
      branchName: branch?.name ?? 'Sucursal',
      issuedAt: invoice.issuedAt,
      status: invoice.status,
      docType: invoice.docType,
      displayNumber: invoice.displayNumber,
      internalNumber: invoice.number,
      customerName: invoice.customerNameSnapshot,
      customerTaxId: invoice.customerTaxIdSnapshot,
      customerAddress: invoice.customerAddressSnapshot,
      netSubtotal: invoice.netSubtotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    };

    return this.pdf.renderInternal(data);
  }

  private async nextSequenceNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    mode: InvoiceMode,
    docType: InvoiceDocType,
  ): Promise<number> {
    const row = await tx.invoiceSequence.upsert({
      where: {
        tenantId_branchId_mode_docType: {
          tenantId,
          branchId,
          mode,
          docType,
        },
      },
      update: { nextNumber: { increment: 1 } },
      create: {
        id: newId(),
        tenantId,
        branchId,
        mode,
        docType,
        nextNumber: 2,
      },
      select: { nextNumber: true },
    });

    return row.nextNumber - 1;
  }

  private async requireBranch(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
  }
}
