import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPut,
  request,
} from 'inversify-express-utils';
import { BodyValidation } from '@/shared-libs/base';
import {
  ControllerLogging,
  MICROSERVICE_IDENTIFIERS,
  ValidatePermissions,
} from '@/shared-libs';
import { UpsertDto } from './dtos';
import { UploadIncomingAhmCommandService } from './upload-incoming-ahm.command.service';
import { ExcelTemplateService } from './excel-template.service';

/**
 * @swagger
 * tags:
 *   - name: Upload Incoming AHM
 *     description: Bulk upload plan incoming AHM via Excel template
 */
@controller('/v1/upload-incoming-ahm')
export class UploadIncomingAhmController extends BaseHttpController {
  private static readonly ahmLogging = ControllerLogging.forEntity(
    'upload-incoming-ahm',
    MICROSERVICE_IDENTIFIERS.SERVICE_ORDER,
  );

  constructor(
    @inject(UploadIncomingAhmCommandService)
    private readonly commandService: UploadIncomingAhmCommandService,
    @inject(ExcelTemplateService)
    private readonly excelTemplateService: ExcelTemplateService,
  ) {
    super();
  }

  /**
   * @swagger
   * /v1/upload-incoming-ahm/template:
   *   get:
   *     summary: Download Upload Incoming AHM template (Excel)
   *     tags: [Upload Incoming AHM]
   *     security:
   *       - bearerAuth: []
   *       - api_key: []
   *     responses:
   *       200:
   *         description: Excel template with Ref_bodyKey integrity sheet
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *       401:
   *         description: Unauthorized
   */
  @ValidatePermissions({
    allowedMenuPermissions: [{ menuCode: 'PLAN-INCOMING-AHM', action: 'READ' }],
  })
  @httpGet(
    '/template',
    UploadIncomingAhmController.ahmLogging.custom('download-template'),
  )
  async getTemplate(req: Request, res: Response) {
    return await this.excelTemplateService.generateTemplate(req, res);
  }

  /**
   * @swagger
   * /v1/upload-incoming-ahm/bulk:
   *   put:
   *     summary: Upsert one AHM row (header find-or-create by DN, detail by DN+material)
   *     tags: [Upload Incoming AHM]
   *     security:
   *       - bearerAuth: []
   *       - api_key: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpsertUploadIncomingAhmDto'
   *     responses:
   *       200:
   *         description: Row updated
   *       201:
   *         description: Row created
   *       422:
   *         description: Validation errors [{field, message[]}]
   */
  @ValidatePermissions({
    allowedMenuPermissions: [
      { menuCode: 'PLAN-INCOMING-AHM', action: 'CREATE' },
      { menuCode: 'PLAN-INCOMING-AHM', action: 'UPDATE' },
    ],
  })
  @httpPut(
    '/bulk',
    BodyValidation(UpsertDto),
    UploadIncomingAhmController.ahmLogging.bulk,
  )
  async upsertBulk(@request() req: Request) {
    return await this.commandService.upsertBulk(req);
  }
}
