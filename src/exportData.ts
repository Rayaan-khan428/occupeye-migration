// Example script to export Firestore data to JSON
// Run this file to start the migration process

import "./services/client"; // Initialize Firebase Admin
import {
  getAllCollections,
  exportAllCollectionsToJson,
  exportCollectionToJson,
  exportCollectionWithSubcollections,
  getCollectionData,
  queryCollection,
  saveToJson,
} from "./services/fireStoreQueries";

async function main() {
  try {
    console.log("Starting Firestore data export...\n");

    // Example 1: Get all collection names
    console.log("=== Getting all collections ===");
    const collections = await getAllCollections();
    console.log("\n");

    // Example 2: Export all collections to JSON
    console.log("=== Exporting all collections ===");
    await exportAllCollectionsToJson("./data/collections");
    console.log("\n");

    // Example 3: Export a specific collection (uncomment and replace 'collectionName')
    // console.log("=== Exporting specific collection ===");
    // await exportCollectionToJson("users", "./data/collections");
    // console.log("\n");

    // Example 4: Export collection with subcollections (uncomment and replace 'collectionName')
    // console.log("=== Exporting collection with subcollections ===");
    // await exportCollectionWithSubcollections("users", "./data/collections");
    // console.log("\n");

    // Example 5: Query specific documents with filters (uncomment and customize)
    // console.log("=== Querying collection with filters ===");
    // const filteredData = await queryCollection("users", [
    //   { field: "status", operator: "==", value: "active" },
    //   { field: "createdAt", operator: ">", value: new Date("2024-01-01") }
    // ]);
    // await saveToJson(filteredData, "filtered_users.json", "./data/queries");
    // console.log("\n");

    // Example 6: Get data from a specific collection programmatically
    // console.log("=== Getting data from specific collection ===");
    // const data = await getCollectionData("users");
    // console.log(`Retrieved ${data.length} documents`);
    // // Do something with the data...
    // console.log("\n");

    console.log("✅ Data export completed successfully!");
  } catch (error) {
    console.error("❌ Error during data export:", error);
    process.exit(1);
  }
}

// Run the main function
main();

