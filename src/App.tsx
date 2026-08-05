import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import LevelDetail from "./pages/LevelDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLevels from "./pages/admin/AdminLevels";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherLessons from "./pages/teacher/TeacherLessons";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
            <Route path="/levels/:levelId" element={<ProtectedRoute><LevelDetail /></ProtectedRoute>} />

            <Route path="/teacher" element={<ProtectedRoute allow={["teacher","admin"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/lessons" element={<ProtectedRoute allow={["teacher","admin"]}><TeacherLessons /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute allow={["teacher","admin"]}><TeacherClasses /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute allow={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allow={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/levels" element={<ProtectedRoute allow={["admin"]}><AdminLevels /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
