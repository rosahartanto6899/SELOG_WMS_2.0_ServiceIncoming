import { Request } from 'express';
import { inject } from 'inversify';
import {
  BaseHttpController,
  controller,
  httpDelete,
  httpGet,
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
import { ActualListDto, ActualDeleteOneDto } from './dtos';

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
   *   delete:
   *     summary: A-Delete — hapus actual per id (rollback header ke Binning)
   *     tags: [ActualIncoming]
   *     security: [{ bearerAuth: [] }, { api_key: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ActualIncomingDeleteOneDto' }
   *     responses:
   *       200: { description: Done }
   *       401: { description: Unauthorized }
   *       422: { description: Validation errors }
   */
  @ValidatePermissions(DELETE)
  @httpDelete('/:id', BodyValidation(ActualDeleteOneDto))
  async deleteActual(@request() req: Request) {
    return await this.commandService.deleteActual(req);
  }
}
