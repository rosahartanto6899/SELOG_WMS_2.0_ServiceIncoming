import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

const csvToArray = ({ value }: { value: unknown }) =>
  value === undefined || value === null || Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v !== '');

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingTotalsDto:
 *       type: object
 *       required: [warehouseCodes]
 *       properties:
 *         customerCode: { type: string }
 *         warehouseCodes: { type: array, items: { type: string }, description: "CSV/array kode gudang" }
 */
export class TotalsDto {
  @IsOptional()
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode?: string;

  @Transform(csvToArray)
  @IsArray({ message: 'WarehouseCodes must be an array or csv' })
  @IsString({ each: true, message: 'Each warehouseCode must be a string' })
  @MinLength(1, { message: 'WarehouseCodes must not be empty' })
  warehouseCodes!: string[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingIndicatorDto:
 *       type: object
 *       required: [customerCode, warehouseCode]
 *       properties:
 *         customerCode: { type: string }
 *         warehouseCode: { type: string }
 */
export class IndicatorDto {
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode!: string;

  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode!: string;
}
