import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import {
  PlanIncomingHeaderAddInfoAttributes,
  PlanIncomingDetailAddInfoAttributes,
} from '@/database/attributes';

type HeaderCreation = Optional<
  PlanIncomingHeaderAddInfoAttributes,
  | 'id'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const PlanIncomingHeaderAddInfo: ModelDefined<
  PlanIncomingHeaderAddInfoAttributes,
  HeaderCreation
> = sequelize.define(
  'PlanIncomingHeaderAddInfo',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingHeaderId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(75), allowNull: true },
    value: { type: DataTypes.STRING(100), allowNull: true },
    createdDate: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.STRING(75), allowNull: true },
    modifiedDate: { type: DataTypes.DATE, allowNull: true },
    modifiedBy: { type: DataTypes.STRING(75), allowNull: true },
    deletedBy: { type: DataTypes.STRING(100), allowNull: true },
    deletedDate: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'PlanIncomingHeaderAddInfo',
    timestamps: false,
    indexes: [
      {
        name: 'idx_plan_incoming_header_add_info_header_id',
        fields: ['planIncomingHeaderId'],
      },
    ],
  },
);

type DetailCreation = Optional<
  PlanIncomingDetailAddInfoAttributes,
  | 'id'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const PlanIncomingDetailAddInfo: ModelDefined<
  PlanIncomingDetailAddInfoAttributes,
  DetailCreation
> = sequelize.define(
  'PlanIncomingDetailAddInfo',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingDetailId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(75), allowNull: true },
    value: { type: DataTypes.STRING(100), allowNull: true },
    createdDate: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.STRING(75), allowNull: true },
    modifiedDate: { type: DataTypes.DATE, allowNull: true },
    modifiedBy: { type: DataTypes.STRING(75), allowNull: true },
    deletedBy: { type: DataTypes.STRING(100), allowNull: true },
    deletedDate: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'PlanIncomingDetailAddInfo',
    timestamps: false,
    indexes: [
      {
        name: 'idx_plan_incoming_detail_add_info_detail_id',
        fields: ['planIncomingDetailId'],
      },
    ],
  },
);

export { PlanIncomingHeaderAddInfo, PlanIncomingDetailAddInfo };
