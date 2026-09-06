import { inject, injectable } from 'inversify';
import { Op, WhereOptions } from 'sequelize';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import {
  BadRequestException,
  NotFoundException,
} from '@/shared-libs/exceptions';
import { IDataUser } from '@/shared-libs/interfaces/user-data.interface';
import { sequelize, nowWib, mediaToBlob } from '@/utils';
import { awsSqsThird } from '@/integrations/thrid-party/aws-sqs.third';
import {
  PlanIncomingDetail,
  PlanIncomingHeader,
  PlanIncomingHeaderAddInfo,
  PlanIncomingDetailAddInfo,
} from '@/database/entities';
import {
  OutstandingIncomingRepository,
  HoldIncomingRepository,
  ActualIncomingRepository,
  PlanIncomingDetailRepository,
} from './repositories';
import { ByIdTransform } from './transforms';
import {
  FILTER_RESULT_STATUS,
  INCOMING_STATUS,
  outstandingIncomingConstant as cst,
  STATUS_UPDATE_GUARD,
  computePlanQtyUpdate,
  computeBinningQty,
} from './constants';
import {
  CreateActualDto,
  CreateIncomingDto,
  DetailRowDto,
  FilterResultColumnHelper,
  isFilterResultColumn,
  QiDetailUpdateDto,
  QualityInspectionDto,
  UpdateIncomingHeaderDto,
} from './dtos';

const userOf = (req: any): string => {
  const userData = req.user as unknown as IDataUser;
  return userData?.tokenName ?? userData?.tokenUserId ?? 'system';
};

const toDate = (v?: string): Date | null => (v ? new Date(v) : null);

/** A1–A11, B1–B7, C1–C6 — transaction Sequelize, tanpa SP (parity aturan SP) */
@injectable()
export class CommandService {
  constructor(
    @inject(OutstandingIncomingRepository)
    private readonly repository: OutstandingIncomingRepository,
    @inject(HoldIncomingRepository)
    private readonly holdRepository: HoldIncomingRepository,
    @inject(ActualIncomingRepository)
    private readonly actualRepository: ActualIncomingRepository,
    @inject(PlanIncomingDetailRepository)
    private readonly detailRepository: PlanIncomingDetailRepository,
  ) {}

  // ================= Aksi A =================

  /** A1 confirm-draft (usp_ConfirmDraftData) */
  async confirmDraft(req: any) {
    const { ids } = req.body;
    const userBy = req.body.userLogin ?? userOf(req);
    const headers = await this.repository.findByIds(ids);
    const drafts = headers.filter((h) => h.get('status') === INCOMING_STATUS.DRAFT);

    if (!drafts.length) {
      return { data: { message: cst.messages.updateSkipped }, httpCode: HTTP_STATUS.OK };
    }

    await sequelize.transaction(async (t) => {
      for (const header of drafts) {
        const id = header.get('id') as string;
        await this.repository.updateHeader(
          id,
          { status: INCOMING_STATUS.CONFIRMED, modifiedBy: userBy, modifiedDate: nowWib() },
          t,
        );
        await this.repository.insertHistory(id, INCOMING_STATUS.CONFIRMED, userBy, t);
      }
    });

    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** A2 holds insert (usp_InsertHoldIncoming — efek live: isHold=1 + record) */
  async insertHolds(req: any) {
    const { holds } = req.body;
    const userBy = userOf(req);
    await sequelize.transaction(async (t) => {
      await this.holdRepository.setHold(
        holds.map((h: any) => h.planIncomingHeaderId),
        userBy,
        t,
      );
      await this.holdRepository.insertHoldRows(holds, userBy, t);
    });
    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** A2b holds/attachments — multipart → Azure Blob → temp table */
  async uploadHoldAttachment(req: any) {
    const file = req.file as { originalname: string; size: number; buffer: Buffer };
    const id = req.body.id as string; // incomingPlanDetailId
    const userBy = userOf(req);
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const extension = `.${(file.originalname.split('.').pop() ?? '').toLowerCase()}`;
    const isImage = cst.imageExtensions.includes(extension as any);
    if (!isImage && file.size > cst.maxFileBytes) {
      throw new BadRequestException(cst.messages.fileTooBig);
    }

    let content = file.buffer;
    if (isImage && file.size > cst.maxFileBytes) {
      // parity CoreApp resizeImage: fit inside 2420x1580 → JPEG
      const sharp = (await import('sharp')).default;
      content = await sharp(file.buffer)
        .resize(cst.resize.width, cst.resize.height, { fit: 'inside' })
        .jpeg()
        .toBuffer();
    }

    const attachmentUrl = await mediaToBlob(
      content,
      process.env.BLOB_CONTAINER_NAME ?? '',
      `${cst.attachmentFolder}/${id}`,
      extension,
    );
    await this.holdRepository.insertAttachmentTemp(
      id,
      file.originalname,
      attachmentUrl,
      userBy,
    );

    return {
      data: { message: cst.messages.uploadSuccess, attachmentUrl },
      httpCode: HTTP_STATUS.CREATED,
    };
  }

  /** A3 GET holds (sp_GetAllDataHoldIncoming — join schedule) */
  async getHolds(req: any) {
    const param = req.query;
    const where: WhereOptions = {};
    if (param.customerCode) {
      where.customerCode = { [Op.like]: `%${param.customerCode}%` };
    }
    if (param.warehouseCode) {
      where.warehouseCode = { [Op.like]: `%${param.warehouseCode}%` };
    }
    if (param.deliveryNoteNo) {
      where.deliveryNoteNo = { [Op.like]: `%${param.deliveryNoteNo}%` };
    }
    if (param.poNo) {
      where.poNo = { [Op.like]: `%${param.poNo}%` };
    }
    if (param.supplierName) {
      where.supplierName = { [Op.like]: `%${param.supplierName}%` };
    }

    const headers = await this.holdRepository.findHolds(where);
    const ids = headers.map((h) => h.get('id') as string);
    const schedules = await this.holdRepository.findSchedulesByHeaderIds(ids);
    const holdRecords = await this.holdRepository.findHoldRecords(ids);
    const scheduleByHeader = new Map(
      schedules.map((s) => [s.get('planIncomingHeaderId'), s.get({ plain: true })]),
    );
    const holdByHeader = new Map(
      holdRecords.map((h) => [h.get('planIncomingHeaderId'), h.get({ plain: true })]),
    );

    return {
      data: headers.map((header) => {
        const h = header.get({ plain: true });
        const schedule = scheduleByHeader.get(h.id) as any;
        const hold = holdByHeader.get(h.id) as any;
        return {
          id: h.id,
          deliveryNoteNo: h.deliveryNoteNo,
          customerName: h.customerName,
          customerCode: h.customerCode,
          warehouseCode: h.warehouseCode,
          warehouseName: h.warehouseName,
          poNo: h.poNo,
          supplierName: h.supplierName,
          status: h.status,
          isHold: h.isHold ? 1 : 0,
          createdAt: h.createdDate,
          createdBy: h.createdBy,
          updatedAt: h.modifiedDate,
          // jadwal binning (HoldPlanIncoming)
          picReceiver: schedule?.picReceiver ?? '',
          picBinner: schedule?.picBinner ?? '',
          binningLocation: schedule?.binningLocation ?? '',
          incomingStartDate: schedule?.incomingStartDate ?? null,
          incomingStartTime: schedule?.incomingStartTime ?? null,
          incomingEndDate: schedule?.incomingEndDate ?? null,
          incomingEndTime: schedule?.incomingEndTime ?? null,
          // record hold (TVP parity)
          locationId: hold?.locationId ?? '',
          locationName: hold?.locationName ?? '',
          qty: hold?.qty ?? 0,
          holdDescription: hold?.description ?? '',
          attachPhotos: hold?.attachPhotos ?? '',
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A4 GET holds/:headerId (sp_GetAllDataHoldIncomingDetail) */
  async getHoldDetail(req: any) {
    const { headerId } = req.params;
    const details = await this.holdRepository.findHoldDetails(headerId);
    return {
      data: details.map((detail) => {
        const d = detail.get({ plain: true }) as any;
        return {
          id: d.id,
          planIncomingHeaderId: d.planIncomingHeaderId,
          materialCode: d.materialCode,
          materialName: d.materialName,
          materialBrand: d.materialBrand,
          uom: d.uom,
          qty: d.poQty,
          partialQty: d.partialQty ?? 0,
          binningQty: d.binningQty ?? 0,
          description: d.description,
          addInfos: (d.addInfos ?? []).map((a: any) => ({
            name: a.name,
            value: a.value,
          })),
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A5 holds/:id/toggle (usp_UpdateHoldIncoming — toggle flag header) */
  async toggleHold(req: any) {
    const { id } = req.params;
    await this.holdRepository.toggleHold(id, userOf(req));
    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** A6 details/:id/plan-qty (usp_UpdatePlanQtyOutstandingIncoming) */
  async updatePlanQty(req: any) {
    const { id } = req.params;
    const { planQty, description } = req.body;
    const userBy = userOf(req);

    const row = await this.detailRepository.findWithHeader(id);
    if (!row) {
      throw new NotFoundException('Detail not found');
    }
    const detail = row.get({ plain: true }) as any;
    const header = detail.header;

    const { updates, stockAvailability } = computePlanQtyUpdate(
      detail,
      header ?? { status: null },
      planQty,
      description,
    );
    updates.modifiedDate = nowWib();
    updates.modifiedBy = userBy;

    await sequelize.transaction(async (t) => {
      await this.detailRepository.update(id, updates, t);
    });

    // Respons StockAvailability hanya detail binned non-Draft (parity SP SELECT)
    const stockAvailabilities = stockAvailability
      ? [
          {
            customerCode: header.customerCode,
            customerName: header.customerName,
            deliveryNoteNo: header.deliveryNoteNo,
            warehouseCode: header.warehouseCode,
            warehouseName: header.warehouseName,
            materialCode: detail.materialCode,
            materialName: detail.materialName,
            materialBrand: detail.materialBrand,
            uom: detail.uom,
            qtyPlanIncoming: 0, // hardcoded parity SP
            qtyPlanOutgoing: 0, // hardcoded parity SP (tanpa join planOutgoing)
            qtySOH: planQty - (detail.binningQty ?? 0),
          },
        ]
      : [];

    return {
      data: { message: cst.messages.success, stockAvailabilities },
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A7 :id/status (usp_UpdateStatusIncoming) */
  async updateStatus(req: any) {
    const { id } = req.params;
    const { status } = req.body;
    const userBy = userOf(req);
    const header = await this.repository.getById(id);

    if (
      !header ||
      (STATUS_UPDATE_GUARD as readonly string[]).includes(
        (header.get('status') as string) ?? '',
      )
    ) {
      return { data: { message: cst.messages.updateSkipped }, httpCode: HTTP_STATUS.OK };
    }

    await sequelize.transaction(async (t) => {
      await this.repository.updateHeader(
        id,
        { status, modifiedBy: userBy, modifiedDate: nowWib() },
        t,
      );
      await this.repository.insertHistory(id, status, userBy, t);
    });

    // parity SP: return CustomerCode
    return {
      data: { message: header.get('customerCode') },
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A8 delete bulk (usp_DeleteOutstandingIncoming — hanya Draft, soft) */
  async deleteOutstanding(req: any) {
    const { ids } = req.body;
    const userBy = req.body.userLogin ?? userOf(req);
    const now = nowWib();
    await sequelize.transaction(async (t) => {
      for (const id of ids) {
        const header = await this.repository.getById(id, t);
        if (header?.get('status') === INCOMING_STATUS.DRAFT) {
          await this.repository.updateHeader(
            id,
            {
              isActive: false,
              deletedDate: now,
              deletedBy: userBy,
              modifiedDate: now,
              modifiedBy: userBy,
            },
            t,
          );
        } // non-Draft dilewati diam-diam (parity SP)
      }
    });
    return { data: null, httpCode: HTTP_STATUS.OK };
  }

  /** A9 :id/cancel (usp_CancelPlanIncoming — hard delete 4 relasi berurutan) */
  async cancelPlanIncoming(req: any) {
    const { id } = req.params;
    await sequelize.transaction(async (t) => {
      const details = await this.detailRepository.findByHeader(id, t);
      const detailIds = details.map((d) => d.get('id') as string);
      if (detailIds.length) {
        await PlanIncomingDetailAddInfo.destroy({
          where: { planIncomingDetailId: detailIds },
          transaction: t,
        });
      }
      await PlanIncomingDetail.destroy({
        where: { planIncomingHeaderId: id },
        transaction: t,
      });
      await PlanIncomingHeaderAddInfo.destroy({
        where: { planIncomingHeaderId: id },
        transaction: t,
      });
      await PlanIncomingHeader.destroy({ where: { id }, transaction: t });
    });
    return { data: null, httpCode: HTTP_STATUS.OK };
  }

  /** A10 for-actual (IncomingForActualDto — 6 grup dari ids terpilih) */
  async getForActual(req: any) {
    const { ids } = req.body;
    const headers = await this.repository.findByIds(ids);
    const details = await this.detailRepository.findByHeaderIds(ids);

    const headerAddInfos = await PlanIncomingHeaderAddInfo.findAll({
      where: { planIncomingHeaderId: ids },
    });

    const detailIds = details.map((d) => d.get('id') as string);
    const detailAddInfos = detailIds.length
      ? await PlanIncomingDetailAddInfo.findAll({
          where: { planIncomingDetailId: detailIds },
        })
      : [];

    const attachments = [
      ...(await this.holdRepository.findAttachmentTemps(ids)).map((a) =>
        a.get({ plain: true }),
      ),
      ...(await this.holdRepository.findAttachments(ids)).map((a) =>
        a.get({ plain: true }),
      ),
    ];

    const transform = new ByIdTransform();
    return {
      data: {
        headerIncoming: headers.map((h) => {
          const mapped = transform.transform({
            ...h.get({ plain: true }),
            details: [],
            addInfos: [],
          });
          delete mapped.details;
          delete mapped.addInfos;
          return mapped;
        }),
        detailIncoming: details.map((d) => {
          const plain = d.get({ plain: true });
          return {
            id: plain.id,
            planIncomingHeaderId: plain.planIncomingHeaderId,
            materialCode: plain.materialCode,
            materialName: plain.materialName,
            materialBrand: plain.materialBrand,
            uom: plain.uom,
            poQty: plain.poQty,
            partialQty: plain.partialQty ?? 0,
            binningQty: plain.binningQty ?? 0,
            description: plain.description ?? null,
          };
        }),
        additionalHeader: headerAddInfos.map((a) => {
          const plain = a.get({ plain: true });
          return {
            planIncomingHeaderId: plain.planIncomingHeaderId,
            name: plain.name,
            value: plain.value,
          };
        }),
        additionalDetail: detailAddInfos.map((a) => {
          const plain = a.get({ plain: true });
          return {
            planIncomingDetailId: plain.planIncomingDetailId,
            name: plain.name,
            value: plain.value,
          };
        }),
        attachmentIncoming: attachments.map((a) => ({
          incomingPlanDetailId: a.incomingPlanDetailId,
          fileName: a.fileName,
          attachmentUrl: a.attachmentUrl,
        })),
        stockAvailabilities: [], // dihitung consumer inventory stock (2.0)
      },
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A11 actual/GR (usp_InsertActualIncoming + usp_UpdateHeaderIncomingActual) */
  async createActual(req: any) {
    const body = req.body as CreateActualDto;
    const userBy = userOf(req);
    const grBy = body.grBy ?? userBy;
    const now = nowWib();

    await sequelize.transaction(async (t) => {
      // 1. attachment temp → permanen
      await this.holdRepository.moveTempToPermanent(body.ids, t);

      // 2. header: Incoming Finished + isHold=0 + isActual=1
      for (const id of body.ids) {
        await this.repository.updateHeader(
          id,
          {
            status: INCOMING_STATUS.INCOMING_FINISHED,
            isHold: false,
            isActual: true,
            modifiedBy: grBy,
            modifiedDate: now,
          },
          t,
        );
      }

      // 3. binningLocation dari schedule (HoldPlanIncoming)
      const schedules = await this.holdRepository.findSchedulesByHeaderIds(body.ids);
      const locationByHeader = new Map(
        schedules.map((s) => [
          s.get('planIncomingHeaderId') as string,
          (s.get('binningLocation') as string) ?? null,
        ]),
      );

      // 4. record ActualIncoming (penyimpanan 2.0 data GR)
      await this.actualRepository.insertActuals(
        body.ids.map((id) => ({
          planIncomingHeaderId: id,
          picReceiver: body.picReceiver ?? null,
          picBinner: body.picBinner ?? null,
          grBy,
          grDate: now,
          binningLocation: locationByHeader.get(id) ?? null,
        })),
        userBy,
        t,
      );
    });

    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  // ================= Binning & QI (B) =================

  /** B1 :id/locations (usp_GetLocationActualIncoming) */
  async getLocations(req: any) {
    const { id } = req.params;
    const rows = await this.actualRepository.findLocations([id]);
    return {
      data: rows.map((row) => ({
        location: row.get('binningLocation'),
        planIncomingHeaderId: row.get('planIncomingHeaderId'),
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** B2 details/:id/binning (usp_UpdateBinningDate + ready-check + SQS) */
  async binning(req: any) {
    const { id } = req.params;
    const { actualQty } = req.body;
    const userBy = userOf(req);
    const now = nowWib();

    const row = await this.detailRepository.findWithHeader(id);
    if (!row) {
      throw new NotFoundException('Detail not found');
    }
    const detail = row.get({ plain: true }) as any;
    const header = detail.header;
    const headerId = detail.planIncomingHeaderId;
    const newBinningQty = computeBinningQty(detail.binningQty, actualQty); // INCREMENT parity SP

    await sequelize.transaction(async (t) => {
      await this.detailRepository.update(
        id,
        {
          binningQty: newBinningQty,
          partialQty: 0, // reset parity SP
          binningDate: now,
          binningBy: userBy,
          modifiedDate: now,
          modifiedBy: userBy,
        },
        t,
      );

      // ready-check (usp_CheckReadyToGoodsReceipt): semua detail POQty=BinningQty
      // → auto Goods Receipt via jalur A7 (guard lolos) + history
      const notReady = await this.detailRepository.existsUnbinned(headerId, t);
      if (!notReady) {
        await this.repository.updateHeader(
          headerId,
          {
            status: INCOMING_STATUS.GOODS_RECEIPT,
            modifiedBy: userBy,
            modifiedDate: now,
          },
          t,
        );
        await this.repository.insertHistory(
          headerId,
          INCOMING_STATUS.GOODS_RECEIPT,
          userBy,
          t,
        );
      }

      // SQS publish qty binning — DI DALAM transaksi: gagal publish = gagal
      // binning (rollback, binningQty/partialQty tidak berubah)
      await awsSqsThird.publishToInventory(
        {
          CustomerCode: header?.customerCode ?? null,
          CustomerName: header?.customerName ?? null,
          DeliveryNoteNo: header?.deliveryNoteNo ?? null,
          POType: header?.poType ?? null,
          PODate: header?.poDate ? new Date(header.poDate).toISOString() : null,
          WarehouseCode: header?.warehouseCode ?? null,
          WarehouseName: header?.warehouseName ?? null,
          MaterialCode: detail.materialCode,
          MaterialName: detail.materialName,
          MaterialBrand: detail.materialBrand,
          UoM: detail.uom,
          QtyPlanIncoming: 0,
          QtyPlanOutgoing: 0,
          QtySOH: actualQty,
          QtyAvailable: 0,
        },
        userBy,
      );
    });

    // parity SP: SELECT TOP 1 header
    return {
      data: {
        customerCode: header?.customerCode,
        customerName: header?.customerName,
        warehouseCode: header?.warehouseCode,
        warehouseName: header?.warehouseName,
      },
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** B3 :id/binning-slip (usp_GetPrintDataBinningSlip — kolom PrintBinningListDto) */
  async getBinningSlip(req: any) {
    const { id } = req.params;
    const rows = await this.detailRepository.findBinningSlipRows(id);
    return {
      data: rows.map((row) => {
        const d = row.get({ plain: true }) as any;
        const h = d.header;
        return {
          id: h?.id,
          customerCode: h?.customerCode,
          customerName: h?.customerName,
          warehouseCode: h?.warehouseCode,
          warehouseName: h?.warehouseName,
          supplierName: h?.supplierName,
          referenceNo: h?.referenceNo,
          poNo: h?.poNo,
          materialCode: d.materialCode,
          materialName: d.materialName,
          description: d.description,
          brand: d.materialBrand,
          qty: d.partialQty,
          satuan: d.uom,
          loc: d.materialLocationBarcode,
          remark: 'remark', // parity SP: literal
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** B4 barcodes/sync (usp_UpdateBarcodeIncoming) — basic auth internal */
  async syncBarcodes() {
    const updated = await this.detailRepository.syncBarcodes();
    return {
      data: { message: cst.messages.success, updated },
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** B5 filter-result (usp_DataFilterResult) */
  async filterResult(req: any) {
    const { customerCode, warehouseCodes, searchParam } = req.body;
    const parsed = FilterResultColumnHelper.parse(searchParam);
    if (!parsed || !isFilterResultColumn(parsed.column)) {
      throw new BadRequestException(
        'searchParam must be format "column|value" (DeliveryNoteNo|PONo|MaterialCode)',
      );
    }
    const like = `%${parsed.value}%`;

    const headerWhere: WhereOptions = {
      customerCode,
      warehouseCode: { [Op.in]: warehouseCodes },
      status: { [Op.in]: [...FILTER_RESULT_STATUS] },
      isActive: true,
    };
    let detailWhere: WhereOptions | null = null;
    if (parsed.column === 'DeliveryNoteNo') {
      headerWhere.deliveryNoteNo = { [Op.like]: like };
    } else if (parsed.column === 'PONo') {
      headerWhere.poNo = { [Op.like]: like };
    } else {
      detailWhere = { materialCode: { [Op.like]: like } };
    }

    const rows = await this.repository.findAll(
      headerWhere,
      detailWhere,
      [['createdDate', 'DESC']],
      500,
      0,
    );
    const seen = new Set<string>();
    const data = rows
      .filter((r) => {
        const key = `${r.warehouseCode}|${r.deliveryNoteNo}|${r.poNo}`;
        if (seen.has(key)) return false; // GROUP BY parity
        seen.add(key);
        return true;
      })
      .map((r) => ({
        warehouseCode: r.warehouseCode,
        warehouseName: r.warehouseName,
        deliveryNoteNo: r.deliveryNoteNo,
        poNo: r.poNo,
        description: r.description,
      }));

    return { data, httpCode: HTTP_STATUS.OK };
  }

  /** B6 quality-inspection (usp_SaveQualityInspectionChanges) */
  async saveQualityInspection(req: any) {
    const body = req.body as QualityInspectionDto;
    const modifiedBy = body.modifiedBy ?? userOf(req);
    await sequelize.transaction(async (t) => {
      await this.detailRepository.updateQualityInspection(
        body.id,
        body.items,
        modifiedBy,
        t,
      );
    });
    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** B6-list — temp attachments per detail (QI working screen) */
  async listDetailAttachments(req: any) {
    const { id } = req.params;
    const rows = await this.holdRepository.findAttachmentTempsByDetail(id);
    return {
      data: rows.map((row) => ({
        fileName: row.get('fileName'),
        attachmentUrl: row.get('attachmentUrl'),
        createdDate: row.get('createdDate'),
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** B6-detail — single QI row correction (parity usp_UpdateQualityInspection):
   * direct SET; does not touch BinningDate/status, no partial reset. */
  async updateQiDetail(req: any) {
    const { id } = req.params;
    const body = req.body as QiDetailUpdateDto;
    const userBy = userOf(req);

    const detail = await this.detailRepository.getById(id);
    if (!detail) throw new NotFoundException('Detail not found');

    const updates: Record<string, unknown> = { modifiedDate: nowWib(), modifiedBy: userBy };
    if (body.materialCode !== undefined) updates.materialCode = body.materialCode;
    if (body.materialName !== undefined) updates.materialName = body.materialName;
    if (body.materialBrand !== undefined) updates.materialBrand = body.materialBrand;
    if (body.materialBarcode !== undefined) updates.materialBarcode = body.materialBarcode;
    if (body.materialLocationBarcode !== undefined)
      updates.materialLocationBarcode = body.materialLocationBarcode;
    if (body.uom !== undefined) updates.uom = body.uom;
    if (body.planQty !== undefined) updates.poQty = body.planQty;
    if (body.actualQty !== undefined) updates.binningQty = body.actualQty;
    if (body.partialQty !== undefined) updates.partialQty = body.partialQty;
    if (body.description !== undefined) updates.description = body.description;

    await sequelize.transaction(async (t) => {
      await this.detailRepository.update(id, updates as any, t);
    });
    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** B7 gr-result-report (kolom ReportBinningDto) */
  async getGrResultReport() {
    const rows = await PlanIncomingDetail.findAll({
      where: { binningDate: { [Op.ne]: null } },
      include: [{ model: PlanIncomingHeader, as: 'header' }],
      order: [['binningDate', 'DESC']],
    });
    return {
      data: rows.map((row) => {
        const d = row.get({ plain: true }) as any;
        const h = d.header;
        return {
          warehouseCode: h?.warehouseCode,
          warehouseName: h?.warehouseName,
          poNo: h?.poNo,
          poType: h?.poType,
          supplierName: h?.supplierName,
          deliveryNoteNo: h?.deliveryNoteNo,
          incomingDate: h?.incomingDate,
          referenceNo: h?.referenceNo,
          description: h?.description,
          materialCode: d.materialCode,
          materialName: d.materialName,
          materialBrand: d.materialBrand,
          poQty: d.poQty,
          binningQty: d.binningQty,
          uom: d.uom,
          binningDate: d.binningDate,
          descriptionDetail: d.description,
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  // ================= Input manual (C) =================

  /** C1 POST / — satu submit atomic (usp_InsertPlanIncoming + Detail) */
  async createIncoming(req: any) {
    const body = req.body as CreateIncomingDto;
    const userBy = userOf(req);
    const now = nowWib();

    // guard duplikat materialCode dalam payload (atomic — dicek sebelum insert)
    const codes = body.details.map((d) => d.materialCode);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException(
        'duplicate materialCode in payload',
        codes.filter((c, i) => codes.indexOf(c) !== i).map((c) => ({ field: 'details', message: [`${c} duplicated`] })),
      );
    }

    let headerId = '';
    await sequelize.transaction(async (t) => {
      // guard DN unik (parity SP: EXISTS semua header, termasuk soft-deleted)
      const existing = await this.repository.getByDeliveryNoteNo(
        body.deliveryNoteNo,
        t,
        true,
      );
      if (existing) {
        throw new BadRequestException(cst.messages.alreadyExists);
      }

      const header = await this.repository.createHeader(
        {
          customerCode: body.customerCode,
          customerName: body.customerName,
          warehouseCode: body.warehouseCode,
          warehouseName: body.warehouseName,
          deliveryNoteNo: body.deliveryNoteNo,
          incomingDate: toDate(body.incomingDate),
          poNo: body.poNo,
          poType: body.poType,
          poDate: toDate(body.poDate),
          supplierName: body.supplierName,
          referenceNo: body.referenceNo,
          materialCategory: body.materialCategory ?? 'Part',
          description: body.description,
          status: INCOMING_STATUS.DRAFT, // parity SP
          isHold: false,
          isActual: false,
          isActive: true,
          createdBy: userBy,
          createdDate: now,
        },
        t,
      );
      headerId = header.get('id') as string;

      for (const d of body.details) {
        const detail = await this.detailRepository.create(
          {
            planIncomingHeaderId: headerId,
            materialCode: d.materialCode,
            materialName: d.materialName,
            materialBrand: d.materialBrand,
            materialBarcode: d.barcode ?? null,
            materialLocationBarcode: d.locationBarcode ?? null,
            uom: d.uom,
            poQty: d.qty,
            partialQty: 0, // parity SP
            binningQty: 0, // parity SP
            createdBy: userBy,
            createdDate: now,
          },
          t,
        );
        await this.detailRepository.replaceDetailAddInfos(
          detail.get('id') as string,
          d.additionalInformation ?? [],
          userBy,
          t,
        );
      }

      await this.repository.replaceHeaderAddInfos(
        headerId,
        body.additionalInformation ?? [],
        userBy,
        t,
      );
    });

    return { data: { id: headerId }, httpCode: HTTP_STATUS.CREATED };
  }

  /** C2 POST /:id/details — tambah material ke DN existing (usp_InsertPlanIncomingDetail) */
  async addDetails(req: any) {
    const { id } = req.params;
    const { details } = req.body;
    const userBy = userOf(req);
    const now = nowWib();

    const header = await this.repository.getById(id);
    if (!header) {
      throw new NotFoundException('Plan incoming not found');
    }

    await sequelize.transaction(async (t) => {
      for (const d of details as DetailRowDto[]) {
        const existing = await this.detailRepository.getByHeaderAndMaterial(
          id,
          d.materialCode,
          t,
        );
        if (existing) {
          throw new BadRequestException(cst.messages.alreadyExists);
        }
        const detail = await this.detailRepository.create(
          {
            planIncomingHeaderId: id,
            materialCode: d.materialCode,
            materialName: d.materialName,
            materialBrand: d.materialBrand,
            materialBarcode: d.barcode ?? null,
            materialLocationBarcode: d.locationBarcode ?? null,
            uom: d.uom,
            poQty: d.qty,
            partialQty: 0,
            binningQty: 0,
            createdBy: userBy,
            createdDate: now,
          },
          t,
        );
        await this.detailRepository.replaceDetailAddInfos(
          detail.get('id') as string,
          d.additionalInformation ?? [],
          userBy,
          t,
        );
      }
    });

    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.CREATED };
  }

  /** C3 PUT /:id — edit header + add-info replace (usp_UpdatePlanIncomingHeader) */
  async updateIncomingHeader(req: any) {
    const { id } = req.params;
    const body = req.body as UpdateIncomingHeaderDto;
    const userBy = userOf(req);

    const header = await this.repository.getById(id);
    if (!header) {
      throw new NotFoundException('Plan incoming not found');
    }

    await sequelize.transaction(async (t) => {
      // guard DN dipakai header lain (parity: DeliveryNoteNo=@x AND Id<>@ID)
      if (body.deliveryNoteNo) {
        const clash = await this.repository.getByDeliveryNoteNo(
          body.deliveryNoteNo,
          t,
          true,
        );
        if (clash && clash.get('id') !== id) {
          throw new BadRequestException(cst.messages.alreadyExists);
        }
      }

      const updates: any = { modifiedBy: userBy, modifiedDate: nowWib() };
      if (body.customerCode != null) updates.customerCode = body.customerCode;
      if (body.customerName != null) updates.customerName = body.customerName;
      if (body.warehouseCode != null) updates.warehouseCode = body.warehouseCode;
      if (body.warehouseName != null) updates.warehouseName = body.warehouseName;
      if (body.poNo != null) updates.poNo = body.poNo;
      if (body.poType != null) updates.poType = body.poType;
      if (body.poDate != null) updates.poDate = toDate(body.poDate);
      if (body.supplierName != null) updates.supplierName = body.supplierName;
      if (body.deliveryNoteNo != null) updates.deliveryNoteNo = body.deliveryNoteNo;
      if (body.incomingDate != null) updates.incomingDate = toDate(body.incomingDate);
      if (body.referenceNo != null) updates.referenceNo = body.referenceNo;
      if (body.materialCategory != null) updates.materialCategory = body.materialCategory;
      if (body.description != null) updates.description = body.description;

      await this.repository.updateHeader(id, updates, t);
      await this.repository.replaceHeaderAddInfos(
        id,
        body.additionalInformation ?? [],
        userBy,
        t,
      );
    });

    return { data: { id }, httpCode: HTTP_STATUS.OK };
  }

  /** C4 PUT /details/:id — hanya poQty + add-info replace (usp_UpdatePlanIncomingDetail) */
  async updateIncomingDetail(req: any) {
    const { id } = req.params;
    const { qty, additionalInformation } = req.body;
    const userBy = userOf(req);

    const detail = await this.detailRepository.getById(id);
    if (!detail) {
      throw new NotFoundException('Detail not found');
    }

    await sequelize.transaction(async (t) => {
      await this.detailRepository.update(
        id,
        { poQty: qty, modifiedBy: userBy, modifiedDate: nowWib() },
        t,
      );
      await this.detailRepository.replaceDetailAddInfos(
        id,
        additionalInformation ?? [],
        userBy,
        t,
      );
    });

    return { data: { message: cst.messages.success }, httpCode: HTTP_STATUS.OK };
  }

  /** C5 POST /details/delete — bulk, guard belum binning (usp_DeletePlanIncomingDetail) */
  async deleteDetails(req: any) {
    const { ids } = req.body;
    await sequelize.transaction(async (t) => {
      await this.detailRepository.deleteWhereNotBinned(ids, t);
    });
    return { data: null, httpCode: HTTP_STATUS.OK };
  }

  /** C6 GET /:id/edit — data form edit + flag bisa-edit per detail */
  async getEdit(req: any) {
    const { id } = req.params;
    const header = await this.repository.findDetailById(id);
    if (!header) {
      throw new NotFoundException('Plan incoming not found');
    }
    const plain = header.get({ plain: true }) as any;
    return {
      data: {
        ...new ByIdTransform().transform(plain),
        details: (plain.details ?? []).map((d: any) => ({
          ...new ByIdTransform().transformDetail(d),
          canEdit: d.binningDate == null, // flag bisa-edit per detail
        })),
      },
      httpCode: HTTP_STATUS.OK,
    };
  }
}
