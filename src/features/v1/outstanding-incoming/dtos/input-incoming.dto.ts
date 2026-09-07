import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingAddInfoDto:
 *       type: object
 *       properties:
 *         name: { type: string, example: "batch" }
 *         value: { type: string, example: "B-01" }
 */
export class AddInfoDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Value must be a string' })
  value?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingDetailRowDto:
 *       type: object
 *       required: [materialCode, materialName, materialBrand, uom, qty]
 *       properties:
 *         materialCode: { type: string }
 *         materialName: { type: string }
 *         materialBrand: { type: string }
 *         uom: { type: string }
 *         qty: { type: integer, minimum: 1 }
 *         barcode: { type: string }
 *         locationBarcode: { type: string }
 *         additionalInformation: { type: array, items: { $ref: '#/components/schemas/OutstandingIncomingAddInfoDto' } }
 */
export class DetailRowDto {
  @IsString({ message: 'MaterialCode must be a string' })
  @MaxLength(100)
  materialCode!: string;

  @IsString({ message: 'MaterialName must be a string' })
  materialName!: string;

  @IsString({ message: 'MaterialBrand must be a string' })
  materialBrand!: string;

  @IsString({ message: 'Uom must be a string' })
  uom!: string;

  @IsInt({ message: 'Qty must be an integer' })
  @Min(1, { message: 'Qty must be at least 1' })
  qty!: number;

  @IsOptional()
  @IsString({ message: 'Barcode must be a string' })
  barcode?: string;

  @IsOptional()
  @IsString({ message: 'LocationBarcode must be a string' })
  locationBarcode?: string;

  @IsOptional()
  @IsArray({ message: 'AdditionalInformation must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddInfoDto)
  additionalInformation?: AddInfoDto[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingCreateDto:
 *       type: object
 *       required: [customerCode, customerName, warehouseCode, warehouseName, poNo, deliveryNoteNo, details]
 *       properties:
 *         customerCode: { type: string }
 *         customerName: { type: string }
 *         warehouseCode: { type: string }
 *         warehouseName: { type: string }
 *         poNo: { type: string }
 *         poType: { type: string }
 *         poDate: { type: string, example: "2025-01-01" }
 *         supplierName: { type: string }
 *         deliveryNoteNo: { type: string }
 *         incomingDate: { type: string, example: "2025-01-02" }
 *         referenceNo: { type: string }
 *         materialCategory: { type: string, example: "Part" }
 *         description: { type: string }
 *         additionalInformation: { type: array, items: { $ref: '#/components/schemas/OutstandingIncomingAddInfoDto' } }
 *         details: { type: array, items: { $ref: '#/components/schemas/OutstandingIncomingDetailRowDto' } }
 */
export class CreateIncomingDto {
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode!: string;

  @IsString({ message: 'CustomerName must be a string' })
  customerName!: string;

  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode!: string;

  @IsString({ message: 'WarehouseName must be a string' })
  warehouseName!: string;

  @IsString({ message: 'PoNo must be a string' })
  poNo!: string;

  @IsOptional()
  @IsString({ message: 'PoType must be a string' })
  poType?: string;

  @IsOptional()
  @IsString({ message: 'PoDate must be a string' })
  poDate?: string;

  @IsOptional()
  @IsString({ message: 'SupplierName must be a string' })
  supplierName?: string;

  @IsString({ message: 'DeliveryNoteNo must be a string' })
  deliveryNoteNo!: string;

  @IsOptional()
  @IsString({ message: 'IncomingDate must be a string' })
  incomingDate?: string;

  @IsOptional()
  @IsString({ message: 'ReferenceNo must be a string' })
  referenceNo?: string;

  @IsOptional()
  @IsString({ message: 'MaterialCategory must be a string' })
  materialCategory?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'AdditionalInformation must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddInfoDto)
  additionalInformation?: AddInfoDto[];

  @IsArray({ message: 'Details must be an array' })
  @ValidateNested({ each: true })
  @Type(() => DetailRowDto)
  details!: DetailRowDto[];
}

/** C2 body — satu baris atau array */
export class AddDetailDto {
  @IsArray({ message: 'Details must be an array' })
  @ValidateNested({ each: true })
  @Type(() => DetailRowDto)
  details!: DetailRowDto[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingUpdateHeaderDto:
 *       type: object
 *       description: Edit header (C3) — field sama seperti create, add-info replace
 */
export class UpdateIncomingHeaderDto {
  @IsOptional()
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode?: string;

  @IsOptional()
  @IsString({ message: 'CustomerName must be a string' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode?: string;

  @IsOptional()
  @IsString({ message: 'WarehouseName must be a string' })
  warehouseName?: string;

  @IsOptional()
  @IsString({ message: 'PoNo must be a string' })
  poNo?: string;

  @IsOptional()
  @IsString({ message: 'PoType must be a string' })
  poType?: string;

  @IsOptional()
  @IsString({ message: 'PoDate must be a string' })
  poDate?: string;

  @IsOptional()
  @IsString({ message: 'SupplierName must be a string' })
  supplierName?: string;

  @IsOptional()
  @IsString({ message: 'DeliveryNoteNo must be a string' })
  deliveryNoteNo?: string;

  @IsOptional()
  @IsString({ message: 'IncomingDate must be a string' })
  incomingDate?: string;

  @IsOptional()
  @IsString({ message: 'ReferenceNo must be a string' })
  referenceNo?: string;

  @IsOptional()
  @IsString({ message: 'MaterialCategory must be a string' })
  materialCategory?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'AdditionalInformation must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddInfoDto)
  additionalInformation?: AddInfoDto[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingUpdateDetailDto:
 *       type: object
 *       required: [qty]
 *       properties:
 *         qty: { type: integer, minimum: 1, description: "poQty baru (C4 — hanya poQty via jalur ini)" }
 *         additionalInformation: { type: array, items: { $ref: '#/components/schemas/OutstandingIncomingAddInfoDto' } }
 */
export class UpdateIncomingDetailDto {
  @IsInt({ message: 'Qty must be an integer' })
  @Min(1, { message: 'Qty must be at least 1' })
  qty!: number;

  @IsOptional()
  @IsArray({ message: 'AdditionalInformation must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddInfoDto)
  additionalInformation?: AddInfoDto[];
}

/** C5 bulk delete detail */
export class DeleteDetailsDto {
  @IsArray({ message: 'Ids must be an array' })
  @IsUUID('4', { each: true, message: 'Each id must be a valid UUID' })
  ids!: string[];
}
