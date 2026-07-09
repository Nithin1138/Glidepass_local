"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const MagicRings = dynamic(() => import("../../components/MagicRings"), { ssr: false });
import {
  Mail, Key, User, Calendar, Terminal, Keyboard,
  ArrowRight, Check, ArrowLeft, Eye, EyeOff, Sparkles,
  GraduationCap, Laptop, Palette, Globe, ShieldAlert,
  Layers, Users, BookOpen, Sun, Moon, Download, Copy
} from "lucide-react";

export default function ProviderOnboardingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glidepass-theme") || localStorage.getItem("glidepass-admin-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved as "light" | "dark");
      }

      const creatorSession = localStorage.getItem("glidepass-creator-user");
      const contributorSession = localStorage.getItem("glidepass-contributor-user");
      if (creatorSession) {
        window.location.replace("/publish");
      } else if (contributorSession) {
        window.location.replace("/contributors");
      }
    }
  }, []);

  const dk = theme === "dark";

  const [step, setStep] = useState(1); // 1: Sign In/Up, 1.2: Terms Consent, 1.5: Forgot Password, 2: Choose Role, 3: Details, 4: Referral, 5: Done
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Auth Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"google" | "email" | null>(null);
  
  // Terms & Consent
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentEmails, setConsentEmails] = useState(false);
  
  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Profile Details
  const [role, setRole] = useState<"creator" | "contributor" | null>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [website, setWebsite] = useState("");
  const [occupation, setOccupation] = useState("Student");
  const [referral, setReferral] = useState("");
  const [customReferral, setCustomReferral] = useState("");
  const [copiedWin, setCopiedWin] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Redirection when step 5 is active
  useEffect(() => {
    if (step === 5) {
      // Only register if this is a NEW sign-up — never re-register on sign-in
      // (re-registering would overwrite the user's role in the DB)
      if (isSignUpMode) {
        const registerUser = async () => {
          try {
            await fetch("/api/auth/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: Date.now().toString(),
                name: name || "Provider User",
                email: email || `user_${Date.now()}@glidepass.local`,
                role: role === "creator" ? "Creator" : "Contributor",
                status: "active",
                verified: true,
                activity: "Active now",
                joinedDate: new Date().toISOString().split("T")[0],
                activeDevices: 1,
                premium: true,
                password: password || "google_oauth",
                referral: referral || customReferral || "Not specified",
                consentEmails: consentEmails
              }),
            });
          } catch (err) {
            console.error("Failed to register user to DB:", err);
          }
        };
        registerUser();
      }

      const timer = setTimeout(() => {
        if (role === "creator") {
          const sessionObj = { email: email || "creator@glidepass.local", name: name || "Creator", role: "Creator", licenseKey: "" };
          localStorage.setItem("glidepass-creator-user", JSON.stringify(sessionObj));
          window.location.href = "/publish";
        } else {
          const sessionObj = { email: email || "contributor@glidepass.local", name: name || "Contributor", role: "Contributor" };
          localStorage.setItem("glidepass-contributor-user", JSON.stringify(sessionObj));
          window.location.href = "/contributors";
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, role, email, name, password, referral, customReferral, isSignUpMode]);

  // Clean up global handler on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).handleGoogleSignInSuccess;
      }
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Fill in all boxes.");
      return;
    }
    setAuthMethod("email");
    setAuthLoading(true);
    setAuthError("");
    
    try {
      const checkRes = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}&t=${Date.now()}`, { cache: "no-store" });
      const checkData = await checkRes.json();
      const isExisting = checkData.exists;
      
      setAuthLoading(false);
      if (isExisting && checkData.suspended) {
        setAuthError("Your account has been suspended. Please contact support.");
        return;
      }

      if (isSignUpMode) {
        if (isExisting) {
          setAuthError("Account already exists. Please Sign In.");
        } else {
          setStep(1.2);
        }
      } else {
        if (isExisting) {
          // Use the actual role stored in the database — never hardcode
          const actualRole = (checkData.role || "Contributor").toLowerCase();
          setRole(actualRole === "creator" ? "creator" : "contributor");
          setStep(5);
        } else {
          setAuthError("No account found. Please Sign Up.");
        }
      }
    } catch (err) {
      setAuthLoading(false);
      setAuthError("Verification failed. Please try again.");
    }
  };

  const handleGoogleAuth = () => {
    setAuthMethod("google");
    setAuthLoading(true);
    setAuthError("");
    
    // Register the success callback for the popup window
    (window as any).handleGoogleSignInSuccess = async (selectedName: string, selectedEmail: string) => {
      setAuthError("");
      try {
        const checkRes = await fetch(`/api/auth/check-email?email=${encodeURIComponent(selectedEmail)}&t=${Date.now()}`, { cache: "no-store" });
        const checkData = await checkRes.json();
        const isExisting = checkData.exists;
        
        setAuthLoading(false);
        if (isExisting && checkData.suspended) {
          setAuthError("Your account has been suspended. Please contact support.");
          return;
        }

        if (isSignUpMode) {
          if (isExisting) {
            setAuthError("Account already exists. Please Sign In.");
          } else {
            setName(selectedName);
            setEmail(selectedEmail);
            setStep(1.2);
          }
        } else {
          if (isExisting) {
            setName(selectedName);
            setEmail(selectedEmail);
            // Use the actual role stored in the database — never hardcode
            const actualRole = (checkData.role || "Contributor").toLowerCase();
            setRole(actualRole === "creator" ? "creator" : "contributor");
            setStep(5);
          } else {
            setAuthError("No account found. Please Sign Up.");
          }
        }
      } catch (err) {
        setAuthLoading(false);
        setAuthError("Verification failed. Please try again.");
      }
    };

    // Google Accounts Select screen popup dimensions
    const w = 850;
    const h = 580;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    const popup = window.open(
      "about:blank",
      "Google Sign In",
      `width=${w},height=${h},top=${top},left=${left},status=no,resizable=no`
    );
    
    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Sign in - Google Accounts</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: 'Roboto', sans-serif; 
                background-color: #202124; 
                color: #e8eaed; 
                margin: 0; 
                padding: 40px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 100vh;
              }
              .header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #e8eaed;
                margin-bottom: 20px;
              }
              .google-icon {
                width: 18px;
                height: 18px;
              }
              .container {
                display: flex;
                flex: 1;
                gap: 40px;
                align-items: flex-start;
                margin-top: 20px;
              }
              .left-col {
                flex: 1;
                max-width: 320px;
              }
              .left-col h1 {
                font-size: 32px;
                font-weight: 400;
                color: #fff;
                margin: 0 0 16px 0;
                line-height: 1.25;
              }
              .left-col p {
                font-size: 16px;
                color: #9aa0a6;
                margin: 0;
              }
              .left-col p span {
                color: #8ab4f8;
              }
              .right-col {
                flex: 1.2;
                background-color: #202124;
                border-radius: 8px;
              }
              .accounts-list {
                display: flex;
                flex-direction: column;
                border-bottom: 1px solid #3c4043;
              }
              .account-row {
                display: flex;
                align-items: center;
                padding: 16px 0;
                cursor: pointer;
                border-top: 1px solid #3c4043;
                transition: background 0.15s;
              }
              .account-row:hover {
                background-color: rgba(255, 255, 255, 0.04);
              }
              .avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 500;
                font-size: 16px;
                color: #fff;
                margin-right: 16px;
              }
              .info {
                display: flex;
                flex-direction: column;
                text-align: left;
              }
              .name {
                font-size: 14px;
                font-weight: 500;
                color: #e8eaed;
              }
              .email {
                font-size: 12px;
                color: #9aa0a6;
                margin-top: 2px;
              }
              .use-other-btn {
                display: flex;
                align-items: center;
                padding: 16px 0;
                cursor: pointer;
                color: #8ab4f8;
                font-size: 14px;
                font-weight: 500;
              }
              .use-other-btn:hover {
                color: #aecbfa;
              }
              .use-other-btn svg {
                margin-right: 16px;
                width: 20px;
                height: 20px;
                fill: currentColor;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #9aa0a6;
                border-top: 1px solid #3c4043;
                padding-top: 20px;
                margin-top: 20px;
              }
              .footer-links {
                display: flex;
                gap: 16px;
              }
              .footer-links a {
                color: #9aa0a6;
                text-decoration: none;
              }
              .footer-links a:hover {
                color: #fff;
              }
            </style>
          </head>
          <body>
            <div>
              <div class="header">
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Sign in with Google</span>
              </div>

              <div class="container">
                <div class="left-col">
                  <h1>Choose an account</h1>
                  <p>to continue to <span>LANpad</span></p>
                </div>

                <div class="right-col">
                  <div class="accounts-list">
                    
                    <!-- Account 1 -->
                    <div class="account-row" onclick="selectAcc('Veera Nithin', 'veeranithin9@gmail.com')">
                      <div class="avatar" style="background-color: #f28500;">V</div>
                      <div class="info">
                        <span class="name">Veera Nithin</span>
                        <span class="email">veeranithin9@gmail.com</span>
                      </div>
                    </div>

                    <!-- Account 2 -->
                    <div class="account-row" onclick="selectAcc('ISUNURI VEERA NITHIN 23BCE20064', 'nithin.23bce20064@vitapstudent.ac.in')">
                      <div class="avatar" style="background-color: #0077c0;">I</div>
                      <div class="info">
                        <span class="name">ISUNURI VEERA NITHIN 23BCE20064</span>
                        <span class="email">nithin.23bce20064@vitapstudent.ac.in</span>
                      </div>
                    </div>

                    <!-- Account 3 -->
                    <div class="account-row" onclick="selectAcc('Tom Jerry', 'chilakaluripet9@gmail.com')">
                      <div class="avatar" style="background-color: #7c3aed;">T</div>
                      <div class="info">
                        <span class="name">Tom Jerry</span>
                        <span class="email">chilakaluripet9@gmail.com</span>
                      </div>
                    </div>

                    <!-- Account 4 -->
                    <div class="account-row" onclick="selectAcc('Rayavarapu Alekhya', 'alekhyarayavarapu@gmail.com')">
                      <div class="avatar" style="background-color: #ec4899;">R</div>
                      <div class="info">
                        <span class="name">Rayavarapu Alekhya</span>
                        <span class="email">alekhyarayavarapu@gmail.com</span>
                      </div>
                    </div>

                    <!-- Account 5 -->
                    <div class="account-row" onclick="selectAcc('Nithin', 'personalprojects1009@gmail.com')">
                      <div class="avatar" style="background-color: #059669;">N</div>
                      <div class="info">
                        <span class="name">Nithin</span>
                        <span class="email">personalprojects1009@gmail.com</span>
                      </div>
                    </div>

                  </div>

                  <!-- Use other account -->
                  <div class="use-other-btn" onclick="selectAcc('New Provider', 'provider.new@gmail.com')">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
                    <span>Use another account</span>
                  </div>

                </div>
              </div>
            </div>

            <div class="footer">
              <div>
                English (United States)
              </div>
              <div class="footer-links">
                <a href="#">Help</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>

            <script>
              function selectAcc(name, email) {
                if (window.opener && window.opener.handleGoogleSignInSuccess) {
                  window.opener.handleGoogleSignInSuccess(name, email);
                }
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    }

    // Fallback if popup is blocked by user
    const checkClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkClosed);
        setAuthLoading(false);
      }
    }, 500);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 1000);
  };

  const handleMacDownloadClick = async () => {
    try {
      setAuthLoading(true);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText("brew install --cask lanpad");
      }
      setCopiedMac(true);
      setShowCopyModal(true);
      setTimeout(() => setCopiedMac(false), 2000);

      await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Date.now().toString(),
          name: name || "Provider User",
          email: email || `user_${Date.now()}@glidepass.local`,
          role: role === "creator" ? "Creator" : "Contributor",
          status: "active",
          verified: true,
          activity: "Active now",
          joinedDate: new Date().toISOString().split("T")[0],
          activeDevices: 1,
          premium: true,
          password: password || "google_oauth",
          referral: referral || customReferral || "Not specified",
          consentEmails: consentEmails
        }),
      });

      if (role === "creator") {
        const sessionObj = { email: email || "creator@glidepass.local", name: name || "Creator", role: "Creator", licenseKey: "" };
        localStorage.setItem("glidepass-creator-user", JSON.stringify(sessionObj));
      } else {
        const sessionObj = { email: email || "contributor@glidepass.local", name: name || "Contributor", role: "Contributor" };
        localStorage.setItem("glidepass-contributor-user", JSON.stringify(sessionObj));
      }
    } catch (err) {
      console.error("Failed to register user to DB:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWinDownloadClick = async () => {
    try {
      setAuthLoading(true);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText("winget install LANpad");
      }
      setCopiedWin(true);
      setShowCopyModal(true);
      setTimeout(() => setCopiedWin(false), 2000);

      await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Date.now().toString(),
          name: name || "Provider User",
          email: email || `user_${Date.now()}@glidepass.local`,
          role: role === "creator" ? "Creator" : "Contributor",
          status: "active",
          verified: true,
          activity: "Active now",
          joinedDate: new Date().toISOString().split("T")[0],
          activeDevices: 1,
          premium: true,
          password: password || "google_oauth",
          referral: referral || customReferral || "Not specified",
          consentEmails: consentEmails
        }),
      });

      if (role === "creator") {
        const sessionObj = { email: email || "creator@glidepass.local", name: name || "Creator", role: "Creator", licenseKey: "" };
        localStorage.setItem("glidepass-creator-user", JSON.stringify(sessionObj));
      } else {
        const sessionObj = { email: email || "contributor@glidepass.local", name: name || "Contributor", role: "Contributor" };
        localStorage.setItem("glidepass-contributor-user", JSON.stringify(sessionObj));
      }
    } catch (err) {
      console.error("Failed to copy or register:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${dk ? "bg-[#08080c] text-white" : "bg-[#F5F5F0] text-gray-900"} font-sans flex flex-col justify-between p-4 sm:p-6 md:p-12 relative overflow-x-hidden overflow-y-auto lg:overflow-hidden antialiased select-none transition-colors duration-200`}>
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {dk ? (
          <>
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-400/10 blur-[120px] rounded-full mix-blend-screen" />
            <MagicRings
              color="#0077c0"
              colorTwo="#c7eeff"
              ringCount={8}
              speed={0.8}
              attenuation={12}
              lineThickness={1.5}
              baseRadius={0.25}
              radiusStep={0.08}
              scaleRate={0.08}
              opacity={0.35}
              blur={0}
              noiseAmount={0.05}
              followMouse={true}
              mouseInfluence={0.15}
              hoverScale={1.1}
              parallax={0.03}
            />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0077C0]/10 rounded-full blur-[140px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F28500]/10 rounded-full blur-[140px]" />
            <MagicRings
              color="#60a5fa"
              colorTwo="#93c5fd"
              ringCount={8}
              speed={0.8}
              attenuation={12}
              lineThickness={1.5}
              baseRadius={0.25}
              radiusStep={0.08}
              scaleRate={0.08}
              opacity={0.18}
              blur={0}
              noiseAmount={0.05}
              followMouse={true}
              mouseInfluence={0.15}
              hoverScale={1.1}
              parallax={0.03}
            />
          </>
        )}
      </div>

      <style jsx global>{`
        .clay-box {
          background: ${dk ? "rgba(20, 20, 25, 0.7)" : "rgba(255, 255, 255, 0.75)"};
          backdrop-filter: blur(28px);
          border: 1px solid ${dk ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.65)"};
          border-radius: 36px;
          box-shadow: 
            inset 4px 4px 8px ${dk ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.95)"}, 
            inset -4px -4px 8px rgba(0, 0, 0, 0.02), 
            20px 20px 40px ${dk ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.04)"};
        }
        .clay-input {
          background: ${dk ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.88)"};
          border: 1px solid ${dk ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
          border-radius: 20px;
          box-shadow: inset 1px 1px 4px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
          color: ${dk ? "#fff" : "#1f2937"};
        }
        .clay-input::placeholder {
          color: ${dk ? "rgba(255, 255, 255, 0.3)" : "rgba(156, 163, 175, 1)"};
        }
        .clay-input:focus {
          border-color: #0077C0;
          box-shadow: 0 0 0 5px rgba(0, 119, 192, 0.15);
        }
        .clay-btn {
          border-radius: 20px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .clay-btn:hover {
          transform: translateY(-2px);
        }
        .clay-btn:active {
          transform: translateY(1px);
        }
      `}</style>

      {/* Top Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center z-20 py-2">
        {step < 5 ? (
          <button
            onClick={() => {
              if (step === 1.5) setStep(1);
              else if (step === 1.2) setStep(1);
              else if (step === 2) setStep(1.2);
              else if (step === 3) setStep(2);
              else if (step === 4) setStep(3);
              else if (step === 4.5) setStep(4);
              else if (step > 1) setStep(Math.floor(step - 1));
              else window.location.href = "/";
            }}
            className={`inline-flex items-center gap-2 text-sm font-black transition-colors uppercase tracking-widest cursor-pointer ${
              dk ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-4">
          {step < 5 && step !== 1.5 && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border transition-all ${
              dk ? "bg-white/5 border-white/10" : "bg-white/50 border-white"
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${dk ? "text-gray-450" : "text-gray-400"}`}>Step {Math.floor(step)} of 4</span>
              <div className="flex gap-1.5 ml-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      s <= Math.floor(step) ? "bg-[#0077C0]" : dk ? "bg-white/20" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const nextTheme = dk ? "light" : "dark";
              setTheme(nextTheme);
              localStorage.setItem("glidepass-theme", nextTheme);
            }}
            className={`p-2.5 rounded-full border transition-all cursor-pointer ${
              dk ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white/80 border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            title="Toggle Theme"
          >
            {dk ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex items-center justify-center z-10 py-6">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: SIGN IN / SIGN UP (Standard Auth landing page) */}
          {step === 1 && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-12 items-center"
            >
              {/* Left Column (Info Text) */}
              <div className="md:col-span-6 text-left space-y-6 hidden md:block">
                <h1 className={`text-5xl md:text-6xl font-black uppercase tracking-tight leading-none ${
                  dk ? "text-white" : "text-gray-950"
                }`}>
                  {isSignUpMode ? "Sign Up" : "Sign In"}
                </h1>
                <p className={`text-sm md:text-base font-bold leading-relaxed max-w-md ${
                  dk ? "text-white/60" : "text-gray-500"
                }`}>
                  {isSignUpMode 
                    ? "Create your account to start managing community hubs or contributing new scripts." 
                    : "Access the console to configure hubs, allowed formats, and paste settings."}
                </p>
                <div className="w-16 h-1.5 bg-[#0077C0] rounded-full" />
              </div>

              {/* Right Column (Auth Box) */}
              <div className="md:col-span-6">
                {authLoading ? (
                  <div className="clay-box p-12 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin border-[#0077C0]" />
                    <span className="text-xs font-black uppercase tracking-widest text-[#0077C0] animate-pulse">
                      Connecting...
                    </span>
                  </div>
                ) : (
                  <div className="clay-box p-8 md:p-10 space-y-6">
                    {/* Mobile Header (Visible only on mobile) */}
                    <div className="block md:hidden text-center space-y-2 mb-2">
                      <h1 className={`text-3xl font-black uppercase tracking-tight leading-none ${
                        dk ? "text-white" : "text-gray-950"
                      }`}>
                        {isSignUpMode ? "Sign Up" : "Sign In"}
                      </h1>
                      <p className={`text-xs font-bold leading-relaxed ${
                        dk ? "text-white/65" : "text-gray-500"
                      }`}>
                        {isSignUpMode 
                          ? "Create your account to start managing community hubs or contributing new scripts." 
                          : "Access the console to configure hubs, allowed formats, and paste settings."}
                      </p>
                      <div className="w-12 h-1 bg-[#0077C0] rounded-full mx-auto" />
                    </div>
                    {/* Google OAuth Button */}
                    <button
                      type="button"
                      onClick={() => handleGoogleAuth()}
                      className={`w-full flex items-center justify-center gap-3.5 py-4 ${
                        dk ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-gray-50 border-black/[0.06] text-gray-700"
                      } border shadow-sm font-black text-xs uppercase tracking-widest clay-btn cursor-pointer`}
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </button>

                    <div className="flex items-center justify-center gap-4">
                      <div className={`h-[1px] flex-1 ${dk ? "bg-white/10" : "bg-black/[0.05]"}`} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${dk ? "text-white/40" : "text-gray-400"}`}>or use email</span>
                      <div className={`h-[1px] flex-1 ${dk ? "bg-white/10" : "bg-black/[0.05]"}`} />
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4.5 text-left">
                      <div className="space-y-1.5">
                        <label className={`text-[10px] uppercase tracking-widest font-black ${dk ? "text-white/40" : "text-gray-400"} ml-1`}>Email</label>
                        <input
                          type="email"
                          required
                          placeholder="yourname@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-5 py-4 text-sm outline-none clay-input font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className={`text-[10px] uppercase tracking-widest font-black ${dk ? "text-white/40" : "text-gray-400"}`}>Password</label>
                          <button
                            type="button"
                            onClick={() => setStep(1.5)}
                            className="text-[10px] uppercase tracking-widest font-black text-[#0077C0] hover:underline"
                          >
                            Forgot?
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-5 pr-12 py-4 text-sm outline-none clay-input font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <p className="text-xs text-red-500 font-bold ml-1">{authError}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-4 bg-[#0077C0] text-white font-black text-xs uppercase tracking-widest clay-btn cursor-pointer shadow-md shadow-[#0077C0]/10"
                      >
                        {isSignUpMode ? "Sign Up" : "Sign In"}
                      </button>
                    </form>
                    
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUpMode(!isSignUpMode);
                          setAuthError("");
                        }}
                        className={`text-[10px] font-black uppercase tracking-wider hover:underline ${
                          dk ? "text-white/50 hover:text-white" : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {isSignUpMode ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 1.5: FORGOT PASSWORD */}
          {step === 1.5 && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-md mx-auto text-center space-y-6"
            >
              <div className="space-y-2">
                <h1 className={`text-4xl font-black uppercase tracking-tight leading-none ${
                  dk ? "text-white" : "text-gray-900"
                }`}>
                  Reset Password
                </h1>
                <p className={`text-sm font-bold max-w-xs mx-auto ${
                  dk ? "text-white/60" : "text-gray-500"
                }`}>
                  Enter your email to reset your password.
                </p>
              </div>

              <div className="clay-box p-8 md:p-10">
                {forgotSent ? (
                  <div className="space-y-5 py-2">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <Check size={24} />
                    </div>
                    <h3 className={`font-bold text-sm uppercase tracking-wide ${
                      dk ? "text-white" : "text-gray-800"
                    }`}>Link Sent!</h3>
                    <p className={`text-xs font-medium leading-relaxed ${
                      dk ? "text-white/60" : "text-gray-500"
                    }`}>
                      Check your email inbox for password recovery instructions.
                    </p>
                    <button
                      onClick={() => {
                        setForgotSent(false);
                        setStep(1);
                      }}
                      className={`w-full py-4 ${
                        dk ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border border-black/[0.08] hover:bg-gray-50 text-gray-700"
                      } font-black text-xs uppercase tracking-widest clay-btn cursor-pointer mt-2`}
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-5 text-left">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] uppercase tracking-widest font-black ${
                        dk ? "text-white/40" : "text-gray-400"
                      } ml-1`}>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="yourname@domain.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full px-5 py-4 text-sm outline-none clay-input font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-4 bg-[#0077C0] text-white font-black text-xs uppercase tracking-widest clay-btn shadow-md cursor-pointer"
                    >
                      {forgotLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 1.2: TERMS & CONDITIONS CONSENT (Anthropic-like elegant UI) */}
          {step === 1.2 && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto text-center space-y-8 py-4"
            >
              <div className="space-y-3">
                <h1 className={`text-4xl md:text-5xl font-serif tracking-tight leading-tight ${
                  dk ? "text-white" : "text-[#0f172a]"
                }`}>
                  Let's create your account
                </h1>
                <p className={`text-sm font-bold ${
                  dk ? "text-white/60" : "text-gray-500"
                }`}>
                  A few things for you to review
                </p>
              </div>

              <div className={`border shadow-2xl rounded-[32px] p-8 md:p-10 space-y-6 text-left ${
                dk ? "bg-[#18181b] border-white/5 text-white" : "bg-white border-black/5 text-gray-900"
              }`}>
                <div className="space-y-5">
                  {/* Checkbox 1 */}
                  <label className="flex items-start gap-4 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#0077C0] focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-[#0077C0]"
                    />
                    <span className={`text-xs font-semibold leading-relaxed group-hover:text-gray-300 transition-colors ${
                      dk ? "text-gray-400" : "text-gray-600"
                    }`}>
                      I agree to LANpad's <a href="/terms" target="_blank" rel="noopener noreferrer" className={`underline ${dk ? "text-gray-300 hover:text-white" : "text-[#0077C0]"}`}>Consumer Terms</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" className={`underline ${dk ? "text-gray-300 hover:text-white" : "text-[#0077C0]"}`}>Acceptable Use Policy</a> and confirm that I am at least 18 years of age.
                    </span>
                  </label>

                  {/* Checkbox 2 */}
                  <label className="flex items-start gap-4 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#0077C0] focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-[#0077C0]"
                    />
                    <span className={`text-xs font-semibold leading-relaxed group-hover:text-gray-300 transition-colors ${
                      dk ? "text-gray-400" : "text-gray-600"
                    }`}>
                      I consent to collection and use of my personal information in accordance with the <a href="/privacy" target="_blank" rel="noopener noreferrer" className={`underline ${dk ? "text-gray-300 hover:text-white" : "text-[#0077C0]"}`}>Privacy Policy</a>.
                    </span>
                  </label>

                  {/* Checkbox 3 */}
                  <label className="flex items-start gap-4 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={consentEmails}
                      onChange={(e) => setConsentEmails(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#0077C0] focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-[#0077C0]"
                    />
                    <span className="text-xs text-gray-450 font-semibold leading-relaxed group-hover:text-gray-300 transition-colors text-gray-400">
                      Subscribe to occasional promotional emails and notifications. You can opt out any time.
                    </span>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={!consentTerms || !consentPrivacy}
                    onClick={() => setStep(2)}
                    className={`w-full py-4.5 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${
                      (consentTerms && consentPrivacy)
                        ? "bg-white text-gray-900 hover:brightness-95 active:scale-[0.99] cursor-pointer shadow-md"
                        : "bg-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Create account
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CHOOSE ROLE (Grids left and right, no checkbox agreements, no Google login) */}
          {step === 2 && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full space-y-8 text-center"
            >
              <div className="space-y-2">
                <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight ${dk ? "text-white" : "text-gray-950"}`}>
                  Choose Your Role
                </h1>
                <p className={`text-sm font-bold max-w-md mx-auto ${dk ? "text-white/60" : "text-gray-500"}`}>
                  How do you want to use LANpad?
                </p>
              </div>

              {/* Grid-based split layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto w-full pt-2">
                
                {/* Creator Card */}
                <div
                  onClick={() => {
                    setRole("creator");
                    setStep(3);
                  }}
                  className={`clay-box p-5 md:p-8 flex flex-col justify-between min-h-[220px] md:min-h-[380px] border ${
                    dk ? "border-blue-900/40 hover:border-blue-500/40" : "border-blue-100 hover:border-blue-300"
                  } hover:scale-[1.01] transition-all cursor-pointer text-left`}
                >
                  <div className="space-y-4 md:space-y-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border ${
                      dk ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-500/10 border-blue-200/40"
                    }`}>
                      <Terminal className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider text-blue-600">
                        Creator
                      </h3>
                      <p className={`text-xs font-bold ${dk ? "text-white/65" : "text-gray-500"}`}>Build community workspaces, configure access rules, and monitor activity.</p>
                    </div>

                    {/* Desktop 3 Feature Boxes */}
                    <div className="hidden md:grid grid-cols-1 gap-3 pt-2">
                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <Terminal size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Build Hubs</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Create standalone community workspaces for custom scripts.</p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <Users size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Manage Members</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Invite team members and control who can read or write resources.</p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <Layers size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Configure Defaults</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Set global paste settings and formatting rules for your hub.</p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile compact checklist */}
                    <div className="flex flex-wrap gap-2 md:hidden pt-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>Build Hubs</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>Manage Members</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>Configure Defaults</span>
                    </div>
                  </div>

                  <div className={`w-full pt-4 md:pt-6 flex items-center justify-between border-t mt-4 md:mt-6 ${
                    dk ? "border-white/[0.06]" : "border-black/[0.04]"
                  }`}>
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1">
                      Continue as Creator <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

                {/* Contributor Card */}
                <div
                  onClick={() => {
                    setRole("contributor");
                    setStep(3);
                  }}
                  className={`clay-box p-5 md:p-8 flex flex-col justify-between min-h-[220px] md:min-h-[380px] border ${
                    dk ? "border-amber-900/40 hover:border-amber-500/40" : "border-amber-100 hover:border-amber-300"
                  } hover:scale-[1.01] transition-all cursor-pointer text-left`}
                >
                  <div className="space-y-4 md:space-y-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border ${
                      dk ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-500/10 border-amber-200/40"
                    }`}>
                      <Keyboard className="w-5 h-5 md:w-6 md:h-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider text-amber-600">
                        Contributor
                      </h3>
                      <p className={`text-xs font-bold ${dk ? "text-white/65" : "text-gray-500"}`}>Request access to hubs, upload scripts, and share custom macros.</p>
                    </div>

                    {/* Desktop 3 Feature Boxes */}
                    <div className="hidden md:grid grid-cols-1 gap-3 pt-2">
                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <BookOpen size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Share Resources</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Upload and publish custom scripts directly to approved hubs.</p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <Globe size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Discover Hubs</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Browse public workspaces and request direct contribution access.</p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border shadow-sm flex items-start gap-3 ${
                        dk ? "bg-white/5 border-white/[0.04]" : "bg-white/70 border-black/[0.04]"
                      }`}>
                        <Keyboard size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className={`text-xs font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Execute Macros</h4>
                          <p className={`text-[10px] font-bold ${dk ? "text-white/40" : "text-gray-500"}`}>Access community configurations to automate typing workflows.</p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile compact checklist */}
                    <div className="flex flex-wrap gap-2 md:hidden pt-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>Share Resources</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>Discover Hubs</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${dk ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>Execute Macros</span>
                    </div>
                  </div>

                  <div className={`w-full pt-4 md:pt-6 flex items-center justify-between border-t mt-4 md:mt-6 ${
                    dk ? "border-white/[0.06]" : "border-black/[0.04]"
                  }`}>
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1">
                      Continue as Contributor <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 3: DETAILS */}
          {step === 3 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto space-y-8 text-center"
            >
              <div className="space-y-2">
                <h1 className={`text-4xl font-black uppercase tracking-tight leading-none ${dk ? "text-white" : "text-gray-950"}`}>
                  Your Details
                </h1>
                <p className={`text-sm font-bold leading-relaxed max-w-md mx-auto ${dk ? "text-white/60" : "text-gray-500"}`}>
                  Provide your name to set up your console workspace.
                </p>
              </div>

              <div className="clay-box p-8 md:p-10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(4);
                  }}
                  className="space-y-5 text-left"
                >
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase tracking-widest font-black ml-1 ${dk ? "text-white/40" : "text-gray-400"}`}>
                      Name
                    </label>
                    <div className="relative">
                      <User className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 ${dk ? "text-white/40" : "text-gray-400"}`} />
                      <input
                        type="text"
                        required
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full rounded-2xl pl-14 pr-5 py-4 text-sm outline-none clay-input font-semibold ${
                          dk ? "text-white" : "text-gray-800"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#0077C0] hover:brightness-110 text-white font-black text-xs uppercase tracking-widest clay-btn cursor-pointer shadow-md shadow-[#0077C0]/10 mt-2"
                  >
                    Continue
                  </button>
                </form>
              </div>
            </motion.div>
          )}
          {/* STEP 4: REFERRAL SOURCE */}
          {step === 4 && (
            <motion.div
              key="referral"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto space-y-8 text-center"
            >
              <div className="space-y-3">
                <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight leading-none ${dk ? "text-white" : "text-gray-950"}`}>
                  How did you hear about us?
                </h1>
              </div>

              <div className="clay-box p-6 md:p-10 space-y-6 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Google search",
                    "Social media",
                    "Friend or family referral",
                    "Email newsletter",
                    "Online advertising",
                    "Word of mouth",
                    "News article or press coverage",
                    "Other website or blog",
                    "Direct website visit",
                    "Other (please specify)"
                  ].map((option) => {
                    const active = referral === option;
                    const isOther = option === "Other (please specify)";
                    return (
                      <div key={option} className={`space-y-2 ${isOther && active ? "col-span-1 sm:col-span-2" : ""}`}>
                        <div
                          onClick={() => setReferral(option)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none ${
                            active
                              ? (dk ? "bg-[#0077C0]/15 border-[#0077C0] text-white" : "bg-[#0077C0]/5 border-[#0077C0] text-[#0077C0]")
                              : (dk ? "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.05] hover:border-white/10" : "border-black/[0.05] bg-white text-gray-700 hover:bg-gray-50 hover:border-black/10")
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                            active
                              ? "bg-[#0077C0] border-[#0077C0] text-white"
                              : (dk ? "border-white/20 bg-white/5 text-transparent" : "border-black/[0.12] bg-white text-transparent")
                          }`}>
                            <Check size={12} className="stroke-[3]" />
                          </div>
                          <span className="text-xs font-bold leading-none">
                            {option}
                          </span>
                        </div>

                        {isOther && active && (
                          <input
                            type="text"
                            required
                            placeholder="Please tell us..."
                            value={customReferral}
                            onChange={(e) => setCustomReferral(e.target.value)}
                            className={`w-full px-4 py-3 text-xs border rounded-xl outline-none transition-all font-semibold ${
                              dk ? "bg-white/5 border-white/10 text-white focus:border-white/20" : "bg-white border border-black/10 text-gray-800 focus:border-black/20"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!referral || (referral === "Other (please specify)" && !customReferral)}
                    onClick={() => {
                      setStep(4.5);
                    }}
                    className={`w-full py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${
                      (referral && (referral !== "Other (please specify)" || customReferral))
                        ? "bg-[#0077C0] text-white hover:brightness-110 cursor-pointer shadow-md shadow-[#0077C0]/10"
                        : (dk ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-black/[0.06] text-gray-400 cursor-not-allowed")
                    }`}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4.5: DOWNLOAD APP */}
          {step === 4.5 && (
            <motion.div
              key="download-app"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto space-y-8 text-center"
            >
              <div className="space-y-3">
                <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight leading-none ${dk ? "text-white" : "text-gray-950"}`}>
                  Get LANpad Desktop
                </h1>
                <p className={`text-sm font-bold leading-relaxed max-w-md mx-auto ${dk ? "text-white/60" : "text-gray-500"}`}>
                  Download the companion app to share content across devices and enable typing simulation mode.
                </p>
              </div>

              <div className="clay-box p-8 md:p-10 space-y-6">
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl border text-left flex items-start gap-4 ${
                    dk ? "bg-white/5 border-white/[0.04]" : "bg-white/50 border-black/[0.04]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                      <Laptop size={20} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Typing Simulation Mode</h3>
                      <p className={`text-xs mt-1 leading-relaxed ${dk ? "text-white/40" : "text-gray-500"}`}>
                        Simulate natural human keystrokes on target fields, bypassing clipboard blocking mechanisms.
                      </p>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border text-left flex items-start gap-4 ${
                    dk ? "bg-white/5 border-white/[0.04]" : "bg-white/50 border-black/[0.04]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-550 shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase ${dk ? "text-white" : "text-gray-900"}`}>Cross-Device Cloud Sync</h3>
                      <p className={`text-xs mt-1 leading-relaxed ${dk ? "text-white/40" : "text-gray-500"}`}>
                        Instantly access and share your configured commands and scripts across multiple workstations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={handleMacDownloadClick}
                    className="py-4 bg-[#0077C0] text-white font-black text-xs uppercase tracking-widest clay-btn cursor-pointer shadow-md shadow-[#0077C0]/10 flex items-center justify-center gap-2"
                  >
                    {copiedMac ? (
                      <>
                        <Check size={14} className="stroke-[3]" /> Copied Command!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Mac Command
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleWinDownloadClick}
                    className="py-4 bg-[#F28500] hover:brightness-110 text-white font-black text-xs uppercase tracking-widest clay-btn cursor-pointer shadow-md shadow-[#F28500]/10 flex items-center justify-center gap-2 border-transparent"
                  >
                    {copiedWin ? (
                      <>
                        <Check size={14} className="stroke-[3]" /> Copied Command!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Win Command
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-center items-center gap-6 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className={`text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer ${
                      dk ? "text-white/50 hover:text-white" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Do it later
                  </button>
                  <span className={`text-[10px] ${dk ? "text-white/20" : "text-gray-300"}`}>|</span>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className={`text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer ${
                      dk ? "text-white/50 hover:text-white" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Already Downloaded
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: COMPLETED REDIRECT */}
          {step === 5 && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 flex flex-col items-center justify-center gap-5 text-center"
            >
              <div className={`w-16 h-16 rounded-3xl bg-[#0077C0]/15 flex items-center justify-center text-[#0077C0] animate-bounce shadow-sm border ${
                dk ? "border-white/10" : "border-white"
              }`}>
                <Check size={32} />
              </div>
              <div className="space-y-1.5">
                <h4 className={`text-3xl font-black uppercase tracking-tight ${dk ? "text-white" : "text-gray-900"}`}>
                  You're All Set!
                </h4>
                <p className={`text-sm font-bold ${dk ? "text-white/60" : "text-gray-500"}`}>
                  Sending you to your dashboard...
                </p>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin mt-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-7xl mx-auto text-center z-20 py-3">
        <p className={`text-[10px] uppercase tracking-widest font-bold ${dk ? "text-white/40" : "text-gray-400"}`}>
          LANpad Provider Portal • Secure Sign In
        </p>
      </div>

      {/* Copy Command Success Modal */}
      <AnimatePresence>
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCopyModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm rounded-[24px] shadow-2xl p-6 relative z-10 border transition-all ${
                dk ? "bg-[#1c1c24] border-white/10 text-white" : "bg-white border-black/5 text-gray-905"
              }`}
            >
              <div className="space-y-5">
                <p className={`text-sm font-bold leading-relaxed ${dk ? "text-white/95" : "text-gray-700"}`}>
                  Install command copied to clipboard! Paste it in your Terminal.
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setShowCopyModal(false)}
                    className="text-sm font-black uppercase tracking-wider text-[#0077C0] hover:text-[#0077C0]/85 transition-colors px-4 py-2 cursor-pointer font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
