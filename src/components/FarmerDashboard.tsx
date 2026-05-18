import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PROJECT_STATUSES } from '@/src/constants';
import { 
  Leaf, Clock, CheckCircle2, AlertCircle, LogOut, TrendingUp, 
  Download, Map as MapIcon, Sparkles, ArrowUpRight, DollarSign 
} from 'lucide-react';
import { CREDIT_IMPROVEMENT_SUGGESTIONS, CARBON_CREDIT_PRICE_PER_TON_INR } from '@/src/constants';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface FarmerDashboardProps {
  projects: any[];
  userId: string;
  onLogout: () => void;
}

export default function FarmerDashboard({ projects, userId, onLogout }: FarmerDashboardProps) {
  const myProjects = projects.filter(p => p.userId === userId);
  
  const totalEarnings = myProjects.reduce((acc, p) => acc + (p.incomeEstimatedInr || 0), 0);
  const totalCredits = myProjects.reduce((acc, p) => acc + (p.carbonCreditsEstimated || 0), 0);

  const [predictionYears, setPredictionYears] = React.useState(10);

  const generatePredictionData = () => {
    const data = [];
    let cumulativeEarnings = 0;
    for (let i = 1; i <= predictionYears; i++) {
      // Assuming 3% annual growth in carbon prices
      const annualPrice = CARBON_CREDIT_PRICE_PER_TON_INR * Math.pow(1.03, i - 1);
      const annualEarnings = totalCredits * annualPrice;
      cumulativeEarnings += annualEarnings;
      data.push({
        year: `Year ${i}`,
        earnings: Math.round(cumulativeEarnings),
        annual: Math.round(annualEarnings)
      });
    }
    return data;
  };

  const predictionData = generatePredictionData();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-600 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase opacity-80">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹ {totalEarnings.toLocaleString()}</div>
            <p className="text-xs mt-2 opacity-80">From validated carbon credits</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Carbon Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalCredits.toFixed(2)} tCO2e</div>
            <p className="text-xs mt-2 text-gray-400">Estimated environmental impact</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myProjects.length}</div>
            <p className="text-xs mt-2 text-gray-400">Total farms onboarded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">My Projects</h3>
            <div className="grid grid-cols-1 gap-4">
              {myProjects.length === 0 ? (
                <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
                  <Leaf className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-gray-500">No projects found. Start by onboarding your farm!</p>
                </Card>
              ) : (
                myProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden border-[#141414]/10 hover:border-green-600 transition-all">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold">{project.cropType} Farm</h4>
                              <p className="text-sm text-gray-500">{project.fpoName}</p>
                            </div>
                            <Badge className={PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES].color}>
                              {PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES].label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Method</span>
                              <p className="text-sm font-medium">{project.cropMethod}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Credits</span>
                              <p className="text-sm font-medium text-green-600">
                                {project.carbonCreditsEstimated ? `${project.carbonCreditsEstimated.toFixed(2)} t` : 'Pending'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Earnings</span>
                              <p className="text-sm font-medium text-green-700">
                                {project.incomeEstimatedInr ? `₹ ${project.incomeEstimatedInr.toLocaleString()}` : 'Pending'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Submitted</span>
                              <p className="text-sm font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {project.status === 'validated' && (
                            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => window.open(project.satelliteImageUrl || project.imageUrl, '_blank')}>
                                <MapIcon className="w-3 h-3 mr-2" /> View Satellite
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => window.open(project.ndviImageUrl, '_blank')}>
                                <TrendingUp className="w-3 h-3 mr-2" /> View NDVI Scored
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => {
                                const link = document.createElement('a');
                                link.href = project.satelliteImageUrl || project.imageUrl;
                                link.download = `farm_satellite_${project.id}.jpg`;
                                link.click();
                              }}>
                                <Download className="w-3 h-3 mr-2" /> Download Images
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 p-6 md:w-64 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-center">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              {project.status === 'active' || project.status === 'under_observation' ? (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              ) : project.status === 'validated' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-xs font-bold">
                                {project.status === 'active' ? 'Awaiting AI Analysis' : 
                                 project.status === 'under_observation' ? 'AI Validating...' :
                                 project.status === 'validated' ? 'Project Published' : 'Action Required'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  project.status === 'active' ? 'w-1/4 bg-yellow-500' :
                                  project.status === 'under_observation' ? 'w-2/3 bg-blue-500' :
                                  project.status === 'validated' ? 'w-full bg-green-500' : 'w-full bg-red-500'
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {project.status === 'active' && "Your application is in queue for satellite analysis."}
                              {project.status === 'under_observation' && "Our AI engine is currently analyzing your farm's NDVI scores."}
                              {project.status === 'validated' && "Congratulations! Your carbon credits are live on the marketplace."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Predictive Earnings */}
          {totalCredits > 0 && (
            <Card className="border-[#141414]/10 overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Predictive Earnings Forecast
                    </CardTitle>
                    <p className="text-xs text-gray-500">Estimated cumulative income based on current credits and market growth.</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="text-xs font-bold whitespace-nowrap">{predictionYears} Years</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={predictionYears} 
                      onChange={(e) => setPredictionYears(Number(e.target.value))}
                      className="w-full md:w-32 accent-green-600"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={predictionData}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(v: any) => [`₹ ${v.toLocaleString()}`, 'Cumulative Earnings']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Area type="monotone" dataKey="earnings" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-[10px] uppercase text-green-600 font-bold mb-1">Projected Total</p>
                    <p className="text-2xl font-bold text-green-700">₹ {predictionData[predictionData.length-1].earnings.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] uppercase text-blue-600 font-bold mb-1">Avg. Annual</p>
                    <p className="text-2xl font-bold text-blue-700">₹ {Math.round(predictionData[predictionData.length-1].earnings / predictionYears).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Credit Optimization</h3>
            <div className="space-y-3">
              {CREDIT_IMPROVEMENT_SUGGESTIONS.map((suggestion, i) => (
                <Card key={i} className="border-[#141414]/10 hover:border-green-200 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold">{suggestion.title}</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{suggestion.description}</p>
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-100 text-green-700">
                            Impact: {suggestion.impact}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                            {suggestion.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <Card className="border-[#141414]/10">
              <CardContent className="p-4 space-y-4">
                {myProjects.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No recent activity</p>
                ) : (
                  myProjects.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        p.status === 'validated' ? 'bg-green-100 text-green-600' : 
                        p.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {p.status === 'validated' ? <CheckCircle2 className="w-4 h-4" /> : 
                         p.status === 'rejected' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">
                          {p.status === 'validated' ? 'Project Validated' : 
                           p.status === 'rejected' ? 'Application Rejected' : 'AI Analysis Started'}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {p.status === 'validated' ? `Your ${p.cropType} project is now public.` : 
                           p.status === 'rejected' ? 'Please check your land documents.' : 'Satellite data is being fetched.'}
                        </p>
                        <p className="text-[9px] text-gray-400 mt-1">{new Date(p.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-gray-100 flex justify-center">
        <Button 
          variant="outline" 
          onClick={onLogout} 
          className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all px-8"
        >
          <LogOut className="w-4 h-4" />
          Logout from CarbonConnect
        </Button>
      </div>
    </div>
  );
}
