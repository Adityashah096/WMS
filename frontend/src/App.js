import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import Inventory from "./pages/Inventory";
import Logs from "./pages/Logs";
import RequestForm from "./pages/RequestForm";
import RequestData from "./pages/RequestData";
import RequestCenter from "./pages/RequestCenter";
import RequestCenterTakshashela from "./pages/RequestCenter_Takshashela";
import RequestCenterRepairBhiwandi from "./pages/RequestCenter_RepairBhiwandi";
import RequestCenterPalaiPlaza from "./pages/RequestCenter_PalaiPlaza";
import Login from "./pages/Login";
import Warehouses from "./pages/Warehouses";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import DemoSample from "./pages/DemoSample";
import Navbar from "./components/Navbar";
import { isAdmin, isLoggedIn, getStoredUser } from "./utils/auth";

// location_id → request-center route slug mapping
const LOCATION_ROUTE_MAP = {
  1: "/request-center",
  2: "/request-center/palai-plaza",
  3: "/request-center/repair-bhiwandi",
  4: "/request-center/takshashela",
};

function ProtectedRoute({ children, requireAdmin = false }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function LocationProtectedRoute({ children, allowedRoute }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (isAdmin()) return children;
  const { locationId } = getStoredUser();
  const userRoute = LOCATION_ROUTE_MAP[Number(locationId)];
  if (userRoute === allowedRoute) return children;
  return <Navigate to={userRoute || "/"} replace />;
}

function PublicRoute({ children }) {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-form"
          element={
            <ProtectedRoute>
              <RequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-data"
          element={
            <ProtectedRoute>
              <RequestData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-center"
          element={
            <LocationProtectedRoute allowedRoute="/request-center">
              <RequestCenter />
            </LocationProtectedRoute>
          }
        />
        <Route
          path="/request-center/takshashela"
          element={
            <LocationProtectedRoute allowedRoute="/request-center/takshashela">
              <RequestCenterTakshashela />
            </LocationProtectedRoute>
          }
        />
        <Route
          path="/request-center/repair-bhiwandi"
          element={
            <LocationProtectedRoute allowedRoute="/request-center/repair-bhiwandi">
              <RequestCenterRepairBhiwandi />
            </LocationProtectedRoute>
          }
        />
        <Route
          path="/request-center/palai-plaza"
          element={
            <LocationProtectedRoute allowedRoute="/request-center/palai-plaza">
              <RequestCenterPalaiPlaza />
            </LocationProtectedRoute>
          }
        />
        <Route
          path="/warehouses"
          element={
            <ProtectedRoute requireAdmin>
              <Warehouses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouses/demo-sample"
          element={
            <ProtectedRoute>
              <DemoSample />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouses/:warehouseSlug"
          element={
            <ProtectedRoute requireAdmin>
              <WarehouseDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn() ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;