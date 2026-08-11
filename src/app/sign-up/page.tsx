import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>
      <div className="w-full max-w-sm px-4 relative">
        <div className="text-center mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-purple-500/25 mx-auto mb-4">
            S
          </div>
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1">Get started with Sagenify AI</p>
        </div>
        <SignUp
          forceRedirectUrl="/dashboard"
          signInUrl="/sign-in"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}
