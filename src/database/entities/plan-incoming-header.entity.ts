import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PlanIncomingHeaderAttributes } from '@/database/attributes';

type Creation = Optional<
  PlanIncomingHeaderAttributes,
  | 'id'
  | 'materialCategory'
  | 'status'
  | 'isHold'
  | 'isActual'
  | 'isActive'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const tableName = 'PlanIncomingHeader';

const PlanIncomingHeader: ModelDefined<
  PlanIncomingHeaderAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerCode: { type: DataTypes.STRING(50), allowNull: true },
    customerName: { type: DataTypes.STRING(75), allowNull: false },
    warehouseCode: { type: DataTypes.STRING(50), allowNull: true },
    warehouseName: { type: DataTypes.STRING(75), allowNull: false },
    deliveryNoteNo: { type: DataTypes.STRING(100), allowNull: false },
    incomingDate: { type: DataTypes.DATE, allowNull: true },
    poNo: { type: DataTypes.STRING(75), allowNull: false },
    poType: { type: DataTypes.STRING(50), allowNull: true },
    poDate: { type: DataTypes.DATE, allowNull: true },
    supplierName: { type: DataTypes.STRING(75), allowNull: true },
    referenceNo: { type: DataTypes.STRING(75), allowNull: true },
    materialCategory: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Part',
    },
    description: { type: DataTypes.STRING(500), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'Draft',
    },
    isHold: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    isActual: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdDate: { type: DataTypes.DATE, allowNull: false },
    createdBy: { type: DataTypes.STRING(75), allowNull: false },
    modifiedDate: { type: DataTypes.DATE, allowNull: true },
    modifiedBy: { type: DataTypes.STRING(75), allowNull: true },
    deletedBy: { type: DataTypes.STRING(100), allowNull: true },
    deletedDate: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName,
    timestamps: false,
    indexes: [
      {
        name: 'idx_plan_incoming_header_delivery_note_no',
        fields: ['deliveryNoteNo'],
      },
      {
        name: 'idx_plan_incoming_header_warehouse_code',
        fields: ['warehouseCode'],
      },
      {
        name: 'idx_plan_incoming_header_status',
        fields: ['status'],
      },
    ],
  },
);

export { PlanIncomingHeader };
