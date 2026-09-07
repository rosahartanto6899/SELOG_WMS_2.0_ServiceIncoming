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

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingIdsActionDto:
 *       type: object
 *       required: [ids]
 *       properties:
 *         ids: { type: array, items: { type: string, format: uuid } }
 *         userLogin: { type: string, description: "Opsional — default dari token" }
 */
export class IdsActionDto {
  @IsArray({ message: 'Ids must be an array' })
  @IsUUID('4', { each: true, message: 'Each id must be a valid UUID' })
  ids!: string[];

  @IsOptional()
  @IsString({ message: 'UserLogin must be a string' })
  userLogin?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingHoldRowDto:
 *       type: object
 *       required: [planIncomingHeaderId, qty]
 *       properties:
 *         planIncomingHeaderId: { type: string, format: uuid }
 *         locationId: { type: string }
 *         locationName: { type: string }
 *         qty: { type: integer, minimum: 0 }
 *         description: { type: string }
 *         attachPhotos: { type: string }
 */
export class HoldRowDto {
  @IsUUID('4', { message: 'PlanIncomingHeaderId must be a valid UUID' })
  planIncomingHeaderId!: string;

  @IsOptional()
  @IsString({ message: 'LocationId must be a string' })
  locationId?: string;

  @IsOptional()
  @IsString({ message: 'LocationName must be a string' })
  locationName?: string;

  @IsInt({ message: 'Qty must be an integer' })
  @Min(0, { message: 'Qty must be at least 0' })
  qty!: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'AttachPhotos must be a string' })
  attachPhotos?: string;
}

/** A2 body: { holds: [...] } (parity TVP HoldIncomingTempsList1) */
export class HoldInsertDto {
  @IsArray({ message: 'Holds must be an array' })
  @ValidateNested({ each: true })
  @Type(() => HoldRowDto)
  holds!: HoldRowDto[];
}
