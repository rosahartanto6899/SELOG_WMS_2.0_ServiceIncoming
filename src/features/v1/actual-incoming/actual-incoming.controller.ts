import { Request } from 'express';
import { inject } from 'inversify';
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPost,
  request,
} from 'inversify-express-utils';
import {
  BodyValidation,
  ControllerLogging,
  MICROSERVICE_IDENTIFIERS,
  QueryValidation,
  ValidatePermissions,
} from '@/shared-libs';
import { QueryService } from './query.service';
import { CommandService } from './command.service';
import { actualIncomingConstant as cst } from './constants';
import { ActualListDto, ActualDeleteDto } from './dtos';

const READ = { menuCode: cst.menuCode, action: 'READ' };
const DELETE = { menuCode: cst.menuCode, action: 'DELETE' };

/**
 * @swagger
 * tags:
 *   - name: ActualIncoming
 *     description: Actual incoming — daftar hasil goods receipt (parity proses bisnis legacy WMS_Incoming)
 */
@controller('/v1/actual-incoming')
export class ActualIncomingController extends BaseHttpController {
  private static readonly aiLogging = ControllerLogging.forEntity(
    'actual-incoming',
    MICROSERVICE_IDENTIFIERS.SERVICE_ORDER,
  );
  constructor(
    @inject(QueryService) private readonly queryService: QueryService,
    @inject(CommandService) private readonly commandService: CommandService,
  ) {
    super();
  }

  /**
   * @swagger
   * /v1/actual-incoming:
   *   get:
   *     summary: A-List — daftar Actual Incoming (GR/Transit Out ≤2 bulan; customerCode dari customer aktif token)
   *     tags: [ActualIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
   *       - { in: query, name: search, schema: { type: string } }
   *       - { in: query, name: searchBy, schema: { type: string } }
   *       - { in: query, name: warehouseCode, schema: { type: string } }
   *       - { in: query, name: order, schema: { type: string } }
   *       - { in: query, name: sort, schema: { type: string, enum: [asc, desc] } }
   *     responses:
   *       200: { description: List actual incoming }
   *       401: { description: Unauthorized }
   *       422: { description: Validation errors }
   */
  @ValidatePermissions(READ)
  @httpGet(
    '/',
    QueryValidation(ActualListDto),
    ActualIncomingController.aiLogging.list,
  )
  async getActualAll(@request() req: Request) {
    return await this.queryService.getActualAll(req);
  }

  /**
   * @swagger
   * /v1/actual-incoming/{id}:
   *   get:
   *     summary: A-Detail — record GR aktif per header (PIC, grBy/grDate, lokasi binning)
   *     tags: [ActualIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Actual record }
   *       404: { description: Not found }
   */
  @ValidatePermissions(READ)
  @httpGet('/:id')
  async getActualById(@request() req: Request) {
    return await this.queryService.getActualById(req);
  }

  /**
   * @swagger
   * /v1/actual-incoming/delete:
   *   post:
   *     summary: A-Delete — hapus record actual bulk + alasan (rollback header ke Binning)
   *     tags: [ActualIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ActualIncomingDeleteDto' }
   *     responses:
   *       200: { description: Done }
   */
  @ValidatePermissions(DELETE)
  @httpPost('/delete', BodyValidation(ActualDeleteDto))
  async deleteActual(@request() req: Request) {
    return await this.commandService.deleteActual(req);
  }
}
