# Migration Guide

## ✅ Completed Setup

1. **Prisma Schema Updated**
   - `LectureHall.information` converted to boolean fields (`hasAvInputs`, `hasPc`, `hasWhiteboard`, `hasProjector`)
   - `StudySpot.spaceType` made optional (some records don't have this field)

2. **Dependencies Installed**
   - `sharp` - Image optimization (WebP conversion, resizing)
   - `axios` - HTTP client for downloading images
   - `dotenv` - Environment variable management

3. **Migration Script Created** (`src/migrateData.ts`)
   - Step 1: Create University (Wilfrid Laurier University)
   - Step 2: Extract and create Buildings from JSON data
   - Step 3: Migrate Study Spots from `study-rooms.json`
   - Step 4: Migrate Lecture Halls from `rooms.json`
   - Step 5: Download, optimize, and upload photos to Supabase
   - Comprehensive error handling and progress logging
   - Summary report at completion

4. **NPM Script Added**
   - Run migration with: `npm run migrate`

## ⚠️ Before Running Migration

### 1. Database Setup

The Prisma commands are currently hanging when trying to connect to the database. You need to:

```bash
# Option A: Apply schema using Prisma Migrate
npx prisma migrate dev --name init

# Option B: Push schema directly (faster for development)
npx prisma db push
```

If these commands hang, check your database connection:
- Verify `DATABASE_URL` in `.env` is correct
- Ensure your Supabase database is accessible
- Check if you're behind a firewall/VPN that might be blocking the connection
- Try using `DIRECT_URL` if you have connection pooling issues

### 2. Supabase Storage Setup

The migration script has a **placeholder** for Supabase storage uploads. You need to implement the actual upload logic:

**In `src/migrateData.ts`, locate the `uploadToSupabase()` function (around line 103):**

```typescript
async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string
): Promise<string> {
  // TODO: Implement actual Supabase storage upload using MCP tools
  // Current implementation is a placeholder
  
  // You need to:
  // 1. Use Supabase MCP to upload the buffer to your storage bucket
  // 2. Get the public URL back from Supabase
  // 3. Return the URL
  
  return `https://supabase-placeholder.com/${storagePath}`;
}
```

**Implementation options:**

**Option A: Using Supabase MCP (Recommended since you have it configured)**
- The Supabase MCP should provide storage upload capabilities
- You'll need to check the MCP documentation for the exact syntax
- Typically something like uploading to a bucket named "occupeye-photos" or similar

**Option B: Using @supabase/supabase-js directly**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('occupeye-photos') // Your bucket name
    .upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: true
    });
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('occupeye-photos')
    .getPublicUrl(storagePath);
    
  return publicUrl;
}
```

### 3. Environment Variables

Ensure your `.env` file has:
```env
DATABASE_URL="your-postgres-connection-string"
DIRECT_URL="your-direct-postgres-connection"

# If implementing Option B above, also add:
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"
```

## 🚀 Running the Migration

Once the above setup is complete:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Apply database schema
npx prisma db push

# 3. Run the migration
npm run migrate
```

## 📊 What the Migration Does

### Data Transformations

1. **Building Name Normalization**
   - Handles variations like "Peters" → "Peters Building"
   - Maps "Science & Research" → "Science Building"
   - Ensures consistent naming across the database

2. **Study Spots**
   - Maps to buildings via normalized names
   - Preserves all features, noise levels, and descriptions
   - Handles missing `spaceType` fields gracefully

3. **Lecture Halls**
   - Converts information object to boolean fields:
     ```json
     { "av_inputs": "yes", "pc": "yes" }
     ```
     becomes:
     ```typescript
     { hasAvInputs: true, hasPc: true }
     ```

4. **Photos**
   - Downloads from Firebase/Google Storage URLs
   - Converts to WebP format (better compression)
   - Resizes to 30% of original dimensions (70% reduction)
   - Uploads to Supabase Storage with organized paths:
     ```
     universities/{universityId}/photos/
       ├── study-spots/{spotId}/0.webp
       └── lecture-halls/{hallId}/0.webp
     ```
   - Creates Photo records with foreign keys linking to entities

### Progress Tracking

The migration provides:
- Real-time progress logs for each step
- Error tracking with detailed messages
- Summary report with counts and duration
- List of any errors encountered

### Example Output

```
🚀 Starting Firestore to Supabase Migration...

📚 Step 1: Creating University...
✅ Created university: Wilfrid Laurier University (ID: xxx)

🏢 Step 2: Creating Buildings...
✅ Created building: Peters Building
✅ Created building: Lazaridis Hall
...

📖 Step 3: Migrating Study Spots...
✅ Created study spot: Library 5th Floor
✅ Created study spot: 24 Lounge Study Rooms
...

🎓 Step 4: Migrating Lecture Halls...
✅ Created lecture hall: LH1001
...

📸 Step 5: Processing and Uploading Photos...
  ✅ Processed photo 1 for Library 5th Floor
...

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ University: 1
✅ Buildings: 15
✅ Study Spots: 65
✅ Lecture Halls: 60
✅ Photos: 450
❌ Errors: 0
⏱️  Duration: 125.34s
============================================================

✅ Migration completed successfully!
```

## 🔍 Verification

After migration, verify the data:

```bash
# Check counts
npx prisma studio

# Or query directly
npm run verify  # (You'd need to create this script)
```

## 🐛 Troubleshooting

### Database Connection Issues
- Check firewall settings
- Verify Supabase project is active
- Test connection with: `npx prisma db pull`

### Image Download Failures
- Some Firebase URLs might be expired/invalid
- Check if you need authentication for Firebase Storage
- The script will log errors but continue with other images

### Memory Issues
- Processing many images can be memory-intensive
- Consider processing in batches if needed
- Monitor memory usage during migration

## 📝 Notes

- The migration is idempotent-ish (creates new records each time)
- Run only once or clear database before re-running
- Photo optimization settings: WebP @ 85% quality, 30% of original size
- All timestamps use `DateTime @default(now())`

