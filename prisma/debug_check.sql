-- Check schemas available
select schema_name
from information_schema.schemata
where schema_name in ('public', 'laviou', 'auth')
order by schema_name;

-- List tables in public + laviou schemas
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'laviou')
  and table_type = 'BASE TABLE'
order by table_schema, table_name;

-- Counts (will error if tables don't exist)
select
  (select count(*) from laviou.users)  as laviou_users,
  (select count(*) from laviou.items)  as laviou_items;

