const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const CATEGORIES = ["Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing Pools", "Camping", "Farms", "Arctic", "Beach", "Historic"];

module.exports.index = async (req, res) => {

    const { filterListings, search } = req.query;
    let filter = {};
    let isFiltered = false;

    if (CATEGORIES.includes(filterListings)) {
        filter.category = filterListings;
        isFiltered = true;
    } 

    let allListings = await Listing.find(filter);

    if ((typeof search === "string") && (search.trim() !== "")) {
        isFiltered = true;
        const text = search.trim().toLowerCase();

        allListings = allListings.filter((listing) => {
        return listing.title.toLowerCase().includes(text)
            || listing.location.toLowerCase().includes(text)
            || listing.country.toLowerCase().includes(text)
    });
    }

    if (allListings.length === 0 && isFiltered) {
        req.flash("error", "No listings found!");
        return res.redirect("/listings");
    }

    res.render("listings/index.ejs", { allListings, selectedCategory: filter.category });
}


module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
}


module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews", populate: {path: "author"}}).populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    console.log(listing);
    res.render("listings/show.ejs", { listing });
}


module.exports.createListing = async (req, res, next) => {
    if (!req.file) {
        throw new ExpressError(400, "Listing image is required!");
    }

    let response = await geocodingClient.forwardGeocode({
        query: `${req.body.listing.location}, ${req.body.listing.country}`,
        limit: 1
        })
        .send()

    if (!response.body.features[0]) {
        throw new ExpressError(404, "Location not found, enter a valid location!");
    }    
  

    let url = req.file.path;
    let filename = req.file.filename;
    
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    newListing.image = {url, filename};

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}


module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
   res.render("listings/edit.ejs", { listing, originalImageUrl }); 
}


module.exports.updateListing = async (req, res) => {
    
    let { id } = req.params;
    let listing = await Listing.findById(id);

    let updatedListing = {...req.body.listing};

    const locationChanged = 
        (req.body.listing.location !== listing.location) || (req.body.listing.country !== listing.country);

    if (locationChanged) {
        let response = await geocodingClient.forwardGeocode({
        query: `${req.body.listing.location}, ${req.body.listing.country}`,
        limit: 1
        })
        .send()

        if (!response.body.features[0]) {
            throw new ExpressError(404, "Location not found, enter a valid location!");
        }

        updatedListing.geometry = response.body.features[0].geometry;
    }    
 
    

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        updatedListing.image = { url, filename };
    }

    


    await Listing.findByIdAndUpdate(id, updatedListing);

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}


module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);

    req.flash("success", "Listing Deleted!");
    res.redirect("/listings")
}