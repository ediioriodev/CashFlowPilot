"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { userService, UserProfile } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { User, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountPage() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await userService.getProfile();
      if (data) {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateProfile({ 
        first_name: firstName, 
        last_name: lastName 
      });
      toast.success("Profilo aggiornato!");
      loadProfile(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20">
        <main className="p-4 max-w-lg mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Profilo</h1>

          {loading ? (
             <div className="text-center py-10">Caricamento...</div>
          ) : (
            <>
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                        {firstName ? firstName.charAt(0).toUpperCase() : profile?.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-800">
                             {firstName} {lastName}
                        </h2>
                        <p className="text-gray-500 text-sm">{profile?.email}</p>
                    </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleUpdate} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" /> Dati Personali
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Cognome</label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex justify-center items-center"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : "Salva Modifiche"}
                    </button>
                </form>

                {/* Group Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
                     <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Gruppo Familiare
                    </h3>
                    
                    {profile?.group_id ? (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-500">Sei membro del gruppo:</p>
                            <p className="font-bold text-gray-800 text-lg">{profile.group_name || "Gruppo sconosciuto"}</p>
                            <p className="text-xs text-gray-400 mt-1">ID Gruppo: {profile.group_id}</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                            Non fai parte di nessun gruppo. Chiedi un invito.
                        </div>
                    )}
                </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
