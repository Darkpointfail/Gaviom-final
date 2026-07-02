/**
 * Batch-normalize blog source .mjs files to match Gaviom SEO strategy:
 * - Consumer CTAs → Enter in Draw
 * - B2B CTAs → Request a Demo
 * - Relative internal URLs
 * - Trim meta descriptions > 155 chars in source strings
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = join(root, 'content/blog');

const B2B_SLUG_FRAGMENTS = [
  'employee-',
  'employer-',
  'hr-teams',
  'voluntary-benefits',
  'company-culture',
  'benefits-broker',
  'retention-strategies',
  'gaviom-for-business',
];

function isB2bFile(name) {
  return name.includes('hr-business');
}

function normalizeFileContent(content, filename) {
  let out = content;
  const b2b = isB2bFile(filename);

  out = out.replace(/https:\/\/gaviom\.com/g, '');

  if (b2b) {
    out = out.replace(/>Browse sweepstakes</gi, '>Request a Demo<');
    out = out.replace(/>Request a proposal</gi, '>Request a Demo<');
    out = out.replace(
      /href="\/prizes\.html" class="btn btn-primary">Request a Demo/g,
      'href="/business/" class="btn btn-primary">Request a Demo'
    );
  } else {
    out = out.replace(/>Browse sweepstakes</gi, '>Enter in Draw<');
    out = out.replace(/>Browse Sweepstakes</gi, '>Enter in Draw<');
    out = out.replace(
      /href="\/prizes\.html" class="btn btn-primary">Enter in Draw/g,
      'href="/prizes.html" class="btn btn-primary">Enter in Draw'
    );
  }

  // Trim description fields that exceed 155 characters (common in travel SEO batch)
  out = out.replace(
    /description:\s*\n?\s*'([^']{156,})'/g,
    (_, desc) => {
      const trimmed = desc.slice(0, 154).replace(/\s+\S*$/, '');
      return `description:\n      '${trimmed}.'`;
    }
  );
  out = out.replace(
    /description:\s*\n?\s*"([^"]{156,})"/g,
    (_, desc) => {
      const trimmed = desc.slice(0, 154).replace(/\s+\S*$/, '');
      return `description:\n      "${trimmed}."`;
    }
  );

  // Fix employee sweepstakes article category in posts.mjs
  if (filename === 'posts.mjs') {
    out = out.replace(
      /slug: 'employee-sweepstakes-companies',[\s\S]*?category: 'Giveaway Guides'/,
      (m) => m.replace("category: 'Giveaway Guides'", "category: 'For Business'")
    );
  }

  return out;
}

const files = readdirSync(blogDir).filter((f) => f.endsWith('.mjs'));
let changed = 0;

for (const file of files) {
  const path = join(blogDir, file);
  const before = readFileSync(path, 'utf8');
  const after = normalizeFileContent(before, file);
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    console.log(`normalize-blog-content: updated ${file}`);
  }
}

console.log(`normalize-blog-content: ${changed} file(s) updated`);
