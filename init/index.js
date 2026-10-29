if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}


const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
  await mongoose.connect(MONGO_URL);
}



const initDB = async() => {
    let finalData = [];

    for (let obj of initData.data) {

        let response = await geocodingClient.forwardGeocode({
                query: `${obj.location}, ${obj.country}`,
                limit: 1
                })
                .send()

        if (!response.body.features[0]) {
            console.log("Location is not defined for", obj.title);
            continue;
        }      
        
        finalData.push({
            ...obj,
            owner: "6ac375bda927014dc6b4c847",
            geometry: response.body.features[0].geometry,
        })
    }

    await Listing.deleteMany({});
    await Listing.insertMany(finalData);
    console.log("data was initialized");
}

initDB().catch((err) => {
    console.log(err);
});
