# Occupeye Migration

A tool to migrate data from Firestore to PostgreSQL using Prisma.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Ensure your `serviceAccountKey.json` is in the root directory (already configured in `.gitignore`)

## Exporting Firestore Data to JSON

### Quick Start

Run the export script to pull all data from Firestore and save it as JSON:

```bash
npm run export
```

This will:
- Connect to your Firestore database
- Fetch all collections
- Save each collection as a separate JSON file in `./data/collections/`

### Available Functions

The `src/services/fireStoreQueries.ts` file provides several utility functions:

#### 1. Get All Collections
```typescript
import { getAllCollections } from "./services/fireStoreQueries";

const collections = await getAllCollections();
console.log(collections); // ['users', 'posts', 'comments', ...]
```

#### 2. Get Data from a Specific Collection
```typescript
import { getCollectionData } from "./services/fireStoreQueries";

const users = await getCollectionData("users");
// Returns: [{ id: "user1", name: "John", ... }, ...]
```

#### 3. Export Collection to JSON
```typescript
import { exportCollectionToJson } from "./services/fireStoreQueries";

await exportCollectionToJson("users", "./data/collections");
// Creates: ./data/collections/users.json
```

#### 4. Export All Collections
```typescript
import { exportAllCollectionsToJson } from "./services/fireStoreQueries";

await exportAllCollectionsToJson("./data/collections");
// Exports all collections to separate JSON files
```

#### 5. Export Collection with Subcollections
```typescript
import { exportCollectionWithSubcollections } from "./services/fireStoreQueries";

await exportCollectionWithSubcollections("users", "./data/collections");
// Creates: ./data/collections/users_with_subcollections.json
// Includes nested subcollections in the output
```

#### 6. Query Collection with Filters
```typescript
import { queryCollection } from "./services/fireStoreQueries";

const activeUsers = await queryCollection("users", [
  { field: "status", operator: "==", value: "active" },
  { field: "createdAt", operator: ">", value: new Date("2024-01-01") }
]);
```

#### 7. Get Subcollection Data
```typescript
import { getSubcollectionData } from "./services/fireStoreQueries";

const userPosts = await getSubcollectionData("users", "user123", "posts");
// Gets all posts for user123
```

#### 8. Save Data to JSON
```typescript
import { saveToJson } from "./services/fireStoreQueries";

await saveToJson(myData, "output.json", "./data");
// Creates: ./data/output.json
```

### Customizing the Export

Edit `src/exportData.ts` to customize what data gets exported. The file includes commented examples for different use cases.

## Project Structure

```
occupeye-migration/
├── src/
│   ├── services/
│   │   ├── client.ts              # Firebase Admin initialization
│   │   └── fireStoreQueries.ts    # Firestore query functions
│   └── exportData.ts              # Main export script
├── data/                          # Exported JSON files (gitignored)
├── prisma/
│   └── schema.prisma              # Prisma schema
├── serviceAccountKey.json         # Firebase credentials (gitignored)
└── package.json
```

## Next Steps

1. **Export Data**: Run `npm run export` to pull all Firestore data
2. **Review Data**: Check the `./data/collections/` folder for exported JSON files
3. **Define Schema**: Update `prisma/schema.prisma` with your database models
4. **Migrate**: Create migration scripts to transform JSON data into Prisma format
5. **Import**: Use Prisma Client to insert data into PostgreSQL

## Scripts

- `npm run export` - Export Firestore data to JSON files
- `npm run export:watch` - Run export script with auto-reload on changes

## Notes

- All exported data is saved to the `./data` directory (gitignored)
- Each collection is saved as a separate JSON file
- Document IDs are preserved in the exported data
- Timestamps and other special Firestore types are serialized to JSON-compatible formats

