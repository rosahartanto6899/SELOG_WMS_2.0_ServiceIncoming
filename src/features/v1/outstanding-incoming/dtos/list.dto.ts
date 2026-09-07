import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LIST_ORDER_WHITELIST, LIST_SEARCH_COLUMNS } from '../constants';

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingListDto:
 *       type: object
 *       properties:
 *         page: { type: integer, minimum: 1, example: 1 }
 *         limit: { type: integer, minimum: 1, maximum: 100, example: 10 }
 *         search: { type: string, example: "DN-123" }
 *         searchBy: { type: string, enum: [poNo, deliveryNoteNo, customerName, referenceNo, supplierName, description, status], description: "Kolom search (pola LOGIS); tanpa searchBy = LIKE gabung 7 kolom (parity SP)" }
 *         customerCode: { type: string, description: Filter LIKE }
 *         warehouseCode: { type: string, description: Filter LIKE }
 *         materialCategory: { type: string, description: Filter exact di detail (SP @MaterialCode) }
 *         deliveryNoteNoFilter: { type: string, description: Filter LIKE }
 *         order: { type: string, enum: [id, customerName, warehouseName, deliveryNoteNo, poNo, poType, poDate, supplierName, incomingDate, referenceNo, description, status, createdAt, createdBy, isHold] }
 *         sort: { type: string, enum: [asc, desc] }
 */
export class ListDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'CustomerCode must be a string' })
  customerCode?: string;

  @IsOptional()
  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode?: string;

  @IsOptional()
  @IsString({ message: 'MaterialCategory must be a string' })
  materialCategory?: string;

  @IsOptional()
  @IsString({ message: 'DeliveryNoteNoFilter must be a string' })
  deliveryNoteNoFilter?: string;

  @IsOptional()
  @IsString({ message: 'Order must be a string' })
  @IsIn(Object.keys(LIST_ORDER_WHITELIST), {
    message: `Order must be one of: ${Object.keys(LIST_ORDER_WHITELIST).join(', ')}`,
  })
  order?: string;

  @IsOptional()
  @IsString({ message: 'Sort must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort must be either asc or desc' })
  sort?: string;

  /**
   * Parity SP + pola LOGIS: searchBy whitelist 7 kolom yang sama dengan search
   * gabung. Nilai di luar whitelist → 422 (AC-2).
   */
  @IsOptional()
  @IsString({ message: 'SearchBy must be a string' })
  @IsIn([...LIST_SEARCH_COLUMNS], {
    message: `SearchBy must be one of: ${LIST_SEARCH_COLUMNS.join(', ')}`,
  })
  searchBy?: string;
}
