import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PlanIncomingHistoryAttributes } from '@/database/attributes';

type Creation = Optional<
  PlanIncomingHistoryAttributes,
  'id' | 'createdDate' | 'createdBy'
>;

const tableName = 'PlanIncomingHistory';

/** Histori status + leadtime (menit) — append-only, tabel legacy */
const PlanIncomingHistory: ModelDefined<
  PlanIncomingHistoryAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingHeaderId: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: true },
    date: { type: DataTypes.DATE, allowNull: true },
    leadtime: { type: DataTypes.INTEGER, allowNull: true },
    pic: { type: DataTypes.STRING(75), allowNull: true },
    createdDate: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.STRING(75), allowNull: true },
  },
  {
    tableName,
    timestamps: false,
    indexes: [
      {
        name: 'idx_plan_incoming_history_header_id',
        fields: ['planIncomingHeaderId'],
      },
    ],
  },
);

export { PlanIncomingHistory };
