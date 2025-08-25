const mongoose = require("mongoose");
const Listing = require("../models/listing");
const { data: sampleListings } = require("./data");
require("dotenv").config();

mongoose.set("strictQuery", true);

const dbUrl = process.env.ATLASDB_URL;

async function seedDB() {
  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to DB");

    await Listing.deleteMany({});
    console.log("Deleted old listings");

    const inserted = await Listing.insertMany(sampleListings);
    console.log(`Seeded ${inserted.length} listings!`);

    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (err) {
    console.log("Error:", err);
  }
}

seedDB();
