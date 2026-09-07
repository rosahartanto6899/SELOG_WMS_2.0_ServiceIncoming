import { IsOptional, IsString, IsUUID } from 'class-validator';

/** Param `:id` (UUID header/detail) */
export class DetailParamDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/** Param `:materialCode` */
export class MaterialCodeParamDto {
  @IsString({ message: 'MaterialCode must be a string' })
  materialCode!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingByMaterialDto:
 *       type: object
 *       required: [customerCode, warehouseCode, materialCode]
 *       properties:
 *         customerCode: { type: string, example: "SERA" }
 *         warehouseCode: { type: string, example: "WH1" }
 *         materialCode: { type: string, example: "PART-001" }
 */
export class ByMaterialDto {
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode!: string;

  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode!: string;

  @IsString({ message: 'MaterialCode must be a string' })
  materialCode!: string;
}

/** Query Q4 plan-qty (customerCode+warehouseCode exact, parity SP) */
export class PlanQtyQueryDto {
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode!: string;

  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode!: string;
}

/** Param `:headerId` untuk A4 hold detail */
export class HoldDetailParamDto {
  @IsUUID('4', { message: 'HeaderId must be a valid UUID' })
  headerId!: string;
}

/** Param `:id` untuk C6 edit / A9 cancel / B1 locations / B3 slip / A7 status */
export class HeaderParamDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/** Param opsional sederhana (toggle id = header id) */
export class ToggleParamDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/** A2b multipart field `id` (incomingPlanDetailId) */
export class AttachmentIdFieldDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/** Q8 history tidak butuh query — placeholder untuk konsistensi */
export class HistoryQueryDto {
  @IsOptional()
  @IsString({ message: 'Sort must be a string' })
  sort?: string;
}
