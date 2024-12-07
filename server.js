const { BlobServiceClient } = require('@azure/storage-blob');
const express = require('express');
const multer = require('multer');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config(); // To load environment variables from a .env file

const app = express();
const port = 3000;

// Azure Blob Storage Setup
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'DefaultEndpointsProtocol=https;AccountName=mymediafilesstorage;AccountKey=fb5KK1bycRINBIFQ/s4cLoLX4o2Fgbm1qLX8b/GMA4SmtTrHrlgzoZeYl+jJqR9tenBapRF9tfJz+AStDt5cpw==;EndpointSuffix=core.windows.net'; 
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient('media-files'); // Your container name

// Azure Cosmos DB Setup
const cosmosClient = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
const database = cosmosClient.database('MediaDB');
const cosmosContainer = database.container('Mediacontainer');

// Ensure Blob container exists
async function ensureBlobContainerExists() {
  try {
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create();
      console.log('Blob container created');
    }
  } catch (error) {
    console.error('Error checking or creating Blob container:', error);
  }
}

// Ensure Cosmos DB container exists
async function ensureCosmosContainerExists() {
  try {
    const { resources } = await cosmosContainer.items.readAll().fetchAll();
    if (!resources.length) {
      console.log('Cosmos DB container exists');
    }
  } catch (error) {
    console.error('Error checking Cosmos DB container:', error);
  }
}

// Initialize the containers
ensureBlobContainerExists();
ensureCosmosContainerExists();

// Set up storage for uploaded media files (images, videos, etc.)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB (adjust as necessary)
  fileFilter: (req, file, cb) => {
    // Allow only certain file types (images, videos, etc.)
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Serve static files (HTML, CSS, JS) from the public folder
app.use(express.static('public'));

// Endpoint for uploading media to Azure Blob Storage and storing metadata in Cosmos DB
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Upload the file to Azure Blob Storage
    const blobName = req.file.originalname; // Use original file name as blob name
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(req.file.buffer, req.file.size, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    // Store metadata in Cosmos DB
    const metadata = {
      id: blobName, // Use the blob name as the ID
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      url: blockBlobClient.url, // URL of the file in Azure Blob Storage
      user: req.body.user || 'Anonymous', // Optional user info
      tags: req.body.tags || [] // Optional tags
    };

    // Insert the metadata into Cosmos DB
    await cosmosContainer.items.create(metadata);

    res.status(200).send(`File uploaded and metadata stored successfully: ${blobName}`);
  } catch (error) {
    console.error('Error uploading file or storing metadata:', error);
    res.status(500).send('Error uploading file or storing metadata.');
  }
});

// Endpoint for downloading a file from Azure Blob Storage
app.get('/download/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    const downloadResponse = await blockBlobClient.download(0);
    
    // Set response headers and pipe the file content
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
