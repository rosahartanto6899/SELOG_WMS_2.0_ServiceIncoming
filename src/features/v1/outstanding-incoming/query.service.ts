import { inject, injectable } from 'inversify';
import { Op, Order, WhereOptions } from 'sequelize';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { Pagination } from '@/shared-libs/helpers/pagination.helper';
import { NotFoundException } from '@/shared-libs/exceptions';
import { OutstandingIncomingRepository } from './repositories';
import { GetAllTransform, ByIdTransform } from './transforms';
import {
  LIST_ORDER_WHITELIST,
  LIST_SEARCH_COLUMNS,
  OUTSTANDING_EXCLUDE_STATUS,
} from './constants';

/** Q1–Q9 — query read-only parity SP */
@injectable()
export class QueryService {
  constructor(
    @inject(OutstandingIncomingRepository)
    private readonly repository: OutstandingIncomingRepository,
  ) {}

  /** Q1 GET / — list outstanding (usp_GetAllDataOutstandingIncoming) */
  async getAll(req: any) {
    const param = req.query;
    const page = param.page ?? 1;
    const limit = param.limit ?? 10;
    const { limit: size, offset } = Pagination.getPagination(page, limit);

    const baseWhere: WhereOptions = {
      isActive: true,
      status: { [Op.notIn]: [...OUTSTANDING_EXCLUDE_STATUS] },
    };
    const detailWhere: WhereOptions | null = param.materialCategory
      ? { materialCode: param.materialCategory } // parity SP: @MaterialCode exact di detail
      : null;

    if (param.customerCode) {
      baseWhere.customerCode = { [Op.like]: `%${param.customerCode}%` };
    }
    if (param.warehouseCode) {
      baseWhere.warehouseCode = { [Op.like]: `%${param.warehouseCode}%` };
    }

    // recordsTotal: tanpa search & DN-filter (parity SP)
    const recordsTotal = await this.repository.countAll(
      baseWhere,
      detailWhere,
    );

    // recordsFiltered: semua filter
    const filteredWhere: WhereOptions = { ...baseWhere };
    if (param.deliveryNoteNoFilter) {
      filteredWhere.deliveryNoteNo = {
        [Op.like]: `%${param.deliveryNoteNoFilter}%`,
      };
    }
    if (param.search) {
      const like = `%${param.search}%`;
      if (param.searchBy) {
        // pola LOGIS: LIKE satu kolom (whitelist DTO = 7 kolom parity SP)
        filteredWhere[param.searchBy] = { [Op.like]: like };
      } else {
        // parity SP: LIKE gabung 7 kolom
        filteredWhere[Op.or as unknown as string] = LIST_SEARCH_COLUMNS.map(
          (column) => ({ [column]: { [Op.like]: like } }),
        );
      }
    }
    const recordsFiltered = await this.repository.countAll(
      filteredWhere,
      detailWhere,
    );

    const orderColumn =
      LIST_ORDER_WHITELIST[param.order ?? 'createdAt'] ?? 'createdDate';
    const sort = param.sort === 'asc' ? 'ASC' : 'DESC';
    const order: Order = [[orderColumn, sort]];

    const rows = await this.repository.findAll(
      filteredWhere,
      detailWhere,
      order,
      size,
      offset,
    );

    // Indikator balance per row (parity warna legacy CheckIndicator):
    // green = SUM(poQty)==SUM(binningQty), blue = unbalanced + partialQty>0, red = unbalanced tanpa partial
    const sums = await this.repository.findSumsByHeaderIds(
      rows.map((r) => r.id),
    );
    const sumById = new Map(
      sums.map((s: any) => [s.planIncomingHeaderId, s]),
    );
    const rowsWithSums = rows.map((r: any) => {
      const s = sumById.get(r.id);
      return {
        ...r,
        poQtyTotal: Number(s?.poQty ?? 0),
        binningQtyTotal: Number(s?.binningQty ?? 0),
        partialQtyTotal: Number(s?.partialQty ?? 0),
      };
    });

    return {
      page: {
        page: Number(page),
        limit: size,
        totalData: recordsFiltered,
        totalPage: Math.ceil(recordsFiltered / size),
        recordsTotal, // parity SP output param @TotalRecords
      },
      data: new GetAllTransform().array(rowsWithSums),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q2 GET /:id/details — header + details + addInfo */
  async getDetails(req: any) {
    const { id } = req.params;
    const header = await this.repository.findDetailById(id);
    if (!header) {
      throw new NotFoundException('Plan incoming not found');
    }
    return {
      data: new ByIdTransform().transform(header.get({ plain: true })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q3 GET /by-material — header by material+cust+wh (usp_GetAllDataIncomingHeaderDetail) */
  async getByMaterial(req: any) {
    const { customerCode, warehouseCode, materialCode } = req.query;
    const rows = await this.repository.findByMaterial(
      customerCode,
      warehouseCode,
      materialCode,
    );
    return {
      data: rows.map((row) => {
        const h = row.get({ plain: true });
        return {
          id: h.id,
          customerName: h.customerName,
          warehouseCode: h.warehouseCode,
          warehouseName: h.warehouseName,
          poNo: h.poNo,
          poType: h.poType,
          materialCategory: h.materialCategory,
          supplierName: h.supplierName,
          deliveryNoteNo: h.deliveryNoteNo || '-',
          incomingDate: h.incomingDate,
          referenceNo: h.referenceNo || '-',
          description: h.description || '-',
          status: h.status,
          isActive: h.isActive,
          isDifferentQty: 0, // parity SP: 0 AS IsDifferentQty
          createdAt: h.createdDate,
          createdBy: h.createdBy,
          isHold: h.isHold ? 1 : 0,
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q4 GET /plan-qty — sisa qty per material (usp_GetPlanIncomingQty) */
  async getPlanQty(req: any) {
    const { customerCode, warehouseCode } = req.query;
    const rows = await this.repository.sumPlanQty(
      customerCode,
      warehouseCode,
    );
    return {
      data: rows.map((row: any) => ({
        customerCode: row['header.customerCode'] ?? row.customerCode,
        customerName: row['header.customerName'] ?? row.customerName,
        warehouseCode: row['header.warehouseCode'] ?? row.warehouseCode,
        warehouseName: row['header.warehouseName'] ?? row.warehouseName,
        materialCode: row.materialCode,
        materialName: row.materialName,
        materialBrand: row.materialBrand,
        uom: row.uom,
        qty: Number(row.qty ?? 0),
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q5 GET /plan-qty/:materialCode (usp_GetPlanIncomingQtyByMaterialCode) */
  async getPlanQtyByMaterial(req: any) {
    const { materialCode } = req.params;
    const { customerCode, warehouseCode } = req.query;
    const rows = await this.repository.planQtyByMaterial(
      customerCode,
      warehouseCode,
      materialCode,
    );
    return {
      data: rows.map((row: any) => ({
        customerCode: row['header.customerCode'] ?? row.customerCode,
        customerName: row['header.customerName'] ?? row.customerName,
        warehouseCode: row['header.warehouseCode'] ?? row.warehouseCode,
        warehouseName: row['header.warehouseName'] ?? row.warehouseName,
        materialCode: row.materialCode,
        deliveryNoteNo: row['header.deliveryNoteNo'] ?? row.deliveryNoteNo,
        qty: Number(row.qty ?? 0),
        createdAt: row.createdDate,
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q6 POST /totals — grand total outstanding (usp_GetAllOutstandingByWarehouseCode) */
  async getTotals(req: any) {
    const { warehouseCodes } = req.body;
    const totalDataOutstanding = await this.repository.countTotals(
      warehouseCodes,
    );
    return { data: { totalDataOutstanding }, httpCode: HTTP_STATUS.OK };
  }

  /** Q7 POST /totals/by-warehouse (usp_GetTotalDetailOutstandingByWarehouseCode) */
  async getTotalsByWarehouse(req: any) {
    const { warehouseCodes } = req.body;
    const rows = await this.repository.countTotalsByWarehouse(warehouseCodes);
    return {
      data: rows.map((row: any) => ({
        totalDataOutstanding: Number(row.totalDataOutstanding ?? 0),
        warehouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q10 POST /totals/by-status — Carry Over / Today / Planned / Hold (kartu summary halaman) */
  async getSummaryBuckets(req: any) {
    const { warehouseCodes } = req.body;
    const data = await this.repository.countSummaryBuckets(warehouseCodes);
    return { data, httpCode: HTTP_STATUS.OK };
  }

  /** Q8 GET /:id/history (usp_usp_GetPlanIncomingHistory) */
  async getHistory(req: any) {
    const { id } = req.params;
    const rows = await this.repository.findHistory(id);
    // Leadtime dihitung ulang saat read: diff dua Date yang di-parse dgn TZ server
    // yg sama selalu akurat (relatif) — menyembuhkan baris lama yg minus akibat
    // perbedaan frame wall-clock WIB saat tulis vs parse balik.
    let prev: Date | null = null;
    return {
      data: rows.map((row) => {
        const h = row.get({ plain: true });
        const leadtime = prev
          ? Math.floor(
              ((h.date?.getTime() ?? 0) - prev.getTime()) / 60000,
            ) + 1
          : (h.leadtime ?? 0);
        prev = h.date ?? prev;
        return {
          id: h.id,
          planIncomingHeaderId: h.planIncomingHeaderId,
          status: h.status,
          date: h.date,
          pic: h.pic,
          leadtime,
          createdAt: h.createdDate,
          createdBy: h.createdBy,
        };
      }),
      httpCode: HTTP_STATUS.OK,
    };
  }

  /** Q9 POST /indicator (usp_CheckIndicatorIncoming) */
  async checkIndicator(req: any) {
    const { customerCode, warehouseCode } = req.body;
    const rows = await this.repository.findIndicator(
      customerCode,
      warehouseCode,
    );
    return {
      data: rows.map((row: any) => ({
        id: row.planIncomingHeaderId,
        poQty: Number(row.poQty ?? 0),
        binningQty: Number(row.binningQty ?? 0),
        partialQty: Number(row.partialQty ?? 0),
      })),
      httpCode: HTTP_STATUS.OK,
    };
  }
}
