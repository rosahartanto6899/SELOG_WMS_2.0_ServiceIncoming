import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Parity usp_UpdateQualityInspection — full correction of a single detail row
 * during QI. Direct SET (does not touch BinningDate/status, no partial reset).
 */
export class QiDetailUpdateDto {
  @IsOptional() @IsString() @MaxLength(100) materialCode?: string;
  @IsOptional() @IsString() @MaxLength(200) materialName?: string;
  @IsOptional() @IsString() @MaxLength(100) materialBrand?: string;
  @IsOptional() @IsString() @MaxLength(12) materialBarcode?: string;
  @IsOptional() @IsString() @MaxLength(12) materialLocationBarcode?: string;
  @IsOptional() @IsString() @MaxLength(20) uom?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) planQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) actualQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) partialQty?: number;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
