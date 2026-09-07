import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IdsActionDto } from './ids-action.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingActualDto:
 *       type: object
 *       required: [ids]
 *       properties:
 *         ids: { type: array, items: { type: string, format: uuid } }
 *         picReceiver: { type: string }
 *         picBinner: { type: string }
 *         grBy: { type: string, description: "Opsional — default user token" }
 */
export class CreateActualDto extends IdsActionDto {
  @IsOptional()
  @IsString({ message: 'PicReceiver must be a string' })
  picReceiver?: string;

  @IsOptional()
  @IsString({ message: 'PicBinner must be a string' })
  picBinner?: string;

  @IsOptional()
  @IsString({ message: 'GrBy must be a string' })
  grBy?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingBinningDto:
 *       type: object
 *       required: [actualQty]
 *       properties:
 *         actualQty: { type: integer, minimum: 0, description: "Di-INCREMENT ke binningQty" }
 */
export class BinningDto {
  @IsInt({ message: 'ActualQty must be an integer' })
  @Min(0, { message: 'ActualQty must be at least 0' })
  actualQty!: number;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingFilterResultDto:
 *       type: object
 *       required: [customerCode, warehouseCodes, searchParam]
 *       properties:
 *         customerCode: { type: string }
 *         warehouseCodes: { type: array, items: { type: string } }
 *         searchParam: { type: string, example: "DeliveryNoteNo|DN-12", description: "Format kolom|nilai" }
 */
export class FilterResultDto {
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode!: string;

  @IsArray({ message: 'WarehouseCodes must be an array' })
  @IsString({ each: true, message: 'Each warehouseCode must be a string' })
  warehouseCodes!: string[];

  @IsString({ message: 'SearchParam must be a string' })
  searchParam!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingQiItemDto:
 *       type: object
 *       required: [materialCode, partialQty]
 *       properties:
 *         materialCode: { type: string }
 *         partialQty: { type: integer, minimum: 0 }
 *         description: { type: string }
 */
export class QiItemDto {
  @IsString({ message: 'MaterialCode must be a string' })
  materialCode!: string;

  @IsInt({ message: 'PartialQty must be an integer' })
  @Min(0, { message: 'PartialQty must be at least 0' })
  partialQty!: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingQiDto:
 *       type: object
 *       required: [id, items]
 *       properties:
 *         id: { type: string, format: uuid, description: PlanIncomingHeaderId }
 *         modifiedBy: { type: string, description: "Opsional — default user token" }
 *         items: { type: array, items: { $ref: '#/components/schemas/OutstandingIncomingQiItemDto' } }
 */
export class QualityInspectionDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;

  @IsOptional()
  @IsString({ message: 'ModifiedBy must be a string' })
  modifiedBy?: string;

  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => QiItemDto)
  items!: QiItemDto[];
}

/** Param B5/B6 header id */
export class HeaderIdParamDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/** Whitelist kolom search B5 (parity usp_DataFilterResult) */
export const FILTER_RESULT_COLUMNS = [
  'DeliveryNoteNo',
  'PONo',
  'MaterialCode',
] as const;

export class FilterResultColumnHelper {
  static parse(searchParam: string): { column: string; value: string } | null {
    const idx = searchParam.indexOf('|');
    if (idx <= 0) return null;
    return {
      column: searchParam.slice(0, idx),
      value: searchParam.slice(idx + 1),
    };
  }
}

export const isFilterResultColumn = (c: string): boolean =>
  (FILTER_RESULT_COLUMNS as readonly string[]).includes(c);
