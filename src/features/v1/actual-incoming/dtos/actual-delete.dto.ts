import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * @swagger
 *   ActualIncomingDeleteOneDto:
 *     type: object
 *     required: [description]
 *     properties:
 *       description: { type: string, description: "Alasan hapus (audit)" }
 */
export class ActualDeleteOneDto {
  @IsString({ message: 'Description must be a string' })
  @MinLength(1, { message: 'Description (alasan) is required' })
  description!: string;

  @IsOptional()
  @IsString({ message: 'UserLogin must be a string' })
  userLogin?: string;
}
