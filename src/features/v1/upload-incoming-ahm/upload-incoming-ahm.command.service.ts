import { inject, injectable } from 'inversify';
import { Request } from 'express';
import { Transaction } from 'sequelize';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { IDataUser } from '@/shared-libs/interfaces/user-data.interface';
import { UnprocessableEntityException } from '@/shared-libs/exceptions';
import { nowWib } from '@/utils';
import { sequelize } from '@/utils';
import { uploadIncomingAhmConstant as cst } from './constants/upload-incoming-ahm.constant';
import {
  PlanIncomingHeaderRepository,
  PlanIncomingDetailRepository,
  PlanIncomingAddInfoRepository,
  AddInfoRow,
} from './repositories';
import { UpsertDto } from './dtos';

type CollectedErrors = { field: string; message: string[] }[];

/**
 * Upsert satu baris AHM (pola upsertBulk ServiceVehicle) — pengganti SP
 * usp_InsertHeaderDetailPlanIncomingAHMByFileName. Natural key:
 * header = deliveryNoteNo, detail = headerId + materialCode.
 */
@injectable()
export class UploadIncomingAhmCommandService {
  constructor(
    @inject(PlanIncomingHeaderRepository)
    private readonly headerRepository: PlanIncomingHeaderRepository,
    @inject(PlanIncomingDetailRepository)
    private readonly detailRepository: PlanIncomingDetailRepository,
    @inject(PlanIncomingAddInfoRepository)
    private readonly addInfoRepository: PlanIncomingAddInfoRepository,
  ) {}

  async upsertBulk(req: Request): Promise<{ data: null; httpCode: number }> {
    const body = this.normalize(req.body as UpsertDto);
    const userData = req.user as unknown as IDataUser;
    const userBy = userData?.tokenUserId ?? 'system';
    let isCreate = true;

    // warehouse aktif dari token (parity customer) — bukan payload FE
    const warehouseCode =
      userData?.activeWarehouseCode ?? null;
    const warehouseName =
      userData?.activeWarehouseName ?? null;
    if (!warehouseCode || !warehouseName) {
      throw new UnprocessableEntityException([
        {
          field: 'warehouseCode',
          message: ['No active warehouse for this session'],
        },
      ]);
    }

    await sequelize.transaction(async (transaction: Transaction) => {
      // === Header: find-or-create by DeliveryNoteNo (lock saat cek) ===
      const existingHeader = await this.headerRepository.getByDeliveryNoteNo(
        body.deliveryNoteNo,
        transaction,
        true,
      );

      const allErrors: CollectedErrors = [];
      this.validateQty(body, allErrors);
      this.validateDnStatus(existingHeader?.get({ plain: true }), allErrors);
      if (allErrors.length) {
        throw new UnprocessableEntityException(allErrors);
      }

      if (existingHeader) {
        isCreate = false;
        // Re-upload (edit + submit ulang) menimpa field sumber Excel;
        // field lifecycle (status/isHold/isActive/created*) tidak disentuh.
        await this.headerRepository.update(
          existingHeader.get('id') as string,
          {
            warehouseCode,
            warehouseName,
            incomingDate: body.deliveryNoteDate,
            poNo: body.poNumber,
            poType: body.deliveryNoteType,
            poDate: body.deliveryNoteDate,
            supplierName: body.supplierDesc ?? body.supplierId,
            modifiedBy: userBy, modifiedDate: nowWib(),
          },
          transaction,
        );
      } else {
        await this.headerRepository.create(
          {
            customerCode: userData?.tokenCustomerCode ?? null,
            customerName: userData?.tokenCustomerName ?? '-',
            warehouseCode,
            warehouseName,
            deliveryNoteNo: body.deliveryNoteNo,
            incomingDate: body.deliveryNoteDate,
            poNo: body.poNumber,
            poType: body.deliveryNoteType,
            poDate: body.deliveryNoteDate,
            supplierName: body.supplierDesc ?? body.supplierId,
            materialCategory: cst.materialCategoryPart,
            status: cst.statusDraft,
            isHold: false,
            isActive: true,
            createdBy: userBy, createdDate: nowWib(),
          },
          transaction,
        );
      }

      // === Detail: find-or-create by header + materialCode ===
      const headerId =
        (existingHeader?.get('id') as string) ??
        (
          await this.headerRepository.getByDeliveryNoteNo(
            body.deliveryNoteNo,
            transaction,
          )
        )?.get('id') as string;

      const existingDetail =
        await this.detailRepository.getByHeaderAndMaterial(
          headerId,
          body.supplierPartNumber,
          transaction,
        );

      let detailId: string;
      if (existingDetail) {
        detailId = existingDetail.get('id') as string;
        // binningQty tidak ditimpa (paritas SP — hanya create yang isi 0)
        await this.detailRepository.update(
          detailId,
          {
            poQty: body.qtyDn,
            materialName: body.partNumberDesc ?? body.supplierPartNumber,
            modifiedBy: userBy, modifiedDate: nowWib(),
          },
          transaction,
        );
      } else {
        const detail = await this.detailRepository.create(
          {
            planIncomingHeaderId: headerId,
            materialCode: body.supplierPartNumber,
            materialName: body.partNumberDesc ?? body.supplierPartNumber,
            materialBrand: cst.materialBrandDefault,
            uom: cst.uomDefault,
            poQty: body.qtyDn,
            binningQty: 0,
            createdBy: userBy, createdDate: nowWib(),
          },
          transaction,
        );
        detailId = detail.get('id') as string;
      }

      // === AddInfo (EAV) — paritas SP ===
      const headerAddInfos: AddInfoRow[] = [
        { name: cst.addInfoName.dnStatus, value: body.deliveryNoteStatus },
        { name: cst.addInfoName.plantId, value: body.plantId },
        { name: cst.addInfoName.plantDesc, value: body.plantDesc ?? '' },
        { name: cst.addInfoName.gateId, value: body.gateId },
        { name: cst.addInfoName.supplierId, value: body.supplierId },
      ];
      await this.addInfoRepository.upsertHeaderAddInfos(
        headerId,
        headerAddInfos,
        userBy,
        transaction,
      );

      const detailAddInfos: AddInfoRow[] = [
        { name: cst.addInfoName.poItem, value: body.poItem },
        { name: cst.addInfoName.sumDiOri, value: String(body.qtySumDiOri) },
      ];
      await this.addInfoRepository.upsertDetailAddInfos(
        detailId,
        detailAddInfos,
        userBy,
        transaction,
      );
    });

    return {
      data: null,
      httpCode: isCreate ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    };
  }

  // === Normalisasi: legacy AHM (07-NOV-2022, 09:30:00) → kanonik (YYYY-MM-DD, HH:mm:ss) ===
  private normalize(body: UpsertDto): UpsertDto {
    const normDate = (v?: string) =>
      v && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(v)
        ? new Date(
            Date.parse(
              `${v.slice(7)}-${this.monthIndex(v.slice(3, 6))}-${v.slice(0, 2)}`,
            ),
          )
            .toISOString()
            .slice(0, 10)
        : v;
    const normTime = (v?: string) =>
      v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? `${v}:00` : v;

    body.deliveryNoteDate = normDate(body.deliveryNoteDate)!;
    body.planReceiveMinDate = normDate(body.planReceiveMinDate);
    body.planReceiveMaxDate = normDate(body.planReceiveMaxDate);
    body.planReceiveMinTime = normTime(body.planReceiveMinTime);
    body.planReceiveMaxTime = normTime(body.planReceiveMaxTime);
    return body;
  }

  private monthIndex(mon: string): string {
    return String(
      [
        'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
      ].indexOf(mon.toUpperCase()) + 1,
    ).padStart(2, '0');
  }

  // === Validasi bisnis (kumpul error, throw sekaligus) ===

  private validateQty(body: UpsertDto, errors: CollectedErrors) {
    if (body.qtyDn > body.qtySumDiOri) {
      errors.push({
        field: cst.key.qtyDn,
        message: [cst.messages.qtyDnExceed],
      });
    }
  }

  private validateDnStatus(
    header: { status?: string | null } | undefined,
    errors: CollectedErrors,
  ) {
    if (header && header.status && header.status !== cst.statusDraft) {
      errors.push({
        field: cst.key.status,
        message: [cst.messages.dnNotDraft],
      });
    }
  }
}
