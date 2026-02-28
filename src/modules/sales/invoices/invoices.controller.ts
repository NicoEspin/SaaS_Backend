import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth.types';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { BranchIdParamDto } from '../carts/dto/branch-id.param.dto';
import { InvoiceIdParamDto } from './dto/invoice-id.param.dto';
import { InvoicePdfQueryDto } from './dto/invoice-pdf.query.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import {
  InvoicesService,
  type InvoiceListResult,
  type InvoiceView,
} from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('branches/:branchId/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiOkResponse({ description: 'Invoices list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  async list(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<InvoiceListResult> {
    return this.invoices.list(user, params.branchId, query);
  }

  @Get(':invoiceId')
  @ApiOperation({ summary: 'Get invoice by id' })
  @ApiOkResponse({ description: 'Invoice detail' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'invoiceId', type: String, description: 'Invoice id' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & InvoiceIdParamDto,
  ): Promise<InvoiceView> {
    return this.invoices.getById(user, params.branchId, params.invoiceId);
  }

  @Post(':invoiceId/issue')
  @HttpCode(200)
  @ApiOperation({ summary: 'Issue invoice (INTERNAL now, ARCA soon)' })
  @ApiOkResponse({ description: 'Invoice issued' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async issue(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & InvoiceIdParamDto,
    @Body() dto: IssueInvoiceDto,
  ): Promise<InvoiceView> {
    return this.invoices.issue(user, params.branchId, params.invoiceId, dto);
  }

  @Get(':invoiceId/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF (internal)' })
  @ApiOkResponse({ description: 'PDF generated' })
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & InvoiceIdParamDto,
    @Query() query: InvoicePdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (query.variant === 'fiscal') {
      res.status(501).json({ message: 'Fiscal PDF not implemented yet' });
      return;
    }

    const buffer = await this.invoices.pdfInternal(
      user,
      params.branchId,
      params.invoiceId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="invoice-${params.invoiceId}.pdf"`,
    );
    res.status(200).send(buffer);
  }
}
