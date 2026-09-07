import { inject, injectable } from 'inversify';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { Pagination } from '@/shared-libs/helpers/pagination.helper';
import { NotFoundException } from '@/shared-libs/exceptions';
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

  /** A-List GET / — parity usp_GetAllActualIncoming (GR/Transit Out ≤2 bulan,
   *  warehouseCode exact). customerCode = customer aktif dari token (tenant).
   *  Tanpa search/sort/paging di query → in-memory. */
  async getActualAll(req: any) {
    const param = req.query;
    const page = param.page ?? 1;
    const limit = param.limit ?? 10;
    const { limit: size, offset } = Pagination.getPagination(page, limit);

    const rows = await this.actualRepository.findActualAll(
      req.user?.tokenCustomerCode ?? null,
      param.warehouseCode ?? null,
    );

    // search in-memory (query tidak punya parameter search)
    let filtered: any[] = rows;
    if (param.search) {
      const needle = String(param.search).toLowerCase();
      const cols = (
        param.searchBy ? [param.searchBy] : [...ACTUAL_LIST_SEARCH_COLUMNS]
      ) as string[];
      filtered = rows.filter((r) =>
        cols.some((c) => String(r[c] ?? '').toLowerCase().includes(needle)),
      );
    }

    // sort in-memory; grDate/grBy tidak dihasilkan query → fallback createdDate
    const col = ACTUAL_LIST_ORDER_WHITELIST[param.order ?? 'grDate'] ?? 'createdDate';
    const key = ['grDate', 'grBy'].includes(col) ? 'createdDate' : col;
    const dir = param.sort === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      if (x == null) return 1;
      if (y == null) return -1;
      const cmp =
        x instanceof Date || y instanceof Date
          ? new Date(x).getTime() - new Date(y).getTime()
          : String(x).localeCompare(String(y), undefined, { numeric: true });
      return cmp * dir;
    });

    const recordsTotal = rows.length;
    const recordsFiltered = filtered.length;
    const pageRows = filtered.slice(offset, offset + size);

    // addinfo digabung terpisah (hindari duplikasi join 1:N + limit)
    const addInfos = await this.actualRepository.findAddInfoByHeaderIds(
      pageRows.map((r) => r.id),
    );
    const addInfoById = new Map<string, string>();
    for (const a of addInfos) {
      const prev = addInfoById.get(a.planIncomingHeaderId);
      addInfoById.set(
        a.planIncomingHeaderId,
        prev ? `${prev}; ${a.name}: ${a.value}` : `${a.name}: ${a.value}`,
      );
    }
    const data = pageRows.map((r) => ({
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
