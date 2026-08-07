import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground mx-auto mb-4">
            AI
          </div>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your account to get started</p>
        </div>
        <SignUp
          forceRedirectUrl="/dashboard"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}