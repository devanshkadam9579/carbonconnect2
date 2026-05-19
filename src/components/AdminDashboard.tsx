import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PROJECT_STATUSES, CARBON_CREDIT_PRICE_PER_TON_INR } from '@/src/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, CheckCircle, XCircle, FileText, TrendingUp, Download, Filter, Globe, Trash2, ShoppingBag, Clock, CheckCircle2, AlertCircle, Database, Satellite, Cpu, Calculator, ScrollText, BarChart3, Loader2, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { generatePDD } from '@/src/lib/pdfUtils';

const VALIDATION_STEPS = [
  { id: 1, icon: Database,   label: 'Fetching DB Parameters',         desc: 'Reading farmer data from Firestore' },
  { id: 2, icon: Satellite,  label: 'Satellite DB Connection',         desc: 'Connecting to ESA Copernicus / Sentinel-2' },
  { id: 3, icon: Globe,      label: 'Live Image Capture',              desc: 'Downloading satellite tiles for coordinates' },
  { id: 4, icon: Cpu,        label: 'AI Analysis Engine',              desc: 'Running vegetation & NDVI analysis' },
  { id: 5, icon: Calculator, label: 'Carbon Calculation Engine',       desc: 'IPCC Tier 2 sequestration model' },
  { id: 6, icon: ScrollText, label: 'PDD Drafting',                    desc: 'AI generating Project Design Document' },
  { id: 7, icon: BarChart3,  label: 'Final Analysis Ready',            desc: 'Compiling complete validation report' },
];

interface AdminDashboardProps {
  projects: any[];
  orders: any[];
  onValidate: (projectId: string, results: any) => void;
  onDelete: (projectId: string) => void;
  onOrderAction: (orderId: string, action: 'approved' | 'rejected') => void;
}

export default function AdminDashboard({ projects, orders, onValidate, onDelete, onOrderAction }: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'projects' | 'orders'>('projects');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Streaming validation state
  const [streamProject, setStreamProject] = useState<any>(null);
  const [streamSteps, setStreamSteps] = useState<Record<number,{status:'pending'|'running'|'done', data?:any}>>({});
  const [streamResults, setStreamResults] = useState<any>(null);
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamMsg, setStreamMsg] = useState('');
  const esRef = useRef<EventSource|null>(null);

  const filteredProjects = projects.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (p.cropType?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openStreamValidation = (project: any) => {
    // Provide a fallback location for older test data that lacks boundaries
    const fallbackProject = { ...project };
    if (!fallbackProject.location?.center) {
      fallbackProject.location = {
        ...fallbackProject.location,
        center: { lat: 20.5937, lng: 78.9629 }
      };
    }

    setStreamProject(fallbackProject);
    setStreamSteps({});
    setStreamResults(null);
    setStreamProgress(0);
    setStreamMsg('Initializing validation pipeline…');

    if (esRef.current) esRef.current.close();

    const es = new EventSource(
      `/api/validate-carbon-stream?dummy=${Date.now()}`,
    );
    // SSE requires POST — use fetch with ReadableStream instead
    es.close();
    esRef.current = null;

    // Use fetch + ReadableStream for SSE POST
    const ctrl = new AbortController();
    (esRef as any).current = { close: () => ctrl.abort() };

    fetch('/api/validate-carbon-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerData: fallbackProject }),
      signal: ctrl.signal,
    }).then(async (resp) => {
      if (!resp.ok) {
        setStreamMsg('Validation failed: ' + resp.statusText);
        toast.error('Validation failed: ' + resp.statusText);
        return;
      }
      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event:')) continue;
          if (!line.startsWith('data:')) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.progress !== undefined) setStreamProgress(payload.progress);
            if (payload.message) setStreamMsg(payload.message);
            if (payload.step) {
              setStreamSteps(prev => ({
                ...prev,
                [payload.step]: { status: payload.status, data: payload.data }
              }));
            }
            if (payload.results) {
              setStreamResults(payload.results);
            }
          } catch {}
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') toast.error('Validation stream error');
    });
  };

  const confirmStreamResults = () => {
    if (!streamProject || !streamResults) return;
    onValidate(streamProject.id, { ...streamResults, status: 'validated', isPublished: true });
    setStreamProject(null);
    setStreamResults(null);
    toast.success('Project validated and published!');
  };

  const closeStreamModal = () => {
    if ((esRef as any).current) (esRef as any).current.close();
    setStreamProject(null);
    setStreamResults(null);
    setStreamSteps({});
    setStreamProgress(0);
  };

  // Legacy inline validation (used from table button fallback)
  const runAiValidation = (project: any) => openStreamValidation(project);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  const filteredOrders = orders.filter(o => {
    return orderStatusFilter === 'all' || o.status === orderStatusFilter;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Admin Control Center</h2>
          <p className="text-sm text-gray-500">Satellite validation and credit publishing engine.</p>
        </div>
        {/* Admin Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setAdminTab('projects')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              adminTab === 'projects' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Farmer Projects
          </button>
          <button
            onClick={() => setAdminTab('orders')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all relative ${
              adminTab === 'orders' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Marketplace Orders
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingOrdersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Pending Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {projects.filter(p => p.status === 'active' || p.status === 'under_observation').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Validated Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === 'validated').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#141414]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Market Value (Est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">₹ 1.2M</div>
          </CardContent>
        </Card>
      </div>

      {adminTab === 'projects' && (
      <Card className="border-[#141414]/10">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Farmer Applications</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search farmers..." 
                className="pl-8 focus-visible:ring-green-600" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="under_observation">Under Observation</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Validation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.cropType}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {project.location?.center ? (
                      `${project.location.center.lat.toFixed(4)}, ${project.location.center.lng.toFixed(4)}`
                    ) : (
                      'No location'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES].color}>
                        {PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES].label}
                      </Badge>
                      {project.cropMethod?.toLowerCase().includes('hybrid') && (
                        <Badge variant="outline" className="text-[10px] h-4 border-blue-200 text-blue-700">Hybrid</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {validatingId === project.id ? (
                      <div className="w-full space-y-1">
                        <Progress value={progress} className="h-2" />
                        <span className="text-[10px] text-gray-400 animate-pulse">
                          {progress < 20 && "Initializing..."}
                          {progress >= 20 && progress < 45 && "Fetching Satellite Data..."}
                          {progress >= 45 && progress < 75 && "AI Carbon Analysis..."}
                          {progress >= 75 && progress < 100 && `Drafting PDD (${progress}% done)...`}
                          {progress === 100 && "Finalizing..."}
                        </span>
                      </div>
                    ) : project.status === 'validated' ? (
                      <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
                        <TrendingUp className="w-4 h-4" />
                        {project.carbonCreditsEstimated?.toFixed(2)} Credits
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => runAiValidation(project)}
                        className="text-xs h-7 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        Run AI Engine
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => setSelectedProject(project)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {project.status === 'validated' && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-blue-600"
                          onClick={async () => {
                            toast.info("Generating PDD with satellite imagery...");
                            await generatePDD(project);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {(project.status === 'active' || project.status === 'under_observation') && (
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => onValidate(project.id, { status: 'validated', isPublished: true, validatedAt: Date.now() })}
                            title="Approve & Publish"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onValidate(project.id, { status: 'rejected' })}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeletingId(project.id)}
                        title="Delete Project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      )}

      {/* ── Marketplace Orders Tab ── */}
      {adminTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-[#141414]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" /> Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#141414]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'approved').length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#141414]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" /> Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'rejected').length}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#141414]/10">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle>Marketplace Orders</CardTitle>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Filter Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No orders found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{order.buyerName || 'Unknown'}</span>
                            <span className="text-xs text-gray-400">{order.buyerEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{order.projectName}</span>
                            <span className="text-xs text-gray-400">{order.cropType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{order.creditsBought} tons</TableCell>
                        <TableCell className="font-medium text-green-700">₹{(order.amountInr || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </TableCell>
                        <TableCell>
                          {order.status === 'pending' && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Pending</Badge>
                          )}
                          {order.status === 'approved' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">✅ Approved</Badge>
                          )}
                          {order.status === 'rejected' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">❌ Rejected</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                                onClick={() => onOrderAction(order.id, 'approved')}
                              >
                                <CheckCircle className="w-3 h-3" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1"
                                onClick={() => onOrderAction(order.id, 'rejected')}
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </div>
                          )}
                          {order.status !== 'pending' && (
                            <span className="text-xs text-gray-400">
                              {order.reviewedAt ? new Date(order.reviewedAt).toLocaleDateString('en-IN') : 'Reviewed'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-2">Delete Project?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this project? This action cannot be undone and all associated data will be lost.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  onDelete(deletingId);
                  setDeletingId(null);
                }}
              >
                Delete Permanently
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Analysis Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold">{selectedProject.name}'s Farm Analysis</h3>
                <p className="text-sm text-gray-500">{selectedProject.cropType} • {selectedProject.fpoName}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
                <XCircle className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Satellite Image */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    Satellite & NDVI Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="aspect-video rounded-xl overflow-hidden border relative group">
                      <img 
                        src={selectedProject.satelliteImageUrl || selectedProject.imageUrl || (selectedProject.location?.center ? `https://static-maps.yandex.ru/1.x/?ll=${selectedProject.location.center.lng},${selectedProject.location.center.lat}&z=15&l=sat&size=600,450` : '')} 
                        alt="Satellite" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/60 text-white border-none text-[10px]">Satellite View</Badge>
                      </div>
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden border relative group bg-green-900">
                      <img 
                        src={selectedProject.ndviImageUrl || (selectedProject.location?.center ? `https://static-maps.yandex.ru/1.x/?ll=${selectedProject.location.center.lng},${selectedProject.location.center.lat}&z=15&l=skl&size=600,450` : '')} 
                        alt="NDVI Scored" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-green-500/10 pointer-events-none" />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-600 text-white border-none text-[10px]">NDVI Scored View</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border text-[10px] text-gray-500">
                    <p>Coordinates: {selectedProject.location?.center?.lat?.toFixed(6) || 'N/A'}, {selectedProject.location?.center?.lng?.toFixed(6) || 'N/A'}</p>
                    <p>Source: {selectedProject.dataSource || "Sentinel-2 L2A"}</p>
                  </div>
                </div>

                {/* NDVI Graph */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    NDVI & Soil Moisture (5-Year Historical Trend)
                  </h4>
                  <div className="h-[250px] w-full bg-gray-50 rounded-xl p-4 border">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedProject.ndviHistory || []}>
                        <defs>
                          <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="month" fontSize={8} tickLine={false} axisLine={false} interval={5} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="ndvi" stroke="#16a34a" fillOpacity={1} fill="url(#colorNdvi)" name="NDVI" />
                        <Area type="monotone" dataKey="soilMoisture" stroke="#2563eb" fillOpacity={1} fill="url(#colorSoil)" name="Soil Moisture" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-green-50/50 border-green-100">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Current NDVI</p>
                    <p className="text-xl font-bold text-green-700">{selectedProject.ndviScore?.toFixed(2) || '0.65'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Soil Moisture</p>
                    <p className="text-xl font-bold text-blue-700">{selectedProject.soilMoisture?.toFixed(2) || '0.42'}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50/50 border-orange-100">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Biomass Density</p>
                    <p className="text-xl font-bold text-orange-700">{selectedProject.biomassDensity?.toFixed(0) || '145'} kg/m²</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50/50 border-purple-100">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Farm Area</p>
                    <p className="text-xl font-bold text-purple-700">{selectedProject.area?.toFixed(1) || '2.5'} Ha</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  PDD Draft Preview
                </h4>
                <div className="bg-gray-50 rounded-xl p-6 border text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-mono">
                  {selectedProject.pddDraft || "No PDD draft available. Run AI validation to generate."}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedProject(null)}>Close</Button>
                {(selectedProject.status === 'active' || selectedProject.status === 'under_observation') && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        onValidate(selectedProject.id, { 
                          status: 'validated', 
                          isPublished: true, 
                          validatedAt: Date.now(),
                          carbonCreditsEstimated: selectedProject.carbonCreditsEstimated || (selectedProject.area || 2.5) * 5.2
                        });
                        setSelectedProject(null);
                        toast.success("Project manually approved and published!");
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve & Publish
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        runAiValidation(selectedProject);
                        setSelectedProject(null);
                      }}
                    >
                      Run AI Validation
                    </Button>
                  </>
                )}
                {selectedProject.status === 'validated' && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={async () => {
                      toast.info("Generating PDD with satellite imagery...");
                      await generatePDD(selectedProject);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PDD
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Streaming Validation Modal ── */}
      <AnimatePresence>
      {streamProject && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="flex flex-col w-full h-full"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-8 py-5 flex items-center justify-between z-10 shadow-md flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Validation Pipeline</h3>
                  <p className="text-green-100 text-sm">{streamProject.name} · {streamProject.cropType}</p>
                </div>
              </div>
              <button onClick={closeStreamModal} className="text-white/70 hover:text-white transition-colors p-2 bg-black/10 rounded-full hover:bg-black/20">
                <XCircle className="w-7 h-7" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 lg:p-10 space-y-10">
              
              {/* Master progress bar */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border max-w-7xl mx-auto space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700 text-base">{streamMsg}</span>
                  <span className="font-bold text-green-700 text-lg">{streamProgress}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full relative"
                    animate={{ width: `${streamProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.5 }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </motion.div>
                </div>
              </div>

              {/* Step-by-step Wrapping Grid */}
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {VALIDATION_STEPS.map((step, idx) => {
                    const s = streamSteps[step.id];
                    const status = s?.status || 'pending';
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0.4, scale: 0.95 }}
                        animate={{ opacity: status === 'pending' ? 0.45 : 1, scale: status === 'running' ? 1.02 : 1 }}
                        className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${
                          status === 'running' ? 'border-green-400 bg-green-50 shadow-lg ring-2 ring-green-100' :
                          status === 'done'    ? 'border-green-200 bg-white shadow-sm' :
                          'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                            status === 'running' ? 'bg-green-600 text-white shadow-md' :
                            status === 'done'    ? 'bg-green-100 text-green-700' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                             status === 'done'    ? <CheckCircle2 className="w-6 h-6" /> :
                             <Icon className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className={`text-base font-bold leading-tight ${status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</p>
                            {status === 'running' && <p className="text-xs text-green-600 font-bold uppercase mt-1 animate-pulse">Running…</p>}
                            {status === 'done' && <p className="text-xs text-green-600 font-bold uppercase mt-1">✓ Completed</p>}
                          </div>
                        </div>

                        <p className="text-sm text-gray-500">{step.desc}</p>
                        
                        {status === 'done' && s?.data && (
                          <div className="mt-auto pt-2 flex flex-wrap gap-2">
                            {Object.entries(s.data).filter(([k]) => !k.includes('Url')).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="text-xs bg-gray-50 border border-gray-100 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm">
                                <span className="text-gray-400 mr-1">{k}:</span>
                                <strong className="font-bold text-gray-900">{String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Results panel — shown after completion */}
              {streamResults && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 bg-white p-8 rounded-3xl shadow-xl border">
                  <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b pb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" /> Validation Complete — Full Analysis Report
                  </h4>

                  {/* Satellite images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-bold uppercase text-gray-500 tracking-wider">Satellite View</p>
                      <div className="aspect-video rounded-2xl overflow-hidden border-2 shadow-sm">
                        <img src={streamResults.satelliteImageUrl} alt="Satellite" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold uppercase text-gray-500 tracking-wider">NDVI / Terrain View</p>
                      <div className="aspect-video rounded-2xl overflow-hidden border-2 shadow-sm bg-gray-100 relative">
                        <img 
                          src={streamResults.ndviImageUrl} 
                          alt="NDVI" 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = streamResults.satelliteImageUrl || '';
                            e.currentTarget.style.filter = 'hue-rotate(90deg) saturate(200%) contrast(150%) brightness(90%)';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Key metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'NDVI Score', value: streamResults.ndviScore?.toFixed(4), color: 'green' },
                      { label: 'Farm Area', value: `${streamResults.area?.toFixed(2)} Ha`, color: 'purple' },
                      { label: 'Soil Moisture', value: `${(streamResults.soilMoisture * 100).toFixed(1)}%`, color: 'blue' },
                      { label: 'Biomass Density', value: `${streamResults.biomassDensity?.toFixed(0)} kg/m²`, color: 'orange' },
                      { label: 'Carbon Density', value: `${streamResults.carbonDensity} tC/ha`, color: 'green' },
                      { label: 'Eligible Credits', value: `${streamResults.eligibleCredits?.toFixed(2)} tCO2e`, color: 'emerald' },
                      { label: 'Income (Est.)', value: `₹${streamResults.incomeEstimatedInr?.toLocaleString('en-IN', {maximumFractionDigits:0})}`, color: 'yellow' },
                      { label: 'AI Safety Score', value: `${streamResults.aiSafetyScore?.toFixed(1)}%`, color: 'blue' },
                    ].map(m => (
                      <Card key={m.label} className={`bg-${m.color}-50/60 border-${m.color}-100 shadow-none`}>
                        <CardContent className="p-5">
                          <p className="text-xs uppercase text-gray-500 font-bold mb-1 tracking-wider">{m.label}</p>
                          <p className={`text-2xl font-black text-${m.color}-700`}>{m.value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Carbon methodology breakdown & Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-2xl border p-6 space-y-4">
                      <p className="text-base font-bold text-gray-900 border-b pb-2">Carbon Methodology (VCS VM0042 / IPCC Tier 2)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {[
                          ['Above-Ground Biomass', `${streamResults.aboveGroundBiomass?.toFixed(3)} tC`],
                          ['Below-Ground Biomass', `${streamResults.belowGroundBiomass?.toFixed(3)} tC`],
                          ['Soil Organic Carbon', `${streamResults.soilOrganicCarbon?.toFixed(3)} tC`],
                          ['Baseline Emissions', `${streamResults.baselineEmissions?.toFixed(3)} tCO2e`],
                          ['Leakage Deduction', `${streamResults.leakage?.toFixed(3)} tCO2e`],
                          ['Risk Buffer Pool', `${streamResults.riskBuffer?.toFixed(3)} tCO2e`],
                          ['Net Sequestration', `${streamResults.netSequestration?.toFixed(3)} tCO2e`],
                          ['CO2e / Hectare', `${streamResults.co2ePerHectare?.toFixed(3)} tCO2e/ha`],
                          ['Permanence Period', `${streamResults.permanence} years`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-500">{k}</span>
                            <span className="font-bold text-gray-900">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NDVI History chart */}
                    {streamResults.ndviHistory?.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-base font-bold text-gray-900">5-Year NDVI & Soil Moisture Trend</p>
                        <div className="h-64 bg-gray-50 rounded-2xl p-4 border w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={streamResults.ndviHistory}>
                              <defs>
                                <linearGradient id="sNdvi" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="sSoil" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} interval={11} />
                              <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0,1]} />
                              <Tooltip />
                              <Area type="monotone" dataKey="ndvi" stroke="#16a34a" strokeWidth={2} fill="url(#sNdvi)" name="NDVI" />
                              <Area type="monotone" dataKey="soilMoisture" stroke="#2563eb" strokeWidth={2} fill="url(#sSoil)" name="Soil Moisture" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PDD Preview */}
                  <div className="space-y-3">
                    <p className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600"/> AI-Generated Project Design Document (PDD)
                    </p>
                    <div className="bg-gray-50 border-2 rounded-2xl p-6 text-sm text-gray-800 leading-relaxed max-h-64 overflow-y-auto font-mono whitespace-pre-wrap shadow-inner">
                      {streamResults.pddDraft}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-4 pt-6 border-t">
                    <Button variant="outline" size="lg" className="px-8 text-base" onClick={closeStreamModal}>Cancel</Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 px-8 text-base"
                      onClick={async () => { toast.info('Generating PDD…'); await generatePDD({ ...streamProject, ...streamResults }); }}
                    >
                      <Download className="w-5 h-5 mr-2" /> Download PDD
                    </Button>
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8 text-base shadow-lg shadow-green-200"
                      onClick={confirmStreamResults}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" /> Approve & Publish
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Still running — show spinner if no results yet */}
              {!streamResults && streamProgress < 100 && (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin text-green-500" />
                  <span className="text-lg font-medium text-gray-500">Validation pipeline running… please wait</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
