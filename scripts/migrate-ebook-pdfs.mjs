#!/usr/bin/env node
// One-time move of full ebook PDFs from the public `store-assets` bucket to the
// private `ebook-pdfs` bucket (same `pdfs/{filename}` path).
//
//   node --env-file=.env scripts/migrate-ebook-pdfs.mjs               copy + verify sizes (never deletes)
//   node --env-file=.env scripts/migrate-ebook-pdfs.mjs --delete-old  remove store-assets/pdfs/* that are
//                                                                     verified present in ebook-pdfs
//
// Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';

const SOURCE_BUCKET = 'store-assets';
const TARGET_BUCKET = 'ebook-pdfs';
const FOLDER = 'pdfs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const deleteOld = process.argv.includes('--delete-old');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const listPdfs = async (bucket) => {
  const files = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(FOLDER, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${bucket}/${FOLDER} failed: ${error.message}`);
    const pdfs = (data || []).filter((f) => f.id && f.name.toLowerCase().endsWith('.pdf'));
    files.push(...pdfs.map((f) => ({ name: f.name, size: Number(f.metadata?.size ?? -1) })));
    if (!data || data.length < pageSize) break;
  }
  return new Map(files.map((f) => [f.name, f.size]));
};

const copyMissing = async (source, target) => {
  let copied = 0;
  let skipped = 0;
  for (const [name, size] of source) {
    if (target.get(name) === size) {
      skipped += 1;
      continue;
    }
    const { data, error } = await supabase.storage.from(SOURCE_BUCKET).download(`${FOLDER}/${name}`);
    if (error || !data) throw new Error(`download ${name} failed: ${error?.message}`);
    const { error: uploadError } = await supabase.storage
      .from(TARGET_BUCKET)
      .upload(`${FOLDER}/${name}`, data, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new Error(`upload ${name} failed: ${uploadError.message}`);
    copied += 1;
    console.log(`copied ${name} (${size} bytes)`);
  }
  return { copied, skipped };
};

const verify = (source, target) => {
  const problems = [];
  for (const [name, size] of source) {
    if (!target.has(name)) problems.push(`${name}: missing in ${TARGET_BUCKET}`);
    else if (target.get(name) !== size) problems.push(`${name}: size ${size} != ${target.get(name)}`);
  }
  return problems;
};

const main = async () => {
  const source = await listPdfs(SOURCE_BUCKET);
  console.log(`${source.size} PDF(s) in ${SOURCE_BUCKET}/${FOLDER}`);

  if (!deleteOld) {
    const before = await listPdfs(TARGET_BUCKET);
    const { copied, skipped } = await copyMissing(source, before);
    const after = await listPdfs(TARGET_BUCKET);
    const problems = verify(source, after);
    console.log(`copied ${copied}, already present ${skipped}`);
    if (problems.length > 0) {
      console.error(`Verification failed:\n  ${problems.join('\n  ')}`);
      process.exit(1);
    }
    console.log(`Verified: all ${source.size} PDF(s) present in ${TARGET_BUCKET} with matching sizes. Nothing deleted.`);
    return;
  }

  const target = await listPdfs(TARGET_BUCKET);
  const problems = verify(source, target);
  if (problems.length > 0) {
    console.error(`Refusing to delete; not all files are safely copied:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  const paths = [...source.keys()].map((name) => `${FOLDER}/${name}`);
  if (paths.length === 0) {
    console.log('Nothing to delete.');
    return;
  }
  const { error } = await supabase.storage.from(SOURCE_BUCKET).remove(paths);
  if (error) throw new Error(`remove failed: ${error.message}`);
  console.log(`Deleted ${paths.length} PDF(s) from ${SOURCE_BUCKET}/${FOLDER}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
