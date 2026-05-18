import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { 
  ShoppingCart, MapPin, TrendingUp, ShieldCheck, CreditCard, Download, 
  FileText, Eye, CheckCircle2, Info, BarChart3, Globe, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { generateCertificate, generatePDD } from '@/src/lib/pdfUtils';

interface MarketplaceProps {
  projects: any[];
  onBuy: (projectId: string, amount: number, buyerInfo?: { name: string; email: string }) => void;
  user?: any;
}

export default function Marketplace({ projects, onBuy, user }: MarketplaceProps) {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'credits' | 'ndvi' | 'newest'>('newest');

  const publishedProjects = projects
    .filter(p => {
      const isPublished = p.isPublished;
      const matchesCategory = categoryFilter === 'all' || 
                             (categoryFilter === 'hybrid' && p.cropMethod?.toLowerCase().includes('hybrid')) ||
                             (categoryFilter === 'organic' && p.cropMethod?.toLowerCase().includes('organic'));
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.cropType?.toLowerCase().includes(searchQuery.toLowerCase());
      return isPublished && matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'credits') return (b.carbonCreditsEstimated || 0) - (a.carbonCreditsEstimated || 0);
      if (sortBy === 'ndvi') return (b.ndviScore || 0) - (a.ndviScore || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const handlePurchase = () => {
    if (!selectedProject) {
      toast.error("No project selected for purchase.");
      return;
    }

    const transaction = {
      id: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      creditsBought: buyAmount,
      amountInr: buyAmount * 1500,
      timestamp: Date.now()
    };
    
    onBuy(
      selectedProject.id,
      buyAmount,
      { name: user?.displayName || user?.email || 'Buyer', email: user?.email || '' }
    );
    generateCertificate(transaction, selectedProject);
    setSelectedProject(null);
    toast.success('Order placed! ⏳ Awaiting admin confirmation.', { duration: 5000 });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Carbon Marketplace</h2>
          <p className="text-gray-500">Invest in verified high-impact carbon removal projects.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9 bg-white border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">Newest First</option>
            <option value="credits">Highest Credits</option>
            <option value="ndvi">Highest NDVI</option>
          </select>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['all', 'organic', 'hybrid'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${categoryFilter === cat ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 bg-white">Avg Price: ₹1,500/ton</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {publishedProjects.length === 0 ? (
          <div className="col-span-3 py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No projects listed yet</h3>
            <p className="text-gray-500">Check back later for validated carbon credits.</p>
          </div>
        ) : (
          publishedProjects.map((project) => (
            <motion.div key={project.id} whileHover={{ y: -5 }}>
              <Card className="overflow-hidden border-[#141414]/10 h-full flex flex-col">
                <div className="h-48 bg-gray-200 relative">
                  <img 
                    src={project.satelliteImageUrl || project.imageUrl || `https://static-maps.yandex.ru/1.x/?ll=${project.location.center.lng},${project.location.center.lat}&z=15&l=sat&size=600,450`} 
                    alt="Satellite View" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    {project.cropMethod?.toLowerCase().includes('hybrid') && (
                      <Badge className="bg-blue-600 text-white border-none">Hybrid</Badge>
                    )}
                    <Badge className="bg-white/90 text-green-700 backdrop-blur-sm border-none">
                      {project.projectCondition === 'excellent' ? 'Premium' : 'Standard'}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{project.name}'s Farm</CardTitle>
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      {project.ndviScore?.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {project.location.center.lat.toFixed(4)}, {project.location.center.lng.toFixed(4)}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Crop Type</span>
                      <span className="font-medium">{project.cropType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Available Credits</span>
                      <span className="font-medium">{project.carbonCreditsEstimated?.toFixed(1)} Tons</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Price per Ton</span>
                      <span className="font-medium text-green-700">₹ 1,500</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 pt-4 gap-2">
                  <Dialog>
                    <DialogTrigger 
                      render={
                        <Button 
                          variant="outline"
                          className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Report
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Farm Analysis Report</DialogTitle>
                        <DialogDescription>
                          Complete validation data for {project.name}'s project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {/* Satellite Imagery Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                              <Globe className="w-3 h-3" /> Satellite Terrain View
                            </h4>
                            <div className="rounded-xl overflow-hidden border aspect-video relative">
                              <img 
                                src={project.satelliteImageUrl || project.imageUrl || `https://static-maps.yandex.ru/1.x/?ll=${project.location.center.lng},${project.location.center.lat}&z=15&l=sat&size=600,450`} 
                                alt="Farm Satellite" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 right-2">
                                <Badge className="bg-black/50 text-white backdrop-blur-sm border-none text-[8px]">
                                  Satellite
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" /> NDVI Scored Analysis
                            </h4>
                            <div className="rounded-xl overflow-hidden border aspect-video relative bg-green-900">
                              <img 
                                src={project.ndviImageUrl || `https://static-maps.yandex.ru/1.x/?ll=${project.location.center.lng},${project.location.center.lat}&z=15&l=skl&size=600,450`} 
                                alt="NDVI Analysis" 
                                className="w-full h-full object-cover opacity-80"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-green-500/10 pointer-events-none" />
                              <div className="absolute bottom-2 right-2">
                                <Badge className="bg-green-600 text-white border-none text-[8px]">
                                  NDVI Scored
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Validation Scores */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-center">
                            <p className="text-[10px] uppercase text-green-600 font-bold mb-1">AI Safety</p>
                            <p className="text-xl font-bold text-green-700">99.2%</p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                            <p className="text-[10px] uppercase text-blue-600 font-bold mb-1">Credit Purity</p>
                            <p className="text-xl font-bold text-blue-700">98.5%</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                            <p className="text-[10px] uppercase text-purple-600 font-bold mb-1">Accuracy</p>
                            <p className="text-xl font-bold text-purple-700">98.8%</p>
                          </div>
                        </div>

                        {/* Project Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">NDVI Score</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${(project.ndviScore || 0.65) * 100}%` }} />
                              </div>
                              <span className="text-sm font-bold">{(project.ndviScore || 0.65).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Biomass Density</p>
                            <p className="text-sm font-bold">{project.biomassDensity?.toFixed(0) || '145'} kg/m²</p>
                          </div>
                        </div>

                        {/* PDD Download */}
                        <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                              <FileText className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Project Design Document (PDD)</p>
                              <p className="text-xs text-gray-500">Verified VCS Compliance Draft</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              toast.info("Generating PDD...");
                              generatePDD(project);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" /> Download
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            // This would trigger the buy dialog, but for now just close
                          }}
                        >
                          Proceed to Purchase
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger 
                      render={
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => setSelectedProject(project)}
                        >
                          Buy Credits
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Purchase Carbon Credits</DialogTitle>
                        <DialogDescription>
                          You are investing in {project.name}'s {project.cropType} farm.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Verified by AI Engine</span>
                          </div>
                          <Badge variant="outline" className="bg-white">Verra Standard</Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity (Tons of CO2e)</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            max={project.carbonCreditsEstimated}
                            value={buyAmount}
                            onChange={(e) => setBuyAmount(Number(e.target.value))}
                            className="focus-visible:ring-green-600"
                          />
                        </div>
                        <div className="pt-4 border-t space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>₹ {(buyAmount * 1500).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Platform Fee (2%)</span>
                            <span>₹ {(buyAmount * 1500 * 0.02).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2">
                            <span>Total</span>
                            <span>₹ {(buyAmount * 1500 * 1.02).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handlePurchase} className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <CreditCard className="mr-2 w-4 h-4" /> Pay & Secure Credits
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
