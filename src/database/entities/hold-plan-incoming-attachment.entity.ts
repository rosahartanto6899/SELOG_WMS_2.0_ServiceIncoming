import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { HoldPlanIncomingAttachmentAttributes } from '@/database/attributes';

type Creation = Optional<
  HoldPlanIncomingAttachmentAttributes,
  'id' | 'createdDate' | 'createdBy' | 'modifiedDate' | 'modifiedBy'
>;

const tableName = 'HoldPlanIncomingAttachment';

/** Attachment hold (Azure Blob URL) — tabel legacy, tanpa kolom Deleted* */
const HoldPlanIncomingAttachment: ModelDefined<
  HoldPlanIncomingAttachmentAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    incomingPlanDetailId: { type: DataTypes.UUID, allowNull: false },
    fileName: { type: DataTypes.STRING(100), allowNull: false },
    attachmentUrl: { type: DataTypes.STRING(150), allowNull: false },
    createdDate: { type: DataTypes.DATE, allowNull: false },
    createdBy: { type: DataTypes.STRING(75), allowNull: false },
    modifiedDate: { type: DataTypes.DATE, allowNull: true },
    modifiedBy: { type: DataTypes.STRING(75), allowNull: true },
  },
  {
    tableName,
    timestamps: false,
    indexes: [
      {
        name: 'idx_hold_plan_incoming_attachment_detail_id',
        fields: ['incomingPlanDetailId'],
      },
    ],
  },
);

export { HoldPlanIncomingAttachment };
