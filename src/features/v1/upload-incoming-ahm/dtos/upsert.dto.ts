import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { uploadIncomingAhmConstant as cst } from '../constants/upload-incoming-ahm.constant';

/**
 * DTO untuk satu baris AHM — dipakai PUT /v1/upload-incoming-ahm/bulk.
 * Frontend memanggil per baris (pola upsertVehicle ServiceVehicle).
 */
export class UpsertDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  deliveryNoteNo: string;

  @IsNotEmpty()
  @Matches(cst.dateRegex, { message: 'Delivery Note Date harus format YYYY-MM-DD' })
  deliveryNoteDate: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(75)
  deliveryNoteStatus: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  deliveryNoteType: string;

  @IsOptional()
  @Matches(cst.dateRegex, { message: 'Plan Receive Min Date harus format YYYY-MM-DD' })
  planReceiveMinDate?: string;

  @IsOptional()
  @Matches(cst.timeRegex, { message: 'Plan Receive Min Time harus format HH:mm' })
  planReceiveMinTime?: string;

  @IsOptional()
  @Matches(cst.dateRegex, { message: 'Plan Receive Max Date harus format YYYY-MM-DD' })
  planReceiveMaxDate?: string;

  @IsOptional()
  @Matches(cst.timeRegex, { message: 'Plan Receive Max Time harus format HH:mm' })
  planReceiveMaxTime?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  plantId: string;

  @IsOptional()
  @IsString()
  @MaxLength(75)
  plantDesc?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(75)
  poNumber: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  gateId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  supplierId: string;

  @IsOptional()
  @IsString()
  @MaxLength(75)
  supplierDesc?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  poItem: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  supplierPartNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partNumberDesc?: string;

  @IsInt()
  @Min(1)
  qtySumDiOri: number;

  @IsInt()
  @Min(1)
  qtyDn: number;

  // === Metadata FE (row tracker upload) — diterima, tidak dipakai BE ===
  @IsOptional()
  @IsInt()
  no?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  upsertStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  upsertReason?: string;
}
