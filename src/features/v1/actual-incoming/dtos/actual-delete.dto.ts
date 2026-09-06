import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     ActualIncomingDeleteRowDto:
 *       type: object
 *       required: [id, description]
 *       properties:
 *         id: { type: string, format: uuid, description: "planIncomingHeaderId" }
 *         description: { type: string, description: "Alasan hapus (audit)" }
 */
export class ActualDeleteRowDto {
  @IsUUID('4', { message: 'Id must be a valid UUID' })
  id!: string;

  @IsString({ message: 'Description must be a string' })
  @MinLength(1, { message: 'Description (alasan) is required' })
  description!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ActualIncomingDeleteDto:
 *       type: object
 *       required: [items]
 *       properties:
 *         items: { type: array, items: { $ref: '#/components/schemas/ActualIncomingDeleteRowDto' } }
 */
export class ActualDeleteDto {
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ActualDeleteRowDto)
  items!: ActualDeleteRowDto[];

  @IsOptional()
  @IsString({ message: 'UserLogin must be a string' })
  userLogin?: string;
}
