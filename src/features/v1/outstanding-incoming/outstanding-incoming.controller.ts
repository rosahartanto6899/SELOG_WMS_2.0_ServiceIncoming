import { Request } from 'express';
import { inject } from 'inversify';
import multer from 'multer';
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPost,
  httpPut,
  request,
} from 'inversify-express-utils';
import {
  BodyValidation,
  ControllerLogging,
  MICROSERVICE_IDENTIFIERS,
  ParamValidation,
  QueryValidation,
  ValidatePermissions,
} from '@/shared-libs';
import { QueryService } from './query.service';
import { CommandService } from './command.service';
import { outstandingIncomingConstant as cst } from './constants';
import {
  ListDto,
  ByMaterialDto,
  PlanQtyQueryDto,
  DetailParamDto,
  MaterialCodeParamDto,
  HoldDetailParamDto,
  HeaderParamDto,
  ToggleParamDto,
  TotalsDto,
  IndicatorDto,
  IdsActionDto,
  HoldInsertDto,
  DetailIdParamDto,
  PlanQtyDto,
  UpdateStatusDto,
  CreateActualDto,
  BinningDto,
  FilterResultDto,
  QualityInspectionDto,
  QiDetailUpdateDto,
  CreateIncomingDto,
  AddDetailDto,
  UpdateIncomingHeaderDto,
  UpdateIncomingDetailDto,
  DeleteDetailsDto,
} from './dtos';

const upload = multer({ storage: multer.memoryStorage() });

const READ = { menuCode: cst.menuCode, action: 'READ' };
const CREATE = { menuCode: cst.menuCode, action: 'CREATE' };
const UPDATE = { menuCode: cst.menuCode, action: 'UPDATE' };
const DELETE = { menuCode: cst.menuCode, action: 'DELETE' };

/**
 * @swagger
 * tags:
 *   - name: OutstandingIncoming
 *     description: Outstanding incoming — worklist penerimaan gudang (parity proses bisnis legacy WMS_Incoming)
 */
@controller('/v1/outstanding-incoming')
export class OutstandingIncomingController extends BaseHttpController {
  private static readonly oiLogging = ControllerLogging.forEntity(
    'outstanding-incoming',
    MICROSERVICE_IDENTIFIERS.SERVICE_ORDER,
  );

  constructor(
    @inject(QueryService) private readonly queryService: QueryService,
    @inject(CommandService) private readonly commandService: CommandService,
  ) {
    super();
  }

  // ================= Query Q1–Q9 =================

  /**
   * @swagger
   * /v1/outstanding-incoming:
   *   get:
   *     summary: Q1 — List outstanding incoming (paging, filter LIKE, search 7 kolom)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
   *       - { in: query, name: search, schema: { type: string } }
   *       - { in: query, name: customerCode, schema: { type: string } }
   *       - { in: query, name: warehouseCode, schema: { type: string } }
   *       - { in: query, name: materialCategory, schema: { type: string } }
   *       - { in: query, name: deliveryNoteNoFilter, schema: { type: string } }
   *       - { in: query, name: order, schema: { type: string } }
   *       - { in: query, name: sort, schema: { type: string, enum: [asc, desc] } }
   *     responses:
   *       200: { description: List outstanding }
   *       401: { description: Unauthorized }
   *       422: { description: Validation errors }
   */
  @ValidatePermissions(READ)
  @httpGet('/', QueryValidation(ListDto), OutstandingIncomingController.oiLogging.list)
  async getAll(@request() req: Request) {
    return await this.queryService.getAll(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/by-material:
   *   get:
   *     summary: Q3 — Header by material+cust+wh (belum binning)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: query, name: customerCode, required: true, schema: { type: string } }
   *       - { in: query, name: warehouseCode, required: true, schema: { type: string } }
   *       - { in: query, name: materialCode, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: Headers }
   */
  @ValidatePermissions(READ)
  @httpGet('/by-material', QueryValidation(ByMaterialDto))
  async getByMaterial(@request() req: Request) {
    return await this.queryService.getByMaterial(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/plan-qty:
   *   get:
   *     summary: Q4 — Sisa qty plan per material (Σ POQty−BinningQty)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: query, name: customerCode, required: true, schema: { type: string } }
   *       - { in: query, name: warehouseCode, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: Sisa qty per material }
   */
  @ValidatePermissions(READ)
  @httpGet('/plan-qty', QueryValidation(PlanQtyQueryDto))
  async getPlanQty(@request() req: Request) {
    return await this.queryService.getPlanQty(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/plan-qty/{materialCode}:
   *   get:
   *     summary: Q5 — Sisa qty satu material per DN
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: materialCode, required: true, schema: { type: string } }
   *       - { in: query, name: customerCode, required: true, schema: { type: string } }
   *       - { in: query, name: warehouseCode, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: Sisa qty per DN }
   */
  @ValidatePermissions(READ)
  @httpGet(
    '/plan-qty/:materialCode',
    ParamValidation(MaterialCodeParamDto),
    QueryValidation(PlanQtyQueryDto),
  )
  async getPlanQtyByMaterial(@request() req: Request) {
    return await this.queryService.getPlanQtyByMaterial(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/totals:
   *   post:
   *     summary: Q6 — Grand total outstanding (5 status aktif)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingTotalsDto' }
   *     responses:
   *       200: { description: Total }
   */
  @ValidatePermissions(READ)
  @httpPost('/totals', BodyValidation(TotalsDto))
  async getTotals(@request() req: Request) {
    return await this.queryService.getTotals(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/totals/by-warehouse:
   *   post:
   *     summary: Q7 — Total outstanding per warehouse
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingTotalsDto' }
   *     responses:
   *       200: { description: Total per warehouse }
   */
  @ValidatePermissions(READ)
  @httpPost('/totals/by-warehouse', BodyValidation(TotalsDto))
  async getTotalsByWarehouse(@request() req: Request) {
    return await this.queryService.getTotalsByWarehouse(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/indicator:
   *   post:
   *     summary: Q9 — Indicator qty vs binning per header
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingIndicatorDto' }
   *     responses:
   *       200: { description: Indicator }
   */
  @ValidatePermissions(READ)
  @httpPost('/indicator', BodyValidation(IndicatorDto))
  async checkIndicator(@request() req: Request) {
    return await this.queryService.checkIndicator(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/details:
   *   get:
   *     summary: Q2 — Detail header + details + addInfo
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Detail }
   *       404: { description: Not found }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id/details', ParamValidation(DetailParamDto))
  async getDetails(@request() req: Request) {
    return await this.queryService.getDetails(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/history:
   *   get:
   *     summary: Q8 — History status + leadtime (menit)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: History }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id/history', ParamValidation(DetailParamDto))
  async getHistory(@request() req: Request) {
    return await this.queryService.getHistory(req);
  }

  // ================= Aksi A =================

  /**
   * @swagger
   * /v1/outstanding-incoming/confirm-draft:
   *   post:
   *     summary: A1 — Bulk Draft → Confirmed (+history); tanpa Draft → 'Update skipped'
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingIdsActionDto' }
   *     responses:
   *       200: { description: Success / Update skipped }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/confirm-draft', BodyValidation(IdsActionDto))
  async confirmDraft(@request() req: Request) {
    return await this.commandService.confirmDraft(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/confirm-cancellation:
   *   post:
   *     summary: A12 — Bulk confirm Cancellation → Cancelled (+isActive=0, history,
   *       SQS WHSCLIN kembalikan SOH binned)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingIdsActionDto' }
   *     responses:
   *       200: { description: Success / Update skipped }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/confirm-cancellation', BodyValidation(IdsActionDto))
  async confirmCancellation(@request() req: Request) {
    return await this.commandService.confirmCancellation(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/holds:
   *   post:
   *     summary: A2 — Hold per header (isHold=1 + record hold)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingHoldInsertDto' }
   *     responses:
   *       200: { description: Success }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/holds', BodyValidation(HoldInsertDto))
  async insertHolds(@request() req: Request) {
    return await this.commandService.insertHolds(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/holds/attachments:
   *   post:
   *     summary: A2b — Upload attachment hold (multipart) → Azure Blob → temp table
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file, id]
   *             properties:
   *               file: { type: string, format: binary, description: "Image >1MB auto-resize; non-image >1MB ditolak" }
   *               id: { type: string, format: uuid, description: incomingPlanDetailId }
   *     responses:
   *       201: { description: Upload success }
   *       400: { description: File too big / no file }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/holds/attachments', upload.single('file'))
  async uploadHoldAttachment(@request() req: Request) {
    return await this.commandService.uploadHoldAttachment(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/holds:
   *   get:
   *     summary: A3 — Daftar hold (join jadwal binning, modifiedDate DESC)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: query, name: customerCode, schema: { type: string } }
   *       - { in: query, name: warehouseCode, schema: { type: string } }
   *       - { in: query, name: deliveryNoteNo, schema: { type: string } }
   *       - { in: query, name: poNo, schema: { type: string } }
   *       - { in: query, name: supplierName, schema: { type: string } }
   *     responses:
   *       200: { description: Hold list }
   */
  @ValidatePermissions(READ)
  @httpGet('/holds')
  async getHolds(@request() req: Request) {
    return await this.commandService.getHolds(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/holds/{headerId}:
   *   get:
   *     summary: A4 — Detail hold per DN
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: headerId, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Details }
   */
  @ValidatePermissions(READ)
  @httpGet('/holds/:headerId', ParamValidation(HoldDetailParamDto))
  async getHoldDetail(@request() req: Request) {
    return await this.commandService.getHoldDetail(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/holds/{id}/toggle:
   *   post:
   *     summary: A5 — Toggle isHold header (0↔1)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Success }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/holds/:id/toggle', ParamValidation(ToggleParamDto))
  async toggleHold(@request() req: Request) {
    return await this.commandService.toggleHold(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/{id}/plan-qty:
   *   put:
   *     summary: A6 — Adjust qty per detail (kondisional Draft/binned + StockAvailability)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingPlanQtyDto' }
   *     responses:
   *       200: { description: Success + stockAvailabilities }
   *       404: { description: Detail not found }
   */
  @ValidatePermissions(UPDATE)
  @httpPut(
    '/details/:id/plan-qty',
    ParamValidation(DetailIdParamDto),
    BodyValidation(PlanQtyDto),
  )
  async updatePlanQty(@request() req: Request) {
    return await this.commandService.updatePlanQty(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/status:
   *   put:
   *     summary: A7 — Update status (guard Cancelled/Goods Receipt → 'Update skipped')
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingStatusDto' }
   *     responses:
   *       200: { description: "customerCode / Update skipped" }
   */
  @ValidatePermissions(UPDATE)
  @httpPut('/:id/status', ParamValidation(HeaderParamDto), BodyValidation(UpdateStatusDto))
  async updateStatus(@request() req: Request) {
    return await this.commandService.updateStatus(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/delete:
   *   post:
   *     summary: A8 — Bulk soft-delete hanya Draft (non-Draft skip diam)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingIdsActionDto' }
   *     responses:
   *       200: { description: Done }
   */
  @ValidatePermissions(DELETE)
  @httpPost('/delete', BodyValidation(IdsActionDto))
  async deleteOutstanding(@request() req: Request) {
    return await this.commandService.deleteOutstanding(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/cancel:
   *   post:
   *     summary: A9 — Cancel (hard delete header + 3 relasi)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Done }
   */
  @ValidatePermissions(DELETE)
  @httpPost('/:id/cancel', ParamValidation(HeaderParamDto))
  async cancelPlanIncoming(@request() req: Request) {
    return await this.commandService.cancelPlanIncoming(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/for-actual:
   *   post:
   *     summary: A10 — Data GR dari ids terpilih (6 grup)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingIdsActionDto' }
   *     responses:
   *       200: { description: Data GR }
   */
  @ValidatePermissions(READ)
  @httpPost('/for-actual', BodyValidation(IdsActionDto))
  async getForActual(@request() req: Request) {
    return await this.commandService.getForActual(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/actual:
   *   post:
   *     summary: A11 — GR (attachment temp→permanen, Incoming Finished, isActual=1, record ActualIncoming)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingActualDto' }
   *     responses:
   *       200: { description: Success }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/actual', BodyValidation(CreateActualDto))
  async createActual(@request() req: Request) {
    return await this.commandService.createActual(req);
  }

  // ================= Binning & QI (B) =================

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/locations:
   *   get:
   *     summary: B1 — Lokasi binning dari ActualIncoming
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Locations }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id/locations', ParamValidation(HeaderParamDto))
  async getLocations(@request() req: Request) {
    return await this.commandService.getLocations(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/{id}/binning:
   *   post:
   *     summary: B2 — Binning (increment + reset partial + auto Goods Receipt + publish SQS)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingBinningDto' }
   *     responses:
   *       200: { description: Header info }
   *       404: { description: Detail not found }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/details/:id/binning', ParamValidation(DetailIdParamDto), BodyValidation(BinningDto))
  async binning(@request() req: Request) {
    return await this.commandService.binning(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/binning-slip:
   *   get:
   *     summary: B3 — Print binning slip (kolom PrintBinningListDto)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Slip rows }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id/binning-slip', ParamValidation(HeaderParamDto))
  async getBinningSlip(@request() req: Request) {
    return await this.commandService.getBinningSlip(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/barcodes/sync:
   *   put:
   *     summary: B4 — Sync barcode dari master temp (protected api_key, updatedBy=System)
   *     tags: [OutstandingIncoming]
   *     security: [{ api_key: [] }]
   *     responses:
   *       200: { description: Success }
   *       401: { description: Unauthorized }
   */
  @httpPut('/barcodes/sync')
  async syncBarcodes() {
    return await this.commandService.syncBarcodes();
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/filter-result:
   *   post:
   *     summary: B5 — Lookup DN untuk QI (searchParam 'column|value')
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingFilterResultDto' }
   *     responses:
   *       200: { description: DN list }
   *       400: { description: Invalid searchParam }
   */
  @ValidatePermissions(READ)
  @httpPost('/filter-result', BodyValidation(FilterResultDto))
  async filterResult(@request() req: Request) {
    return await this.commandService.filterResult(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/quality-inspection:
   *   post:
   *     summary: B6 — Simpan QI (partialQty + description per materialCode)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingQiDto' }
   *     responses:
   *       200: { description: Success }
   */
  @ValidatePermissions(UPDATE)
  @httpPost('/quality-inspection', BodyValidation(QualityInspectionDto))
  async saveQualityInspection(@request() req: Request) {
    return await this.commandService.saveQualityInspection(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/{id}/attachments:
   *   get:
   *     summary: B6-list — Temp attachments per detail (QI working screen)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: '[{fileName, attachmentUrl, createdDate}]' }
   */
  @ValidatePermissions(READ)
  @httpGet('/details/:id/attachments', ParamValidation(DetailIdParamDto))
  async listDetailAttachments(@request() req: Request) {
    return await this.commandService.listDetailAttachments(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/{id}/qi:
   *   put:
   *     summary: B6-detail — Single QI row correction (parity usp_UpdateQualityInspection)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Success }
   */
  @ValidatePermissions(UPDATE)
  @httpPut('/details/:id/qi', ParamValidation(DetailIdParamDto), BodyValidation(QiDetailUpdateDto))
  async updateQiDetail(@request() req: Request) {
    return await this.commandService.updateQiDetail(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/gr-result-report:
   *   get:
   *     summary: B7 — Laporan hasil GR/binning (kolom ReportBinningDto)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     responses:
   *       200: { description: Report rows }
   */
  @ValidatePermissions(READ)
  @httpGet('/gr-result-report')
  async getGrResultReport() {
    return await this.commandService.getGrResultReport();
  }

  // ================= Input manual (C) =================

  /**
   * @swagger
   * /v1/outstanding-incoming:
   *   post:
   *     summary: C1 — Input DN manual (header + semua detail + add-info, SATU submit atomic)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingCreateDto' }
   *     responses:
   *       201: { description: Created (id) }
   *       400: { description: alreadyexists / duplicate materialCode }
   *       422: { description: Validation errors }
   */
  @ValidatePermissions(CREATE)
  @httpPost('/', BodyValidation(CreateIncomingDto))
  async createIncoming(@request() req: Request) {
    return await this.commandService.createIncoming(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/details:
   *   post:
   *     summary: C2 — Tambah material ke DN existing
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingAddDetailDto' }
   *     responses:
   *       201: { description: Created }
   *       400: { description: alreadyexists }
   */
  @ValidatePermissions(CREATE)
  @httpPost('/:id/details', ParamValidation(HeaderParamDto), BodyValidation(AddDetailDto))
  async addDetails(@request() req: Request) {
    return await this.commandService.addDetails(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}:
   *   put:
   *     summary: C3 — Edit header (guard DN header lain, add-info replace)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingUpdateHeaderDto' }
   *     responses:
   *       200: { description: Updated }
   *       400: { description: alreadyexists }
   *       404: { description: Not found }
   */
  @ValidatePermissions(UPDATE)
  @httpPut('/:id', ParamValidation(HeaderParamDto), BodyValidation(UpdateIncomingHeaderDto))
  async updateIncomingHeader(@request() req: Request) {
    return await this.commandService.updateIncomingHeader(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/{id}:
   *   put:
   *     summary: C4 — Edit detail (hanya poQty + add-info replace)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OutstandingIncomingUpdateDetailDto' }
   *     responses:
   *       200: { description: Updated }
   *       404: { description: Not found }
   */
  @ValidatePermissions(UPDATE)
  @httpPut('/details/:id', ParamValidation(DetailIdParamDto), BodyValidation(UpdateIncomingDetailDto))
  async updateIncomingDetail(@request() req: Request) {
    return await this.commandService.updateIncomingDetail(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/details/delete:
   *   post:
   *     summary: C5 — Bulk hapus detail (guard belum binning, skip diam)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               required: [ids]
   *               properties:
   *                 ids: { type: array, items: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Done }
   */
  @ValidatePermissions(DELETE)
  @httpPost('/details/delete', BodyValidation(DeleteDetailsDto))
  async deleteDetails(@request() req: Request) {
    return await this.commandService.deleteDetails(req);
  }

  /**
   * @swagger
   * /v1/outstanding-incoming/{id}/edit:
   *   get:
   *     summary: C6 — Data form edit (header + details + add-info + flag bisa-edit)
   *     tags: [OutstandingIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Edit data }
   *       404: { description: Not found }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id/edit', ParamValidation(HeaderParamDto))
  async getEdit(@request() req: Request) {
    return await this.commandService.getEdit(req);
  }
}
