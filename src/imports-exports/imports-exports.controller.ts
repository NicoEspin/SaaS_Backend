import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import type { AuthUser } from '../common/auth/auth.types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import {
  EXPORT_FORMATS,
  IMPORT_EXPORT_ENTITIES,
  IMPORT_MODES,
  type ExportFormat,
  type ImportExportEntity,
  type ImportMode,
} from './import-export.types';
import { ImportsExportsService } from './imports-exports.service';
import { ConfirmImportDto } from './dto/confirm-import.dto';

function parseEntity(value: string): ImportExportEntity {
  if ((IMPORT_EXPORT_ENTITIES as readonly string[]).includes(value)) {
    return value as ImportExportEntity;
  }
  throw new BadRequestException(`Unsupported entity '${value}'`);
}

function parseMode(value: string | undefined): ImportMode {
  if (!value) return 'upsert';
  if ((IMPORT_MODES as readonly string[]).includes(value)) {
    return value as ImportMode;
  }
  throw new BadRequestException(`Unsupported import mode '${value}'`);
}

function parseFormat(value: string | undefined): ExportFormat {
  if (!value) return 'xlsx';
  if ((EXPORT_FORMATS as readonly string[]).includes(value)) {
    return value as ExportFormat;
  }
  throw new BadRequestException(`Unsupported export format '${value}'`);
}

function parseColumns(rawColumns: unknown): string[] | undefined {
  if (rawColumns === undefined) return undefined;
  if (typeof rawColumns === 'string') {
    return rawColumns
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  if (Array.isArray(rawColumns)) {
    return rawColumns
      .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  throw new BadRequestException('columns must be a comma separated string');
}

@ApiTags('Imports/Exports')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller()
export class ImportsExportsController {
  constructor(private readonly importsExports: ImportsExportsService) {}

  @Post('imports/:entity/preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview import file (validates + builds preview)' })
  @ApiOkResponse({ description: 'Import preview result' })
  @ApiBadRequestResponse({ description: 'Invalid entity/mode/file' })
  @ApiParam({
    name: 'entity',
    type: String,
    description: `Entity to import. Supported: ${IMPORT_EXPORT_ENTITIES.join(', ')}`,
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    type: String,
    description: `Import mode. Supported: ${IMPORT_MODES.join(', ')}`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async previewImport(
    @CurrentUser() user: AuthUser,
    @Param('entity') entityRaw: string,
    @Query('mode') modeRaw: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: { originalname: string; buffer: Buffer },
  ) {
    const entity = parseEntity(entityRaw);
    const mode = parseMode(modeRaw);
    return this.importsExports.previewImport(user.tenantId, entity, mode, file);
  }

  @Post('imports/:entity/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm import preview (writes to DB)' })
  @ApiOkResponse({ description: 'Import confirm result' })
  @ApiBadRequestResponse({ description: 'Invalid entity/previewId' })
  @ApiParam({
    name: 'entity',
    type: String,
    description: `Entity to import. Supported: ${IMPORT_EXPORT_ENTITIES.join(', ')}`,
  })
  async confirmImport(
    @CurrentUser() user: AuthUser,
    @Param('entity') entityRaw: string,
    @Body() body: ConfirmImportDto,
  ) {
    const entity = parseEntity(entityRaw);
    return this.importsExports.confirmImport(
      user.tenantId,
      entity,
      body.previewId,
    );
  }

  @Get('exports/:entity')
  @ApiOperation({ summary: 'Export data (returns downloadable file)' })
  @ApiOkResponse({
    description:
      'Export file. Response is a binary stream with content-disposition header.',
  })
  @ApiBadRequestResponse({ description: 'Invalid entity/format/columns' })
  @ApiParam({
    name: 'entity',
    type: String,
    description: `Entity to export. Supported: ${IMPORT_EXPORT_ENTITIES.join(', ')}`,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    type: String,
    description: `Export format. Supported: ${EXPORT_FORMATS.join(', ')} (default: xlsx)`,
  })
  @ApiQuery({
    name: 'columns',
    required: false,
    type: String,
    description:
      'Optional comma-separated list of columns to include. Can be repeated.',
  })
  async export(
    @CurrentUser() user: AuthUser,
    @Param('entity') entityRaw: string,
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const entity = parseEntity(entityRaw);
    const format = parseFormat(
      typeof query.format === 'string' ? query.format : undefined,
    );
    const columns = parseColumns(query.columns);
    const filters = { ...query };
    delete filters.format;
    delete filters.columns;

    const file = await this.importsExports.exportData(
      user.tenantId,
      entity,
      format,
      columns,
      filters,
    );

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    return new StreamableFile(file.buffer);
  }
}
