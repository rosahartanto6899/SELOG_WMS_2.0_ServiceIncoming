import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PlanIncomingDetailAttributes } from '@/database/attributes';

type Creation = Optional<
  PlanIncomingDetailAttributes,
  | 'id'
  | 'partialQty'
  | 'binningQty'
  | 'binningDate'
  | 'binningBy'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const tableName = 'PlanIncomingDetail';

const PlanIncomingDetail: ModelDefined<
  PlanIncomingDetailAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingHeaderId: { type: DataTypes.UUID, allowNull: false },
    materialCode: { type: DataTypes.STRING(100), allowNull: false },
    materialName: { type: DataTypes.STRING(200), allowNull: false },
    materialBrand: { type: DataTypes.STRING(100), allowNull: false },
    materialBarcode: { type: DataTypes.STRING(12), allowNull: true },
    materialLocationBarcode: { type: DataTypes.STRING(12), allowNull: true },
    uom: { type: DataTypes.STRING(20), allowNull: false },
    poQty: { type: DataTypes.INTEGER, allowNull: false },
    partialQty: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    binningQty: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    binningDate: { type: DataTypes.DATE, allowNull: true },
    binningBy: { type: DataTypes.STRING(75), allowNull: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
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
        name: 'idx_plan_incoming_detail_header_id',
        fields: ['planIncomingHeaderId'],
      },
      {
        name: 'idx_plan_incoming_detail_material_code',
        fields: ['materialCode'],
      },
    ],
  },
);

export { PlanIncomingDetail };
