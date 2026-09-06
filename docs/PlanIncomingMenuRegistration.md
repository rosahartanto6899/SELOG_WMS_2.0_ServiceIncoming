# Registrasi Menu — Plan Incoming (Master Menu)

INSERT ke tabel `"Menu"` (service master data, lihat `database/schema.sql` SELOG_WMS_2.0_ServiceMasterData) untuk menu fitur Plan Incoming (tabel V2 di service ini).

Parent menu ID di-resolve runtime lewat `menuCode` — tidak hardcode UUID. **Sesuaikan 3 nilai ini dengan data live sebelum eksekusi:** `@parentMenuCode`, `"order"`, dan `"icon"`.

## Script

```sql
-- Sesuaikan dengan parent menu di DB live (mis. menu Incoming/Transaksi)
DECLARE @parentMenuCode VARCHAR(50) = 'INCOMING';
DECLARE @parentMenuId UNIQUEIDENTIFIER =
  (SELECT "id" FROM "Menu"
   WHERE "menuCode" = @parentMenuCode AND "deletedAt" IS NULL);

DECLARE @nextOrder INT =
  (SELECT ISNULL(MAX("order"), 0) + 1 FROM "Menu"
   WHERE "parentId" = @parentMenuId AND "deletedAt" IS NULL);

INSERT INTO "Menu"
  ("id", "parentId", "level", "menu", "url", "icon", "order", "isTab", "menuCode", "createdBy", "createdAt")
VALUES
  (NEWID(), @parentMenuId, 2, 'Plan Incoming', '/incoming/plan-incoming', 'FileText', @nextOrder, 0, 'PLAN-INCOMING', 'system', SYSDATETIMEOFFSET());
```

## Catatan

1. `"order"` otomatis = max + 1 di bawah parent; geser manual kalau posisi spesifik dibutuhkan.
2. `"url"` mengikuti pola path frontend (`/incoming/plan-incoming`) — samakan dengan route yang dibuat di SELOG_WMS_2.0_Frontend.
3. `"menuCode"` `PLAN-INCOMING` dipakai untuk lookup menu (juga dipakai script ini dan UAM role assignment).
4. Setelah insert menu, assign akses via tabel `"Uam"` (roleId × menuId, canCreate/canRead/canUpdate/canDelete/canEtc) — dari UI Role Permission frontend, atau INSERT manual dengan pattern yang sama.
5. Kolom mengikuti entity `menu.entity.ts` / schema.sql: `menu`, `url`, `order` NOT NULL; `createdBy` NOT NULL.

## Menu Actual Incoming (halaman Actual Incoming — 002-actual-incoming-page)

Endpoint `GET /v1/actual-incoming` & `POST /v1/actual-incoming/delete`
memakai `menuCode: ACTUAL-INCOMING` (`outstandingIncomingConstant.actualMenuCode`).

```sql
DECLARE @parentMenuCode VARCHAR(50) = 'PLAN-INCOMING'; -- parent = menu Plan Incoming di atas
DECLARE @parentMenuId UNIQUEIDENTIFIER =
  (SELECT "id" FROM "Menu"
   WHERE "menuCode" = @parentMenuCode AND "deletedAt" IS NULL);

DECLARE @nextOrder INT =
  (SELECT ISNULL(MAX("order"), 0) + 1 FROM "Menu"
   WHERE "parentId" = @parentMenuId AND "deletedAt" IS NULL);

INSERT INTO "Menu"
  ("id", "parentId", "level", "menu", "url", "icon", "order", "isTab", "menuCode", "createdBy", "createdAt")
VALUES
  (NEWID(), @parentMenuId, 3, 'Actual Incoming', '/plan-incoming/actual-incoming', 'CheckCircle', @nextOrder, 0, 'ACTUAL-INCOMING', 'system', SYSDATETIMEOFFSET());
```

Setelah insert: assign akses via tabel `"Uam"` (canRead untuk lihat, canDelete untuk tombol hapus).
