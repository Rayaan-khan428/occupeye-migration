# Quick Start Guide

## Step 1: Export Your Firestore Data

The easiest way to get started is to run the export script:

```bash
npm run export
```

This will automatically:
- Connect to your Firestore database
- Discover all collections
- Export each collection to a JSON file in `./data/collections/`

## Step 2: Check Your Exported Data

After running the export, check the `./data/collections/` directory:

```bash
ls -la data/collections/
```

You'll see JSON files for each collection, like:
- `users.json`
- `posts.json`
- `comments.json`
- etc.

## Step 3: Customize Your Export (Optional)

If you need more control, edit `src/exportData.ts`:

### Export a Specific Collection

```typescript
await exportCollectionToJson("users", "./data/collections");
```

### Export with Subcollections

```typescript
await exportCollectionWithSubcollections("users", "./data/collections");
```

### Query with Filters

```typescript
const activeUsers = await queryCollection("users", [
  { field: "status", operator: "==", value: "active" }
]);
await saveToJson(activeUsers, "active_users.json", "./data/queries");
```

## Common Use Cases

### 1. Export Everything
```bash
npm run export
```

### 2. Export Specific Collections
Edit `src/exportData.ts` and uncomment:
```typescript
await exportCollectionToJson("users", "./data/collections");
await exportCollectionToJson("posts", "./data/collections");
```

### 3. Export with Custom Processing
See `src/examples.ts` for detailed examples of:
- Filtering data
- Transforming data
- Batch processing
- Adding metadata

### 4. Work with Subcollections
```typescript
// Get subcollection data
const userPosts = await getSubcollectionData("users", "user123", "posts");

// Or export entire collection with all subcollections
await exportCollectionWithSubcollections("users", "./data/collections");
```

## Programmatic Usage

You can also use the functions directly in your own scripts:

```typescript
import "./services/client";
import { getCollectionData, saveToJson } from "./services/fireStoreQueries";

async function myCustomExport() {
  const data = await getCollectionData("users");
  
  // Do your custom processing
  const processed = data.map(user => ({
    ...user,
    fullName: `${user.firstName} ${user.lastName}`
  }));
  
  await saveToJson(processed, "custom_users.json", "./data");
}
```

## Next Steps

1. ✅ Export your Firestore data to JSON
2. 📋 Review the exported data structure
3. 🗄️ Define your Prisma schema based on the data
4. 🔄 Create migration scripts to transform JSON → Prisma format
5. 📤 Import data into PostgreSQL using Prisma

## Troubleshooting

### "Cannot find module" errors
Make sure you've installed dependencies:
```bash
npm install
```

### "Permission denied" errors
Check that your `serviceAccountKey.json` is in the root directory and has the correct permissions.

### Empty exports
Verify your Firebase credentials are correct and have read access to your Firestore database.

## Available Scripts

- `npm run export` - Run the main export script
- `npm run export:watch` - Run with auto-reload on file changes

## File Structure

```
data/
├── collections/          # All collections exported here
├── queries/             # Filtered query results
├── processed/           # Custom processed data
└── exports/             # Other exports
```

All data directories are automatically gitignored.

