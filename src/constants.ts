export const APP_LOGO_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z'/%3E%3Cpath d='M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'/%3E%3C/svg%3E";

export const FPO_NAMES = [
  "Green Earth Farmers",
  "Sustainable Soil Collective",
  "Organic Roots FPO",
  "EcoHarvest Alliance",
  "Nature's Bounty FPO",
  "Kisan Vikas FPO",
  "AgriTech Pioneers",
  "Bharat Agri Collective",
  "Vedic Farming Group",
  "Other (Manual Input)"
];

export const CROP_TYPES = [
  "Wheat",
  "Rice",
  "Maize",
  "Sugarcane",
  "Cotton",
  "Soybean",
  "Pulses",
  "Millets",
  "Sorghum (Jowar)",
  "Barley",
  "Groundnut",
  "Sunflower",
  "Mustard",
  "Vegetables (Mixed)",
  "Fruit Orchard",
  "Other"
];

export const CROP_METHODS = [
  "No-Till Farming",
  "Conservation Tillage",
  "Cover Cropping",
  "Agroforestry",
  "Organic Farming",
  "Regenerative Agriculture",
  "Crop Rotation",
  "Intercropping",
  "Precision Agriculture",
  "Hydroponics",
  "Traditional Farming"
];

export const PROJECT_STATUSES = {
  active: { label: "Active", color: "bg-blue-500" },
  under_observation: { label: "Under Observation", color: "bg-yellow-500" },
  validated: { label: "Validated", color: "bg-green-500" },
  rejected: { label: "Rejected", color: "bg-red-500" }
};

export const CARBON_CREDIT_PRICE_PER_TON_INR = 1500; // Example price
export const CARBON_SEQUESTRATION_RATE_PER_HECTARE = 2.5; // Example rate in tons/year

export const CREDIT_IMPROVEMENT_SUGGESTIONS = [
  {
    title: "Implement No-Till Farming",
    description: "Reducing soil disturbance helps keep carbon trapped in the soil.",
    impact: "High",
    difficulty: "Medium"
  },
  {
    title: "Introduce Cover Crops",
    description: "Planting cover crops during off-seasons increases biomass and soil health.",
    impact: "High",
    difficulty: "Easy"
  },
  {
    title: "Agroforestry Integration",
    description: "Planting trees alongside crops significantly boosts carbon sequestration.",
    impact: "Very High",
    difficulty: "Hard"
  },
  {
    title: "Optimize Fertilizer Use",
    description: "Precision application of organic fertilizers reduces nitrous oxide emissions.",
    impact: "Medium",
    difficulty: "Medium"
  }
];
