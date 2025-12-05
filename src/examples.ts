// Example usage of Firestore query functions
// This file demonstrates various ways to pull data from Firestore

import "./services/client"; // Initialize Firebase Admin
import {
  getAllCollections,
  getCollectionData,
  getSubcollectionData,
  queryCollection,
  saveToJson,
  exportCollectionToJson,
  exportAllCollectionsToJson,
  exportCollectionWithSubcollections,
} from "./services/fireStoreQueries";

// Example 1: List all collections in your Firestore
async function listAllCollections() {
  const collections = await getAllCollections();
  console.log("Available collections:", collections);
  return collections;
}

// Example 2: Get all documents from a specific collection
async function getAllUsers() {
  const users = await getCollectionData("users");
  console.log(`Found ${users.length} users`);
  return users;
}

// Example 3: Query with filters
async function getActiveUsers() {
  const activeUsers = await queryCollection("users", [
    { field: "status", operator: "==", value: "active" },
  ]);
  console.log(`Found ${activeUsers.length} active users`);
  return activeUsers;
}

// Example 4: Get documents created after a specific date
async function getRecentPosts() {
  const recentPosts = await queryCollection("posts", [
    { field: "createdAt", operator: ">", value: new Date("2024-01-01") },
  ]);
  console.log(`Found ${recentPosts.length} recent posts`);
  return recentPosts;
}

// Example 5: Get subcollection data
async function getUserPosts(userId: string) {
  const posts = await getSubcollectionData("users", userId, "posts");
  console.log(`User ${userId} has ${posts.length} posts`);
  return posts;
}

// Example 6: Export specific collection to JSON
async function exportUsersToJson() {
  await exportCollectionToJson("users", "./data/exports");
  console.log("Users exported to ./data/exports/users.json");
}

// Example 7: Export collection with all subcollections
async function exportUsersWithSubcollections() {
  await exportCollectionWithSubcollections("users", "./data/exports");
  console.log("Users with subcollections exported");
}

// Example 8: Export all collections at once
async function exportEverything() {
  await exportAllCollectionsToJson("./data/full-export");
  console.log("All collections exported to ./data/full-export");
}

// Example 9: Custom data processing and export
async function processAndExportUsers() {
  // Get raw data
  const users = await getCollectionData("users");

  // Process/transform data
  const processedUsers = users.map((user) => ({
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    isActive: user.status === "active",
    // Add any custom transformations here
  }));

  // Save processed data
  await saveToJson(processedUsers, "processed_users.json", "./data/processed");
  console.log("Processed users saved");
}

// Example 10: Batch export with custom logic
async function customBatchExport() {
  const collections = await getAllCollections();

  for (const collectionName of collections) {
    console.log(`Processing ${collectionName}...`);

    const data = await getCollectionData(collectionName);

    // Add custom logic here
    // For example, filter out deleted items
    const activeData = data.filter((item) => !item.deleted);

    await saveToJson(
      activeData,
      `${collectionName}_active.json`,
      "./data/custom"
    );
  }

  console.log("Custom batch export completed");
}

// Example 11: Complex query with multiple conditions
async function getFilteredData() {
  const data = await queryCollection("orders", [
    { field: "status", operator: "==", value: "completed" },
    { field: "total", operator: ">", value: 100 },
    { field: "createdAt", operator: ">=", value: new Date("2024-01-01") },
  ]);

  console.log(`Found ${data.length} matching orders`);
  return data;
}

// Example 12: Export with metadata
async function exportWithMetadata() {
  const collections = await getAllCollections();
  const data = await getCollectionData("users");

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalCollections: collections.length,
      collections: collections,
      recordCount: data.length,
    },
    data: data,
  };

  await saveToJson(exportData, "users_with_metadata.json", "./data/exports");
  console.log("Export with metadata completed");
}

// Run examples (uncomment the ones you want to test)
async function runExamples() {
  try {
    // Uncomment the examples you want to run:

    // await listAllCollections();
    // await getAllUsers();
    // await getActiveUsers();
    // await getRecentPosts();
    // await getUserPosts("user123");
    // await exportUsersToJson();
    // await exportUsersWithSubcollections();
    // await exportEverything();
    // await processAndExportUsers();
    // await customBatchExport();
    // await getFilteredData();
    // await exportWithMetadata();

    console.log("Examples completed!");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Uncomment to run:
// runExamples();

// Export functions for use in other files
export {
  listAllCollections,
  getAllUsers,
  getActiveUsers,
  getRecentPosts,
  getUserPosts,
  exportUsersToJson,
  exportUsersWithSubcollections,
  exportEverything,
  processAndExportUsers,
  customBatchExport,
  getFilteredData,
  exportWithMetadata,
};

