export type UserRole = 'admin' | 'farmer' | 'buyer';

export interface FarmerDetails {
  id: string;
  name: string;
  cropType: string;
  location: {
    lat: number;
    lng: number;
    boundaries: { lat: number; lng: number }[];
    center: { lat: number; lng: number };
  };
  cropMethod: string;
  aadharId: string;
  landDocUrl: string;
  fpoName: string;
  soilTestReportUrl?: string;
  status: 'active' | 'under_observation' | 'validated' | 'rejected';
  createdAt: number;
  userId: string;
}

export interface CarbonCreditProject extends FarmerDetails {
  ndviScore: number;
  satelliteImageUrl: string;
  farmArea: number; // in hectares
  socPercentage?: number;
  carbonCreditsEstimated: number;
  incomeEstimatedInr: number;
  projectCondition: 'good' | 'best' | 'average';
  pddUrl?: string;
  isPublished: boolean;
}

export interface Transaction {
  id: string;
  projectId: string;
  buyerId: string;
  creditsBought: number;
  amountInr: number;
  timestamp: number;
  certificateUrl: string;
}
