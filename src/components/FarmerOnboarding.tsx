import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FPO_NAMES, CROP_TYPES, CROP_METHODS } from '@/src/constants';
import { Upload, MapPin, CheckCircle2, ArrowRight, ArrowLeft, Globe, Info, Phone, Mail, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { APP_LOGO_URL } from '@/src/constants';

import { analyzeLandDocument } from '@/src/lib/geminiUtils';

const TRANSLATIONS = {
  en: {
    basicInfo: 'Basic Info',
    farmMapping: 'Farm Mapping',
    documents: 'Documents',
    farmerName: 'Farmer Name',
    cropType: 'Crop Type',
    cropMethod: 'Crop Method',
    fpoName: 'FPO Name',
    phone: 'Phone Number (Optional)',
    email: 'Email (Optional)',
    next: 'Next',
    back: 'Back',
    instructions: 'Instructions',
    mapInstructions: 'Click on the map to mark the borders of your farm, or use the GPS button to capture your current location as a border point.',
    locateMe: 'Use GPS Location',
    clear: 'Clear Points',
    aadhar: 'Aadhar Card ID',
    landDoc: 'Land Document (Optional)',
    soilReport: 'Soil Test Report (Optional)',
    submit: 'Submit Application',
    analyzing: 'AI Analyzing...',
    extraction: 'AI Extraction Results:',
    centerCalculated: 'Farm center calculated for NDVI analysis',
    locationCaptured: 'Location captured!',
  },
  hi: {
    basicInfo: 'बुनियादी जानकारी',
    farmMapping: 'खेत का नक्शा',
    documents: 'दस्तावेज',
    farmerName: 'किसान का नाम',
    cropType: 'फसल का प्रकार',
    cropMethod: 'फसल पद्धति',
    fpoName: 'FPO का नाम',
    phone: 'फ़ोन नंबर (वैकल्पिक)',
    email: 'ईमेल (वैकल्पिक)',
    next: 'अगला',
    back: 'पीछे',
    instructions: 'निर्देश',
    mapInstructions: 'अपने खेत की सीमाओं को चिह्नित करने के लिए मानचित्र पर क्लिक करें, या अपने वर्तमान स्थान को सीमा बिंदु के रूप में कैप्चर करने के लिए GPS बटन का उपयोग करें।',
    locateMe: 'GPS स्थान का उपयोग करें',
    clear: 'बिंदु साफ़ करें',
    aadhar: 'आधार कार्ड आईडी',
    landDoc: 'भूमि दस्तावेज (वैकल्पिक)',
    soilReport: 'मिट्टी परीक्षण रिपोर्ट (वैकल्पिक)',
    submit: 'आवेदन जमा करें',
    analyzing: 'AI विश्लेषण कर रहा है...',
    extraction: 'AI निष्कर्षण परिणाम:',
    centerCalculated: 'NDVI विश्लेषण के लिए खेत का केंद्र निर्धारित किया गया',
    locationCaptured: 'स्थान कैप्चर किया गया!',
  }
};

interface FarmerOnboardingProps {
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export default function FarmerOnboarding({ onSubmit, isSubmitting = false }: FarmerOnboardingProps) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cropType: '',
    cropMethod: '',
    fpoName: '',
    customFpo: '',
    aadharId: '',
    phone: '',
    email: '',
    landDoc: null as File | null,
    soilReport: null as File | null,
    location: {
      boundaries: [] as { lat: number; lng: number }[],
      center: null as { lat: number; lng: number } | null,
    },
    aiAnalysis: '',
    locationCaptured: false,
    manualLat: '',
    manualLng: ''
  });

  const t = TRANSLATIONS[lang];

  const handleManualCoordinateAdd = () => {
    const lat = parseFloat(formData.manualLat);
    const lng = parseFloat(formData.manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    const newPoint = { lat, lng };
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        boundaries: [...prev.location.boundaries, newPoint]
      },
      manualLat: '',
      manualLng: '',
      locationCaptured: true
    }));
    toast.success("Coordinate added!");
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    toast.info("Capturing your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            boundaries: [...prev.location.boundaries, newPoint]
          },
          locationCaptured: true
        }));
        setMapCenter([position.coords.latitude, position.coords.longitude]);
        toast.success(t.locationCaptured);
      },
      (error) => {
        toast.error("Error capturing location: " + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = async () => {
    if (!searchQuery) return;
    toast.info("Searching location...");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        toast.success("Location found!");
      } else {
        toast.error("Location not found");
      }
    } catch (e) {
      toast.error("Error searching location");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'landDoc' | 'soilReport') => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    setFormData(prev => ({ ...prev, [type]: file }));

    if (type === 'landDoc') {
      setIsAnalyzing(true);
      toast.info("AI is analyzing your land document...");
      const analysis = await analyzeLandDocument(file);
      setFormData(prev => ({ ...prev, aiAnalysis: analysis }));
      setIsAnalyzing(false);
      toast.success("AI Analysis complete!");
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (step === 2) {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              boundaries: [...prev.location.boundaries, { lat: e.latlng.lat, lng: e.latlng.lng }]
            }
          }));
        }
      },
    });
    return null;
  };

  const calculateCenter = () => {
    if (formData.location.boundaries.length === 0) return;
    const lats = formData.location.boundaries.map(b => b.lat);
    const lngs = formData.location.boundaries.map(b => b.lng);
    const center = {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
    };
    setFormData(prev => ({ 
      ...prev, 
      location: { ...prev.location, center } 
    }));
    toast.success(t.centerCalculated);
  };

  const MapController = () => {
    const map = useMapEvents({});
    useEffect(() => {
      if (formData.location.boundaries.length > 0) {
        const lastPoint = formData.location.boundaries[formData.location.boundaries.length - 1];
        map.flyTo([lastPoint.lat, lastPoint.lng], 18);
      }
    }, [formData.location.boundaries.length, map]);
    
    useEffect(() => {
      map.flyTo(mapCenter, 15);
    }, [mapCenter, map]);
    return null;
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const progress = (step / 3) * 100;

  const handleSubmit = () => {
    // Ensure center is calculated if boundaries exist
    let finalLocation = { ...formData.location };
    if (formData.location.boundaries.length > 0 && !formData.location.center) {
      const lats = formData.location.boundaries.map(b => b.lat);
      const lngs = formData.location.boundaries.map(b => b.lng);
      finalLocation.center = {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
      };
    }
    onSubmit({ ...formData, location: finalLocation });
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col md:relative md:inset-auto md:bg-transparent md:z-0 md:max-w-6xl md:mx-auto md:px-4 md:pb-8">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-green-700">CarbonConnect</span>
        </div>
        <Select value={lang} onValueChange={(v: any) => setLang(v)}>
          <SelectTrigger className="w-20 h-7 text-[10px] border-none bg-gray-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="hi">HI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-100 sticky top-[52px] md:top-0 z-10">
        <motion.div 
          className="h-full bg-green-600" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex md:flex-row md:gap-8 md:pt-6">
        {/* Desktop Stepper (Hidden on Mobile) */}
        <div className="hidden md:block w-64 space-y-4">
          <Card className="border-[#141414]/10">
            <CardContent className="p-4 space-y-6">
              <div className="flex flex-col items-center gap-4 mb-4">
                <img src={APP_LOGO_URL} alt="CarbonConnect" className="h-12 w-auto" referrerPolicy="no-referrer" />
                <div className="flex items-center justify-between w-full">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <Select value={lang} onValueChange={(v: any) => setLang(v)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिंदी</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-8 relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100 -z-10" />
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold z-10 transition-colors ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {s}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${step >= s ? 'text-green-700' : 'text-gray-400'}`}>
                        {s === 1 ? t.basicInfo : s === 2 ? t.farmMapping : t.documents}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {s === 1 ? 'Personal & Crop' : s === 2 ? 'Boundaries' : 'Verification'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-0">
          <div className="mb-6 md:hidden">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 1 ? t.basicInfo : step === 2 ? t.farmMapping : t.documents}
            </h2>
            <p className="text-sm text-gray-500">
              {step === 1 ? 'Tell us about yourself and your crop.' : step === 2 ? 'Mark your farm boundaries on the map.' : 'Upload documents for verification.'}
            </p>
          </div>

          <Card className="border-none shadow-none md:border md:border-[#141414]/10 md:shadow-sm md:rounded-2xl">
            <CardContent className="p-0 md:p-6">
              {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.farmerName}</Label>
                      <Input 
                        placeholder="Enter full name" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="h-12 rounded-xl bg-gray-50 border-none focus-visible:ring-green-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.phone}</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                        <Input 
                          className="pl-11 h-12 rounded-xl bg-gray-50 border-none focus-visible:ring-green-600"
                          placeholder="+91 00000 00000" 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.email}</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                        <Input 
                          className="pl-11 h-12 rounded-xl bg-gray-50 border-none focus-visible:ring-green-600"
                          placeholder="farmer@example.com" 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.cropType}</Label>
                      <Select onValueChange={(v: string) => setFormData({...formData, cropType: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none focus:ring-green-600">
                          <SelectValue placeholder="Select crop" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {CROP_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.cropMethod}</Label>
                      <Select onValueChange={(v: string) => setFormData({...formData, cropMethod: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none focus:ring-green-600">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {CROP_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.fpoName}</Label>
                      <Select onValueChange={(v: string) => setFormData({...formData, fpoName: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none focus:ring-green-600">
                          <SelectValue placeholder="Select FPO" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {FPO_NAMES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{t.mapInstructions}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search village, city, or district..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="h-12 rounded-xl bg-gray-50 border-none flex-1"
                    />
                    <Button onClick={handleSearch} className="h-12 px-6 rounded-xl bg-gray-900 text-white hover:bg-black">
                      Search
                    </Button>
                  </div>

                  <div className="relative h-[50vh] md:h-[500px] rounded-2xl overflow-hidden border-2 shadow-inner">
                    <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
                      <MapEvents />
                      <MapController />
                      {formData.location.boundaries.length > 0 && (
                        <Polygon positions={formData.location.boundaries.map(b => [b.lat, b.lng])} color="#22c55e" weight={3} fillColor="#22c55e" fillOpacity={0.4} />
                      )}
                      {formData.location.boundaries.map((p, i) => (
                        <Marker key={i} position={[p.lat, p.lng]} />
                      ))}
                    </MapContainer>
                    <Button 
                      onClick={handleLocateMe}
                      className="absolute bottom-6 right-6 z-[1000] bg-white text-green-700 hover:bg-green-50 shadow-2xl rounded-full px-6 py-6 font-bold"
                    >
                      <MapPin className="w-5 h-5 mr-2" /> {t.locateMe}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm font-bold text-gray-700">
                      {formData.location.boundaries.length} boundary points marked
                    </p>
                    <Button 
                      variant="ghost" 
                      onClick={() => setFormData({...formData, location: { ...formData.location, boundaries: [] }})}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                    >
                      {t.clear}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.aadhar}</Label>
                      <Input 
                        placeholder="Enter 12-digit Aadhar" 
                        value={formData.aadharId}
                        onChange={e => setFormData({...formData, aadharId: e.target.value})}
                        className="h-12 rounded-xl bg-gray-50 border-none focus-visible:ring-green-600"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.landDoc}</Label>
                        <div className="relative border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-green-600 transition-all cursor-pointer bg-gray-50/50">
                          {isAnalyzing ? (
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-2" />
                              <span className="text-xs text-gray-500 font-medium">{t.analyzing}</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                <Upload className="w-6 h-6 text-green-600" />
                              </div>
                              <span className="text-sm font-bold text-gray-700">
                                {formData.landDoc ? formData.landDoc.name : 'Upload Land Doc'}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-1">PDF, JPG or PNG</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={e => handleFileChange(e, 'landDoc')} 
                          />
                        </div>
                        {formData.aiAnalysis && (
                          <div className="mt-2 p-4 bg-green-50/50 rounded-xl text-[11px] text-green-800 border border-green-100">
                            <span className="font-bold block mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI Extraction
                            </span>
                            {formData.aiAnalysis}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.soilReport}</Label>
                        <div className="relative border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-green-600 transition-all cursor-pointer bg-gray-50/50">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6 text-green-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">
                            {formData.soilReport ? formData.soilReport.name : 'Upload Soil Report'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1">Optional</span>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={e => handleFileChange(e, 'soilReport')} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Footer Navigation */}
      <div className="bg-white border-t p-4 flex gap-3 sticky bottom-0 z-10 md:relative md:bg-transparent md:border-none md:p-0 md:mt-8 md:justify-end">
        {step > 1 && (
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={isSubmitting} 
            className="flex-1 md:flex-none h-14 md:h-12 rounded-2xl md:px-8 border-gray-200 font-bold"
          >
            <ArrowLeft className="mr-2 w-5 h-5" /> {t.back}
          </Button>
        )}
        
        {step < 3 ? (
          <Button 
            onClick={nextStep} 
            disabled={step === 2 && formData.location.boundaries.length < 3}
            className="flex-[2] md:flex-none h-14 md:h-12 rounded-2xl md:px-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
          >
            {t.next} <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || isAnalyzing}
            className="flex-[2] md:flex-none h-14 md:h-12 rounded-2xl md:px-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </div>
            ) : (
              <>{t.submit} <CheckCircle2 className="ml-2 w-5 h-5" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
