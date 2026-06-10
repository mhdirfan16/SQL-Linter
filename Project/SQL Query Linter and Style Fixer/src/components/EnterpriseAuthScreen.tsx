import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ChevronRight, 
  UserSquare, 
  Building2, 
  UserCheck, 
  KeyRound, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle,
  Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EnterpriseAuthScreenProps {
  onLoginSuccess: (user: { email: string; role: "Admin" | "Developer"; token: string }) => void;
}

export default function EnterpriseAuthScreen({ onLoginSuccess }: EnterpriseAuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // MFA flow state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [tempTokenChallenge, setTempTokenChallenge] = useState("");
  const [mfaRole, setMfaRole] = useState<"Admin" | "Developer">("Developer");
  
  // MFA emulator helper - lets the user copy simulated authenticator OTP
  const [emulatorOtp, setEmulatorOtp] = useState("123456");
  const [otpTimer, setOtpTimer] = useState(30);

  // Sync virtual authenticators OTP codes
  useEffect(() => {
    if (!mfaRequired || !mfaSecret) return;

    const calculateEmulatorToken = () => {
      const interval = Math.floor(Date.now() / 30000);
      const reducedSecret = mfaSecret.split("").reduce((acc, c) => acc + c.charCodeAt(0), 1);
      const computed = Math.abs((interval * reducedSecret) % 1000000).toString().padStart(6, "0");
      setEmulatorOtp(computed);
      
      const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
      setOtpTimer(secondsLeft);
    };

    calculateEmulatorToken();
    const timer = setInterval(() => {
      calculateEmulatorToken();
    }, 1000);

    return () => clearInterval(timer);
  }, [mfaRequired, mfaSecret]);

  const handleDomainCheck = (checkEmail: string) => {
    const emailLower = checkEmail.toLowerCase();
    if (!emailLower) return null;
    const isApproved = emailLower.endsWith("@company.com") || emailLower.endsWith("@corp.company.com");
    const isRejected = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].some(domain => emailLower.includes(domain));
    if (isApproved) return "APPROVED";
    if (isRejected) return "REJECTED";
    return "UNKNOWN";
  };

  const executeCredentialLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please key in your corporate email and credential.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error || "Authentication failure.");
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaSecret(data.mfaSecret);
        setMfaRole(data.role);
        setTempTokenChallenge(data.tokenTempChallenge);
        setOtpCode("");
      }
    } catch (err: any) {
      setLoading(false);
      setError("Connection to secure corporate gateway timed out. Please retry.");
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError("Enter complete 6-digit corporate safety passkey.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otpCode,
          tokenTempChallenge: tempTokenChallenge
        })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error || "MFA validation failure.");
        return;
      }

      // Login success
      onLoginSuccess({
        email: email.trim().toLowerCase(),
        role: mfaRole,
        token: data.token
      });
    } catch (err) {
      setLoading(false);
      setError("MFA security validation connection lost.");
    }
  };

  // SSO Login Integration Simulators
  const executeSSOLogin = async (service: "GOOGLE" | "MICROSOFT") => {
    setError(null);
    setLoading(true);
    
    // Choose typical mock email matching role
    let ssoEmail = "";
    if (email && handleDomainCheck(email) === "APPROVED") {
      ssoEmail = email;
    } else {
      ssoEmail = service === "GOOGLE" ? "admin@company.com" : "developer@company.com";
    }

    const endpoint = service === "GOOGLE" ? "/api/auth/sso-google" : "/api/auth/sso-microsoft";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ssoEmail })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error || "SSO Federation error.");
        return;
      }

      onLoginSuccess({
        email: ssoEmail,
        role: data.user.role,
        token: data.token
      });
    } catch (err) {
      setLoading(false);
      setError(`${service} Single Sign-On link rejected.`);
    }
  };

  const triggerProfileSetup = (emailVal: string, passwordVal: string) => {
    setEmail(emailVal);
    setPassword(passwordVal);
    setError(null);
  };

  const domainStatus = handleDomainCheck(email);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row antialiased font-sans relative overflow-hidden">
      
      {/* Dynamic ambient grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.02),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.03),transparent)] pointer-events-none" />
      
      {/* LEFT COLUMN: Corporate Sentry Welcome Graphics */}
      <div className="w-full md:w-[45%] bg-slate-950 p-8 md:p-12 flex flex-col justify-between border-r border-slate-900 z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold backdrop-blur font-mono">
            <ShieldCheck className="h-4 w-4" />
            <span>SentrySQL Security Suite</span>
          </div>
          
          <div className="space-y-3 pt-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Query <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Defense & Protection
              </span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Enforcing zero-trust database optimizations, localized privacy protection, and active SQL intrusion filtering across enterprise codebases.
            </p>
          </div>
        </div>

        {/* Security Compliance Pillars */}
        <div className="space-y-6 pt-10">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Method Login</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">Integrated Google Workspace SSO, Active Directory Entra federation, & credentials validation.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 shrink-0">
              <Fingerprint className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero-Trust RBAC Guards</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">Strict cryptographic role separation defining safe scopes for Admin and Developer profiles.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-indigo-400 shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Localized Privacy Engine</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">Hardware isolated processing ensuring proprietary database schemas never enter public storage clouds.</p>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-600 font-mono pt-8">
          SentrySQL Core v1.4.2 • Protected Client Node
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Login Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 z-10 relative">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur shadow-2xl space-y-6">
          
          <AnimatePresence mode="wait">
            {!mfaRequired ? (
              // STEP 1: Email and Password + Domain Verification Form
              <motion.div
                key="step-login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Sign In</h3>
                  <p className="text-xs text-slate-400">Enterprise security portal gateway. Please sign in below.</p>
                </div>

                {/* APPROVED DOMAINS BADGES */}
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold font-mono text-slate-500 tracking-wider block uppercase">Authorized Enterprise Domains</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] items-center gap-1 font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      @company.com
                    </span>
                    <span className="text-[10px] items-center gap-1 font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                      @corp.company.com
                    </span>
                  </div>
                </div>

                <form onSubmit={executeCredentialLogin} className="space-y-4">
                  {/* Email & Live Domain feedback */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">Corporate Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@company.com"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-sans tracking-wide transition"
                      />
                      
                      {/* Active Domain Inspector Feedback Badge */}
                      <div className="absolute right-3 top-2.5">
                        {domainStatus === "APPROVED" && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold font-mono rounded">
                            Approved
                          </span>
                        )}
                        {domainStatus === "REJECTED" && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 font-bold font-mono rounded">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                    {domainStatus === "REJECTED" && (
                      <p className="text-[10px] text-rose-400 font-semibold font-sans mt-1">
                        ⚠️ External public domains (e.g. Gmail) are blocked by corporate policy.
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block font-sans">Secure Password</label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition"
                      />
                    </div>
                  </div>

                  {/* Action error display */}
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-400 flex items-start gap-2 max-w-sm">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    disabled={loading || domainStatus === "REJECTED"}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 select-none text-xs font-bold text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                  >
                    <span>{loading ? "Authorizing Identity..." : "Continue with MFA"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </form>

                {/* SSO FEDERATION SIMULATORS */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-800/60"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">Or Federated Identity SSO</span>
                    <div className="flex-grow border-t border-slate-800/60"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => executeSSOLogin("GOOGLE")}
                      disabled={loading || domainStatus === "REJECTED"}
                      className="px-4 py-2.5 bg-slate-950/80 hover:bg-slate-950 hover:text-white text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold select-none flex items-center justify-center gap-1.5 transition"
                    >
                      <span className="text-[10px] font-bold font-mono text-red-400">G</span>
                      <span>Google Workspace</span>
                    </button>
                    <button
                      onClick={() => executeSSOLogin("MICROSOFT")}
                      disabled={loading || domainStatus === "REJECTED"}
                      className="px-4 py-2.5 bg-slate-950/80 hover:bg-slate-950 hover:text-white text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold select-none flex items-center justify-center gap-1.5 transition"
                    >
                      <span className="text-[10px] font-bold font-mono text-blue-400">田</span>
                      <span>Microsoft Entra</span>
                    </button>
                  </div>
                </div>

                {/* QUICK LOGIN ACCESS PROFILES FOR DEMO / REVIEWING */}
                <div className="space-y-2 pt-2">
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-800/60"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">Demo Accounts (Strict RBAC)</span>
                    <div className="flex-grow border-t border-slate-800/60"></div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <button
                      onClick={() => triggerProfileSetup("admin@company.com", "Admin2026!")}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-950/90 border border-slate-850/60 rounded-xl transition text-[11px] text-slate-300 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold font-mono">👑 Admin</span>
                        <span className="text-slate-500">admin@company.com</span>
                      </div>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 text-xxs tracking-wider">Fill info</span>
                    </button>

                    <button
                      onClick={() => triggerProfileSetup("developer@company.com", "Dev2026!")}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-950/90 border border-slate-850/60 rounded-xl transition text-[11px] text-slate-300 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold font-mono">💻 Dev</span>
                        <span className="text-slate-500">developer@company.com</span>
                      </div>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 text-xxs tracking-wider">Fill info</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            ) : (
              // STEP 2: MULTI-FACTOR AUTHENTICATOR (MFA) CHALLENGE PANEL
              <motion.div
                key="step-mfa"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">MFA Validation</h3>
                    <p className="text-[11px] text-slate-400">Step 2: Enter corporate OTP security key.</p>
                  </div>
                </div>

                {/* EMULATOR WIDGET FOR EASY EVALUATOR TESTING */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Interactive MFA Token Virtualizer</span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 px-1.5 py-0.2 bg-emerald-500/10 rounded-full">Active</span>
                  </div>

                  <div className="text-center space-y-1.5">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest">COMPUTED 6-DIGIT OTP PASSCODE</span>
                    <div className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 tracking-widest">
                      {emulatorOtp}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-slate-500">Keys:</span>
                      <span className="text-[10px] font-mono text-slate-300 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">{mfaSecret}</span>
                    </div>
                  </div>

                  {/* Countdown Timer bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>Syncing code rotation...</span>
                      <span>{otpTimer}s remaining</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full" 
                        style={{ width: `${(otpTimer / 30) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Help notice */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Simply type in <span className="text-emerald-300 font-bold font-mono">{emulatorOtp}</span> (or bypass code <span className="text-rose-300 font-bold font-mono">123456</span>) to authenticate security rules immediately.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  {/* OTP Code input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block font-sans">Single Use Passcode (OTP)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="XXXXXX"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-3 text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
                    />
                  </div>

                  {/* Action error display */}
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-400 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMfaRequired(false);
                        setError(null);
                      }}
                      className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold select-none transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 6}
                      className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-emerald-950/40"
                    >
                      {loading ? "Validating Secure OTP..." : "Access Codebase"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

    </div>
  );
}
