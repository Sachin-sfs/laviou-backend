const fs = require('fs');
const path = require('path');

function loadEnvFromDotenv(filePath) {
  const abs = path.resolve(filePath);
  const text = fs.readFileSync(abs, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvFromDotenv(path.join(__dirname, '..', '.env'));
  const { PrismaClient } = require('@prisma/client');

  const prisma = new PrismaClient();
  try {
    const schemaRow = await prisma.$queryRawUnsafe(
      `select current_schema() as schema, current_database() as db`,
    );
    console.log('Connection:', schemaRow);

    const tables = await prisma.$queryRawUnsafe(
      `select table_schema, table_name
       from information_schema.tables
       where table_schema in ('public','laviou')
         and table_type='BASE TABLE'
       order by table_schema, table_name`,
    );
    console.log('Tables:', tables);

    const counts = await prisma.$queryRawUnsafe(
      `select
         (select count(*) from laviou.users) as laviou_users,
         (select count(*) from laviou.items) as laviou_items`,
    );
    console.log('Counts:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

