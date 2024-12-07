const { CosmosClient } = require('@azure/cosmos');

// Replace with your Cosmos DB endpoint and key
const endpoint = "your-cosmohttps://mymediadatabase123.documents.azure.com:443/sdb-endpoint";
const key = "your-6Byfep9u5k65ciBGAysUuTWXaoL5kPeckHjjXa2HsJROFA4m1pYVWh24DzhNqymAGu8Wg0tcd82ZACDb81cCTQ==cosmosdb-key";
const client = new CosmosClient({ endpoint, key });

const databaseId = 'MediaDB';  // Replace with your actual database ID
const containerId = 'Mediacontainer';  // Replace with your actual container ID

async function migrateData() {
  // Get reference to the database and container
  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Fetch items from the container
  const { resources: items } = await container.items.query('SELECT * FROM c').fetchAll();

  // Insert items into the new container (if you had one, as per your earlier context)
  for (const item of items) {
    await container.items.create(item);
  }
  console.log("Data migration complete.");
}

migrateData().catch(console.error);
