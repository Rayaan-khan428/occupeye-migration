import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Create PostgreSQL pool and adapter
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://mnyqhpnsoedlbdnbapjv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ ERROR: Supabase key not found in environment variables.');
  console.error('Please add one of the following to your .env file:');
  console.error('  - SUPABASE_SERVICE_KEY (recommended for migrations)');
  console.error('  - SUPABASE_KEY');
  console.error('  - SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const STORAGE_BUCKET = 'occupeye-photos';

// Types for JSON data
interface StudyRoomData {
  id: string;
  name: string;
  building: string;
  spaceType?: string;
  location: string;
  imageURL?: string[];
  features: string[];
  noiseLevel: string;
  capacity?: number;
  description: string;
}

interface RoomData {
  id: string;
  building: string;
  photos: string[];
  room: string;
  information: {
    av_inputs: string;
    pc: string;
    whiteboard: string;
    projector: string;
  };
}

// Building name normalization map
const buildingNameMap: Record<string, string> = {
  'Peters': 'Peters Building',
  'Peters Building': 'Peters Building',
  'Lazaridis Hall': 'Lazaridis Hall',
  'Science Building': 'Science Building',
  'Science & Research': 'Science Building',
  'Dr. Alvin Woods Building': 'Dr. Alvin Woods Building',
  'Fred Nichols Campus Center': 'Fred Nichols Campus Center',
  'Fred Nichols Campus Centre': 'Fred Nichols Campus Center',
  'Schlegel': 'Schlegel Building',
  'Schlegel Building': 'Schlegel Building',
  'Bricker Academic Building': 'Bricker Academic Building',
  'University Library': 'University Library',
  'Arts': 'Arts Building',
  'Arts Building': 'Arts Building',
  'MLU': 'Martin Luther University College',
};

// Stats tracking
const stats = {
  university: 0,
  buildings: 0,
  studySpots: 0,
  lectureHalls: 0,
  photos: 0,
  errors: [] as string[],
};

/**
 * Create storage bucket if it doesn't exist
 */
async function ensureStorageBucket(): Promise<void> {
  console.log('\n🪣 Checking Storage Bucket...');
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${STORAGE_BUCKET}' already exists`);
      return;
    }
    
    // Create bucket
    console.log(`📦 Creating bucket '${STORAGE_BUCKET}'...`);
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/jpg']
    });
    
    if (createError) {
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }
    
    console.log(`✅ Created bucket '${STORAGE_BUCKET}' successfully`);
  } catch (error) {
    throw new Error(`Storage bucket setup failed: ${error}`);
  }
}

/**
 * Clear all existing data from database
 */
async function clearExistingData(): Promise<void> {
  console.log('\n🗑️  Clearing Existing Data...');
  
  try {
    // Delete in correct order due to foreign key constraints
    const photoCount = await prisma.photo.deleteMany();
    console.log(`  Deleted ${photoCount.count} photos`);
    
    const studySpotCount = await prisma.studySpot.deleteMany();
    console.log(`  Deleted ${studySpotCount.count} study spots`);
    
    const lectureHallCount = await prisma.lectureHall.deleteMany();
    console.log(`  Deleted ${lectureHallCount.count} lecture halls`);
    
    const buildingCount = await prisma.building.deleteMany();
    console.log(`  Deleted ${buildingCount.count} buildings`);
    
    const universityCount = await prisma.university.deleteMany();
    console.log(`  Deleted ${universityCount.count} universities`);
    
    console.log('✅ All existing data cleared');
  } catch (error) {
    throw new Error(`Failed to clear existing data: ${error}`);
  }
}

/**
 * Normalize building name to consistent format
 */
function normalizeBuildingName(name: string): string {
  return buildingNameMap[name] || name;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to download image from ${url}: ${error}`);
  }
}

/**
 * Optimize image: convert to WebP and resize to 30% of original
 */
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    const newWidth = Math.round((metadata.width || 1000) * 0.3);
    const newHeight = Math.round((metadata.height || 1000) * 0.3);
    
    return await image
      .resize(newWidth, newHeight)
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    throw new Error(`Failed to optimize image: ${error}`);
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
      });
    
    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    
    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload to Supabase: ${error}`);
  }
}

/**
 * Step 1: Create University Record
 */
async function createUniversity(): Promise<string> {
  console.log('\n📚 Step 1: Creating University...');
  
  const university = await prisma.university.create({
    data: {
      name: 'Wilfrid Laurier University',
      slug: 'wilfrid-laurier',
    },
  });
  
  stats.university = 1;
  console.log(`✅ Created university: ${university.name} (ID: ${university.id})`);
  return university.id;
}

/**
 * Step 2: Extract and Create Buildings
 */
async function createBuildings(universityId: string): Promise<Map<string, string>> {
  console.log('\n🏢 Step 2: Creating Buildings...');
  
  // Load JSON files
  const studyRoomsPath = path.join(__dirname, '../data/collections/study-rooms.json');
  const roomsPath = path.join(__dirname, '../data/collections/rooms.json');
  
  const studyRooms: StudyRoomData[] = JSON.parse(fs.readFileSync(studyRoomsPath, 'utf-8'));
  const rooms: RoomData[] = JSON.parse(fs.readFileSync(roomsPath, 'utf-8'));
  
  // Extract unique building names
  const buildingNames = new Set<string>();
  
  studyRooms.forEach(room => {
    if (room.building) {
      buildingNames.add(normalizeBuildingName(room.building));
    }
  });
  
  rooms.forEach(room => {
    if (room.building) {
      buildingNames.add(normalizeBuildingName(room.building));
    }
  });
  
  // Create building records
  const buildingMap = new Map<string, string>();
  
  for (const buildingName of buildingNames) {
    try {
      const building = await prisma.building.create({
        data: {
          name: buildingName,
          universityId,
        },
      });
      
      buildingMap.set(buildingName, building.id);
      stats.buildings++;
      console.log(`✅ Created building: ${buildingName}`);
    } catch (error) {
      const errorMsg = `Failed to create building ${buildingName}: ${error}`;
      stats.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }
  
  return buildingMap;
}

/**
 * Step 3: Migrate Study Spots
 */
async function migrateStudySpots(
  buildingMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('\n📖 Step 3: Migrating Study Spots...');
  
  const studyRoomsPath = path.join(__dirname, '../data/collections/study-rooms.json');
  const studyRooms: StudyRoomData[] = JSON.parse(fs.readFileSync(studyRoomsPath, 'utf-8'));
  
  const studySpotMap = new Map<string, string>();
  
  for (const room of studyRooms) {
    try {
      const normalizedBuilding = normalizeBuildingName(room.building);
      const buildingId = buildingMap.get(normalizedBuilding);
      
      if (!buildingId) {
        throw new Error(`Building not found: ${normalizedBuilding}`);
      }
      
      const studySpot = await prisma.studySpot.create({
        data: {
          name: room.name,
          buildingId,
          location: room.location,
          description: room.description,
          features: room.features,
          noiseLevel: room.noiseLevel,
          spaceType: room.spaceType || null,
        },
      });
      
      studySpotMap.set(room.id, studySpot.id);
      stats.studySpots++;
      console.log(`✅ Created study spot: ${room.name}`);
    } catch (error) {
      const errorMsg = `Failed to create study spot ${room.name}: ${error}`;
      stats.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }
  
  return studySpotMap;
}

/**
 * Step 4: Migrate Lecture Halls
 */
async function migrateLectureHalls(
  buildingMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('\n🎓 Step 4: Migrating Lecture Halls...');
  
  const roomsPath = path.join(__dirname, '../data/collections/rooms.json');
  const rooms: RoomData[] = JSON.parse(fs.readFileSync(roomsPath, 'utf-8'));
  
  const lectureHallMap = new Map<string, string>();
  
  for (const room of rooms) {
    try {
      const normalizedBuilding = normalizeBuildingName(room.building);
      const buildingId = buildingMap.get(normalizedBuilding);
      
      if (!buildingId) {
        throw new Error(`Building not found: ${normalizedBuilding}`);
      }
      
      const lectureHall = await prisma.lectureHall.create({
        data: {
          buildingId,
          room: room.room,
          hasAvInputs: room.information.av_inputs === 'yes',
          hasPc: room.information.pc === 'yes',
          hasWhiteboard: room.information.whiteboard === 'yes',
          hasProjector: room.information.projector === 'yes',
        },
      });
      
      lectureHallMap.set(room.id, lectureHall.id);
      stats.lectureHalls++;
      console.log(`✅ Created lecture hall: ${room.room}`);
    } catch (error) {
      const errorMsg = `Failed to create lecture hall ${room.room}: ${error}`;
      stats.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }
  
  return lectureHallMap;
}

/**
 * Step 5: Process and Upload Photos
 */
async function processPhotos(
  universityId: string,
  studySpotMap: Map<string, string>,
  lectureHallMap: Map<string, string>
): Promise<void> {
  console.log('\n📸 Step 5: Processing and Uploading Photos...');
  
  // Process Study Spot photos
  const studyRoomsPath = path.join(__dirname, '../data/collections/study-rooms.json');
  const studyRooms: StudyRoomData[] = JSON.parse(fs.readFileSync(studyRoomsPath, 'utf-8'));
  
  for (const room of studyRooms) {
    if (!room.imageURL || room.imageURL.length === 0) continue;
    
    const studySpotId = studySpotMap.get(room.id);
    if (!studySpotId) continue;
    
    for (let i = 0; i < room.imageURL.length; i++) {
      const imageUrl = room.imageURL[i];
      
      try {
        console.log(`  Downloading: ${imageUrl.substring(0, 80)}...`);
        const imageBuffer = await downloadImage(imageUrl);
        
        console.log(`  Optimizing image ${i + 1}/${room.imageURL.length}...`);
        const optimizedBuffer = await optimizeImage(imageBuffer);
        
        const storagePath = `universities/${universityId}/photos/study-spots/${studySpotId}/${i}.webp`;
        console.log(`  Uploading to: ${storagePath}`);
        const publicUrl = await uploadToSupabase(optimizedBuffer, storagePath);
        
        await prisma.photo.create({
          data: {
            storagePath,
            url: publicUrl,
            studySpotId,
          },
        });
        
        stats.photos++;
        console.log(`  ✅ Processed photo ${i + 1} for ${room.name}`);
      } catch (error) {
        const errorMsg = `Failed to process photo for study spot ${room.name}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }
  }
  
  // Process Lecture Hall photos
  const roomsPath = path.join(__dirname, '../data/collections/rooms.json');
  const rooms: RoomData[] = JSON.parse(fs.readFileSync(roomsPath, 'utf-8'));
  
  for (const room of rooms) {
    if (!room.photos || room.photos.length === 0) continue;
    
    const lectureHallId = lectureHallMap.get(room.id);
    if (!lectureHallId) continue;
    
    for (let i = 0; i < room.photos.length; i++) {
      const imageUrl = room.photos[i];
      
      try {
        console.log(`  Downloading: ${imageUrl.substring(0, 80)}...`);
        const imageBuffer = await downloadImage(imageUrl);
        
        console.log(`  Optimizing image ${i + 1}/${room.photos.length}...`);
        const optimizedBuffer = await optimizeImage(imageBuffer);
        
        const storagePath = `universities/${universityId}/photos/lecture-halls/${lectureHallId}/${i}.webp`;
        console.log(`  Uploading to: ${storagePath}`);
        const publicUrl = await uploadToSupabase(optimizedBuffer, storagePath);
        
        await prisma.photo.create({
          data: {
            storagePath,
            url: publicUrl,
            lectureHallId,
          },
        });
        
        stats.photos++;
        console.log(`  ✅ Processed photo ${i + 1} for ${room.room}`);
      } catch (error) {
        const errorMsg = `Failed to process photo for lecture hall ${room.room}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firestore to Supabase Migration...\n');
  const startTime = Date.now();
  
  try {
    // Step 0: Setup - Clear data and ensure bucket exists
    await clearExistingData();
    await ensureStorageBucket();
    
    // Step 1: Create University
    const universityId = await createUniversity();
    
    // Step 2: Create Buildings
    const buildingMap = await createBuildings(universityId);
    
    // Step 3: Migrate Study Spots
    const studySpotMap = await migrateStudySpots(buildingMap);
    
    // Step 4: Migrate Lecture Halls
    const lectureHallMap = await migrateLectureHalls(buildingMap);
    
    // Step 5: Process Photos
    await processPhotos(universityId, studySpotMap, lectureHallMap);
    
    // Generate summary report
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ University: ${stats.university}`);
    console.log(`✅ Buildings: ${stats.buildings}`);
    console.log(`✅ Study Spots: ${stats.studySpots}`);
    console.log(`✅ Lecture Halls: ${stats.lectureHalls}`);
    console.log(`✅ Photos: ${stats.photos}`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60));
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

