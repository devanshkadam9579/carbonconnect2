/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import FarmerOnboarding from './components/FarmerOnboarding';
import AdminDashboard from './components/AdminDashboard';
import Marketplace from './components/Marketplace';
import FarmerDashboard from './components/FarmerDashboard';
import { FarmerDetails, CarbonCreditProject, UserRole } from './types';
import { toast } from 'sonner';
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';

import { uploadFile } from './lib/storageUtils';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'dashboard'>('dashboard');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as UserRole);
          } else {
            // Fallback for existing users without role doc
            setRole('buyer'); 
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setRole(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Listener — projects
  useEffect(() => {
    if (!isAuthReady || !user || !auth.currentUser) {
      setProjects([]);
      return;
    }

    const path = 'farmers';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Firestore Real-time Listener — orders (admin sees all; others see own)
  useEffect(() => {
    if (!isAuthReady || !user || !auth.currentUser) {
      setOrders([]);
      return;
    }

    const ordersCol = collection(db, 'orders');
    const q = role === 'admin'
      ? ordersCol
      : query(ordersCol, where('buyerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [isAuthReady, user, role]);

  const handleLogin = async (selectedRole: UserRole) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogle();
      if (!result) return;
      
      const user = result.user;
      
      // Save role to Firestore if not exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: selectedRole,
          createdAt: Date.now()
        });
      }
      
      setRole(selectedRole);
      toast.success(`Logged in as ${selectedRole}`);
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    toast.success("Logged out");
  };

  const handleFarmerSubmit = async (data: any) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    
    const path = 'farmers';
    try {
      let landDocUrl = data.landDoc;
      let soilReportUrl = data.soilReport;

      // Parallelize uploads for speed
      const uploadPromises = [];
      
      if (data.landDoc instanceof File) {
        uploadPromises.push(
          uploadFile(data.landDoc, `farmers/${user.uid}/landDocs`).then(url => {
            landDocUrl = url;
          })
        );
      }

      if (data.soilReport instanceof File) {
        uploadPromises.push(
          uploadFile(data.soilReport, `farmers/${user.uid}/soilReports`).then(url => {
            soilReportUrl = url;
          })
        );
      }

      if (uploadPromises.length > 0) {
        toast.info("Uploading documents...");
        await Promise.all(uploadPromises);
      }

      const newProject = {
        ...data,
        landDoc: landDocUrl,
        soilReport: soilReportUrl,
        userId: user.uid,
        status: 'under_observation',
        createdAt: Date.now(),
        isPublished: false
      };
      
      await addDoc(collection(db, path), newProject);
      toast.success("Application submitted successfully! AI validation initiated.");
      setActiveTab('dashboard');
    } catch (error: any) {
      console.error("Submission Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a JSON error from handleFirestoreError
      try {
        const parsedError = JSON.parse(errorMessage);
        toast.error(`Submission failed: ${parsedError.error}`);
      } catch {
        toast.error(`Submission failed: ${errorMessage}`);
      }
      
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminValidate = async (projectId: string, results: any) => {
    const path = `farmers/${projectId}`;
    try {
      const projectRef = doc(db, 'farmers', projectId);
      const isRejected = results.status === 'rejected';
      
      await updateDoc(projectRef, {
        ...results,
        status: isRejected ? 'rejected' : 'validated',
        isPublished: !isRejected
      });
      
      if (isRejected) {
        toast.error("Project application rejected.");
      } else {
        toast.success("Project validated and published!");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const path = `farmers/${projectId}`;
    try {
      await deleteDoc(doc(db, 'farmers', projectId));
      toast.success("Project deleted successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handlePurchase = async (projectId: string, amount: number, buyerInfo?: { name: string; email: string }) => {
    if (!user) return;
    try {
      // Deduct credits optimistically
      const projectRef = doc(db, 'farmers', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const project = projectSnap.data();
        const currentCredits = project.carbonCreditsEstimated || 0;
        await updateDoc(projectRef, { carbonCreditsEstimated: currentCredits - amount });

        // Save order with pending status for admin to confirm
        await addDoc(collection(db, 'orders'), {
          projectId,
          projectName: project.name || 'Unknown Project',
          cropType: project.cropType || '',
          buyerId: user.uid,
          buyerEmail: buyerInfo?.email || user.email || '',
          buyerName: buyerInfo?.name || user.displayName || user.email || 'Buyer',
          creditsBought: amount,
          amountInr: amount * 1500,
          status: 'pending',
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `farmers/${projectId}`);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'approved' | 'rejected') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const order = orderSnap.data();

      if (action === 'rejected') {
        // Refund credits back to project
        const projectRef = doc(db, 'farmers', order.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const currentCredits = projectSnap.data().carbonCreditsEstimated || 0;
          await updateDoc(projectRef, { carbonCreditsEstimated: currentCredits + order.creditsBought });
        }
      }

      await updateDoc(orderRef, {
        status: action,
        reviewedAt: Date.now()
      });

      toast.success(action === 'approved' ? '✅ Order confirmed!' : '❌ Order rejected & credits refunded.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — full-screen landing page (no Layout wrapper)
  if (!user || !role) {
    return (
      <ErrorBoundary>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <LandingPage onSelectRole={handleLogin} isLoading={isLoggingIn} />
        </motion.div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout
        role={role}
        onLogout={handleLogout}
        activeTab={role === 'farmer' ? activeTab : undefined}
        onTabChange={role === 'farmer' ? (tab: any) => setActiveTab(tab) : undefined}
      >
        {role === 'farmer' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-3xl font-bold tracking-tight">Farmer Portal</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'dashboard' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('onboarding')}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'onboarding' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  New Application
                </button>
              </div>
            </div>

            {activeTab === 'dashboard' ? (
              <FarmerDashboard projects={projects} userId={user.uid} onLogout={handleLogout} />
            ) : (
            <FarmerOnboarding 
              onSubmit={handleFarmerSubmit} 
              isSubmitting={isSubmitting} 
              onCancel={() => setActiveTab('dashboard')} 
            />
            )}
          </motion.div>
        ) : role === 'admin' ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Admin Console</h2>
            <AdminDashboard
              projects={projects}
              orders={orders}
              onValidate={handleAdminValidate}
              onDelete={handleDeleteProject}
              onOrderAction={handleOrderAction}
            />
          </div>
        ) : (
          <Marketplace projects={projects} onBuy={handlePurchase} user={user} />
        )}
      </Layout>
    </ErrorBoundary>
  );
}

