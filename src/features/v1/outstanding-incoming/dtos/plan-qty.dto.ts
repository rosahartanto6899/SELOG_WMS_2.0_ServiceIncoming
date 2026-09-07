import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingPlanQtyDto:
 *       type: object
 *       required: [planQty]
 *       properties:
 *         planQty: { type: integer, minimum: 0 }
 *         description: { type: string, description: "Di-append ke description existing (SP: + '. ')" }
 */
export class PlanQtyDto {
  @IsInt({ message: 'PlanQty must be an integer' })
  @Min(0, { message: 'PlanQty must be at least 0' })
  planQty!: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}

/** Param `:id` detail (A6/C4) */
export class DetailIdParamDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     OutstandingIncomingStatusDto:
 *       type: object
 *       required: [status]
 *       properties:
 *         status: { type: string, example: "Binning" }
 */
export class UpdateStatusDto {
  @IsString({ message: 'Status must be a string' })
  status!: string;
}
