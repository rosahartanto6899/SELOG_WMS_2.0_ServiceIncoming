import { inject, injectable } from 'inversify';
import { Op, Order, WhereOptions } from 'sequelize';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { Pagination } from '@/shared-libs/helpers/pagination.helper';
import { NotFoundException } from '@/shared-libs/exceptions';
import { sequelize } from '@/utils/database.util';
import { INCOMING_STATUS } from '../outstanding-incoming/constants';
import { ActualIncomingRepository } from './repositories';
import {
  ACTUAL_LIST_ORDER_WHITELIST,
  ACTUAL_LIST_SEARCH_COLUMNS,
} from './constants';

/** Q-List/Q-Detail — baca Actual Incoming (halaman Actual Incoming) */
@injectable()
export class QueryService {
  constructor(
    @inject(ActualIncomingRepository)
    private readonly actualRepository: ActualIncomingRepository,
  ) {}

  /** A-List GET / — header isActual + GR data */
  async getActualAll(req: any) {
    const param = req.query;
    const page = param.page ?? 1;
    const limit = param.limit ?? 10;
    const { limit: size, offset } = Pagination.getPagination(page, limit);

    const baseWhere: WhereOptions = {
      isActive: true,
      isActual: true,
      status: { [Op.ne]: INCOMING_STATUS.TRANSIT_OUT },
    };
    if (param.customerCode) {
      baseWhere.customerCode = { [Op.like]: `%${param.customerCode}%` };
    }
    if (param.warehouseCode) {
      baseWhere.warehouseCode = { [Op.like]: `%${param.warehouseCode}%` };
    }
    if (param.search) {
      const like = `%${param.search}%`;
      if (param.searchBy) {
        baseWhere[param.searchBy] = { [Op.like]: like };
      } else {
        baseWhere[Op.or as unknown as string] = ACTUAL_LIST_SEARCH_COLUMNS.map(
          (column) => ({ [column]: { [Op.like]: like } }),
        );
      }
    }

    const recordsTotal = await this.actualRepository.countActualAll({
      isActive: true,
      isActual: true,
      status: { [Op.ne]: INCOMING_STATUS.TRANSIT_OUT },
    });
    const recordsFiltered = await this.actualRepository.countActualAll(
      baseWhere,
    );

    const orderColumn =
      ACTUAL_LIST_ORDER_WHITELIST[param.order ?? 'grDate'] ?? 'grDate';
    const sort = param.sort === 'asc' ? 'ASC' : 'DESC';
    // grDate/grBy hidup di tabel ActualIncoming (join) — prefix agar tidak ambiguous
    const prefixed = ['grDate', 'grBy'].includes(orderColumn)
      ? `actuals.${orderColumn}`
      : orderColumn;
    const order: Order = [[sequelize.literal(prefixed), sort]];

    const rows = await this.actualRepository.findActualAll(
      baseWhere,
      order,
      size,
      offset,
    );

    // addinfo digabung terpisah (hindari duplikasi join 1:N + limit)
    const addInfos = await this.actualRepository.findAddInfoByHeaderIds(
      rows.map((r) => r.id),
    );
    const addInfoById = new Map<string, string>();
    for (const a of addInfos) {
      const prev = addInfoById.get(a.planIncomingHeaderId);
      addInfoById.set(
        a.planIncomingHeaderId,
        prev ? `${prev}; ${a.name}: ${a.value}` : `${a.name}: ${a.value}`,
      );
    }
    const data = rows.map((r) => ({
      ...r,
      additionalInfo: addInfoById.get(r.id) ?? null,
    }));

    return {
      page: {
        page: Number(page),
        limit: size,
        totalData: recordsFiltered,
        totalPage: Math.ceil(recordsFiltered / size),
        recordsTotal,
      },
      data,
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** A-Detail GET /:id — record GR aktif (PIC receiver/binner, grBy/grDate, lokasi) */
  async getActualById(req: any) {
    const { id } = req.params;
    const rows = await this.actualRepository.findActiveByHeaderIds([id]);
    const actual = rows[0];
    if (!actual) {
      throw new NotFoundException('Actual incoming not found');
    }
    const plain = actual.get({ plain: true });
    return {
      data: {
        planIncomingHeaderId: plain.planIncomingHeaderId,
        picReceiver: plain.picReceiver,
        picBinner: plain.picBinner,
        grBy: plain.grBy,
        grDate: plain.grDate,
        binningLocation: plain.binningLocation,
      },
      httpCode: HTTP_STATUS.OK,
    };
  }
}
