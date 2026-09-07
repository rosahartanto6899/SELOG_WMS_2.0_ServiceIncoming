import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ACTUAL_LIST_ORDER_WHITELIST, ACTUAL_LIST_SEARCH_COLUMNS } from '../constants';

/**
 * @swagger
 * components:
 *   schemas:
 *     ActualIncomingListDto:
 *       type: object
 *       properties:
 *         page: { type: integer, minimum: 1, example: 1 }
 *         limit: { type: integer, minimum: 1, maximum: 100, example: 10 }
 *         search: { type: string, example: "DN-123" }
 *         searchBy: { type: string, enum: [poNo, deliveryNoteNo, customerName, referenceNo, supplierName, description, status], description: "Kolom search (pola LOGIS); tanpa searchBy = LIKE gabung 7 kolom" }
 *         warehouseCode: { type: string, description: "Filter exact" }
 *         order: { type: string, enum: [id, deliveryNoteNo, poNo, poType, poDate, supplierName, incomingDate, referenceNo, status, grDate, createdAt] }
 *         sort: { type: string, enum: [asc, desc] }
 */
export class ActualListDto {
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
  @IsString({ message: 'WarehouseCode must be a string' })
  warehouseCode?: string;

  @IsOptional()
  @IsString({ message: 'Order must be a string' })
  @IsIn(Object.keys(ACTUAL_LIST_ORDER_WHITELIST), {
    message: `Order must be one of: ${Object.keys(ACTUAL_LIST_ORDER_WHITELIST).join(', ')}`,
  })
  order?: string;

  @IsOptional()
  @IsString({ message: 'Sort must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort must be either asc or desc' })
  sort?: string;

  /** Pola LOGIS: searchBy whitelist sama dengan search gabung. */
  @IsOptional()
  @IsString({ message: 'SearchBy must be a string' })
  @IsIn([...ACTUAL_LIST_SEARCH_COLUMNS], {
    message: `SearchBy must be one of: ${ACTUAL_LIST_SEARCH_COLUMNS.join(', ')}`,
  })
  searchBy?: string;
}
