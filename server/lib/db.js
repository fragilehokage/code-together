/**
 * MongoDB connection helper.
 * Call connectToMongoDB() once at boot; afterwards import
 * getCollection() wherever you need the documents collection.
 */

const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME, COLLECTION_NAME } = require('./config');

let mongoClient = null;
let documentsCollection = null;

async function connectToMongoDB() {
  console.log('⏳ Connecting to MongoDB...');

  mongoClient = await MongoClient.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoClient.db(DB_NAME);
  documentsCollection = db.collection(COLLECTION_NAME);
  await documentsCollection.createIndex({ room: 1 }, { unique: true });

  console.log(`✅  Connected to MongoDB  →  database: "${DB_NAME}"`);
}

function getCollection() {
  return documentsCollection;
}

async function closeConnection() {
  if (mongoClient) {
    await mongoClient.close();
  }
}

module.exports = { connectToMongoDB, getCollection, closeConnection };
