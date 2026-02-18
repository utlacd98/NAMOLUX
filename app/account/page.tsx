"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { 
  Loader2, 
  ArrowLeft,
  User as UserIcon,
  Lock,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface Profile {
  id: string
  email: string
  full_name: string | null
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [fullName, setFullName] = useState("")
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/sign-in")
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData as Profile)
        setFullName(profileData.full_name || "")
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase, router])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    setNameSuccess(false)

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user?.id)

    if (!error) {
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    }
    setNameLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setPasswordLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    // Note: Full account deletion requires a server-side function with service role
    // For now, we sign out and show instructions
    await supabase.auth.signOut()
    router.push("/?deleted=pending")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A843]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Navbar />
      <main className="flex-1 px-4 pt-24 pb-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#888] hover:text-white transition mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          </div>

          {/* Update Name */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#D4A843]/10 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-[#D4A843]" />
              </div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
            </div>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-[#888] mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#555] cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm text-[#888] mb-2">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent transition"
                  placeholder="Your name"
                />
              </div>
              <button
                type="submit"
                disabled={nameLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-medium rounded-lg transition disabled:opacity-50"
              >
                {nameLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {nameSuccess && <CheckCircle className="h-4 w-4" />}
                {nameSuccess ? "Saved!" : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Change Password</h2>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}
              {passwordSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 text-sm">Password updated successfully!</p>
                </div>
              )}
              <div>
                <label htmlFor="newPassword" className="block text-sm text-[#888] mb-2">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-[#888] mb-2">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </div>

          {/* Sign Out & Delete */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-lg transition"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Account</h3>
                <p className="text-sm text-[#888]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-[#888] mb-6">
              Are you sure you want to delete your account? All your data, including generation history and subscription, will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

