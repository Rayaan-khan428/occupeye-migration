// This file contains the queries for the firestore database, it will be used to programmatically migrate the data from the firestore database to the prisma database.

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Get Firestore instance
const db = admin.firestore();

/**
 * Fetches all collection names from Firestore
 */
export async function getAllCollections(): Promise<string[]> {
  try {
    const collections = await db.listCollections();
    const collectionNames = collections.map((col) => col.id);
    console.log(`Found ${collectionNames.length} collections:`, collectionNames);
    return collectionNames;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
}

/**
 * Fetches all documents from a specific collection
 */
export async function getCollectionData(
  collectionName: string
): Promise<any[]> {
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(
      `Fetched ${documents.length} documents from ${collectionName}`
    );
    return documents;
  } catch (error) {
    console.error(`Error fetching data from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Fetches all documents from a subcollection
 */
export async function getSubcollectionData(
  parentCollection: string,
  parentDocId: string,
  subcollectionName: string
): Promise<any[]> {
  try {
    const snapshot = await db
      .collection(parentCollection)
      .doc(parentDocId)
      .collection(subcollectionName)
      .get();

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `Fetched ${documents.length} documents from ${parentCollection}/${parentDocId}/${subcollectionName}`
    );
    return documents;
  } catch (error) {
    console.error(
      `Error fetching subcollection ${subcollectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Saves data to a JSON file
 */
export async function saveToJson(
  data: any,
  filename: string,
  outputDir: string = "./data"
): Promise<void> {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${filename}:`, error);
    throw error;
  }
}

/**
 * Exports all data from a collection to JSON
 */
export async function exportCollectionToJson(
  collectionName: string,
  outputDir: string = "./data"
): Promise<void> {
  try {
    const data = await getCollectionData(collectionName);
    await saveToJson(data, `${collectionName}.json`, outputDir);
  } catch (error) {
    console.error(`Error exporting ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Exports all collections to JSON files
 */
export async function exportAllCollectionsToJson(
  outputDir: string = "./data"
): Promise<void> {
  try {
    const collections = await getAllCollections();

    for (const collectionName of collections) {
      await exportCollectionToJson(collectionName, outputDir);
    }

    console.log(
      `Successfully exported ${collections.length} collections to ${outputDir}`
    );
  } catch (error) {
    console.error("Error exporting all collections:", error);
    throw error;
  }
}

/**
 * Exports all data including subcollections to JSON
 * This creates a nested structure with subcollections included
 */
export async function exportCollectionWithSubcollections(
  collectionName: string,
  outputDir: string = "./data"
): Promise<void> {
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents = [];

    for (const doc of snapshot.docs) {
      const docData: any = {
        id: doc.id,
        ...doc.data(),
        _subcollections: {},
      };

      // Get all subcollections for this document
      const subcollections = await doc.ref.listCollections();

      for (const subcol of subcollections) {
        const subSnapshot = await subcol.get();
        docData._subcollections[subcol.id] = subSnapshot.docs.map((subDoc) => ({
          id: subDoc.id,
          ...subDoc.data(),
        }));
      }

      documents.push(docData);
    }

    await saveToJson(documents, `${collectionName}_with_subcollections.json`, outputDir);
    console.log(
      `Exported ${collectionName} with subcollections to ${outputDir}`
    );
  } catch (error) {
    console.error(
      `Error exporting ${collectionName} with subcollections:`,
      error
    );
    throw error;
  }
}

/**
 * Query documents with filters
 */
export async function queryCollection(
  collectionName: string,
  filters: { field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }[]
): Promise<any[]> {
  try {
    let query: FirebaseFirestore.Query = db.collection(collectionName);

    // Apply filters
    filters.forEach((filter) => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    const snapshot = await query.get();
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `Query returned ${documents.length} documents from ${collectionName}`
    );
    return documents;
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
}