import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Palette, Sparkles, ShoppingBag, Paintbrush, Shield, ArrowLeft } from "lucide-react";
import "../styles/Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Format numbers with K, M, B suffixes
const formatNumber = (num) => {
    if (num < 1000) {
        return num.toString();
    } else if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        return `${thousands}K+`;
    } else if (num < 1000000000) {
        const millions = Math.floor(num / 1000000);
        return `${millions}M+`;
    } else {
        const billions = Math.floor(num / 1000000000);
        return `${billions}B+`;
    }
};

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const Auth = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("login");
    const [selectedRole, setSelectedRole] = useState("buyer");
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [aiStats, setAiStats] = useState(null);

    // Fetch AI stats for the hero section
    useEffect(() => {
        fetchAiStats();
    }, []);

    const fetchAiStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/artworks/stats`);
            if (res.data.success) {
                setAiStats(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch AI stats:', error);
            // Set fallback data if API fails
            setAiStats({
                totalArtworks: 50000,
                totalArtists: 12000,
                aiAccuracy: 98
            });
        }
    };

    const roles = [
        {
            value: "buyer",
            label: "Art Collector",
            icon: ShoppingBag,
             image: "/icons/collector.jpg",
            description: "Browse and purchase amazing artworks",
            color: "text-secondary",
            bgColor: "bg-secondary/10 border-secondary/20"
        },
        {
            value: "artist",
            label: "Artist",
            icon: Paintbrush,
            image: "/icons/artist.jpg", 
            description: "Create and sell your artistic works",
            color: "text-primary",
            bgColor: "bg-primary/10 border-primary/20"
        },
        {
            value: "moderator",
            label: "Moderator",
            icon: Shield,
            image: "/icons/moderator.jpg",
            description: "Help maintain community standards",
            color: "text-accent",
            bgColor: "bg-accent/10 border-accent/20"
        }
    ];

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (!validateEmail(formData.email)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (activeTab === "register" && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (activeTab === "register" && formData.username.trim().length === 0) {
            setError("Please enter your username.");
            return;
        }

        const endpoint = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";
        const payload = activeTab === "login"
            ? { email: formData.email, password: formData.password }
            : { username: formData.username.trim(), email: formData.email, password: formData.password, role: selectedRole };

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}${endpoint}`, payload);
            const data = res.data;

            if (res.status < 200 || res.status >= 300) {
                const msg = data?.message || "Authentication failed.";
                setError(msg);
                return;
            }

            if (data?.token) {
                localStorage.setItem("auth_token", data.token);
                if (data.user) localStorage.setItem("auth_user", JSON.stringify(data.user));
                setSuccessMsg(activeTab === "login" ? "Logged in successfully." : "Registered successfully.");
                window.dispatchEvent(new CustomEvent("auth:success", { detail: { user: data.user } }));
                navigate("/", { replace: true });
            } else {
                setError("Invalid server response.");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Network error. Please try again.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    const handleGoogleAuth = () => {
        window.location.href = `${API_URL}/api/auth/google`;
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&q=80')] bg-cover bg-center opacity-20" />
                <div className="relative z-10 flex flex-col justify-center items-start p-16 text-white">
                    <Link to="/" className="flex items-center gap-3 mb-8 group">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
                            <Palette className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">S.M.A.R.T</h1>
                            <p className="text-sm text-white/80">AI Art Platform</p>
                        </div>
                    </Link>

                    <div className="space-y-6 max-w-md">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            <h2 className="text-4xl font-bold">Where Art Meets<br />Intelligence</h2>
                        </div>
                        <p className="text-lg text-white/90">
                            Join thousands of artists and collectors in the world's most advanced
                            AI-powered art platform. Every piece is verified, every artist is celebrated.
                        </p>
                        <div className="grid grid-cols-3 gap-4 pt-8">
                            <div className="text-center">
                                <div className="text-3xl font-bold">{aiStats?.totalArtworks ? formatNumber(aiStats.totalArtworks) : '50K+'}</div>
                                <div className="text-sm text-white/80">Artworks</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">{aiStats?.totalArtists ? formatNumber(aiStats.totalArtists) : '12K+'}</div>
                                <div className="text-sm text-white/80">Artists</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">{aiStats?.aiAccuracy || 98}%</div>
                                <div className="text-sm text-white/80">AI Score</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Forms */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md animate-scale-in">
                    {/* Mobile Back Button */}
                    <div className="lg:hidden mb-6">
                        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                            <span className="font-medium">Back to Home</span>
                        </Link>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-muted rounded-lg p-1 mb-8">
                        <button
                            onClick={() => {
                                setActiveTab("login");
                                setError("");
                                setSuccessMsg("");
                            }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === "login"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("register");
                                setError("");
                                setSuccessMsg("");
                            }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === "register"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Auth Card */}
                    <div className="bg-card border border-border rounded-[var(--radius)] shadow-lg">
                        <div className="p-8">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    {activeTab === "login" ? "Welcome Back" : "Create Account"}
                                </h1>
                                <p className="text-muted-foreground">
                                    {activeTab === "login"
                                        ? "Sign in to continue your creative journey"
                                        : "Join the S.M.A.R.T community today"
                                    }
                                </p>
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}
                            {successMsg && (
                                <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg mb-4 text-sm">
                                    {successMsg}
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {activeTab === "register" && (
                                    <div className="form-group">
                                        <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input
                                                type="text"
                                                name="username"
                                                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                placeholder="Enter your username"
                                                autoComplete="username"
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "register" && (
                                    <div className="form-group">
                                        <label className="block text-sm font-medium text-foreground mb-2">Account Type</label>
                                       <div className="role-selection grid grid-cols-1 gap-2">
                                            {roles.map((option) => {
                                                const Icon = option.icon;
                                                return (
                                                    <label
                                                        key={option.value}
                                                        className={`role-option relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedRole === option.value ? 'selected' : ''}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            value={option.value}
                                                            checked={selectedRole === option.value}
                                                            onChange={(e) => setSelectedRole(e.target.value)}
                                                            className="sr-only"
                                                            disabled={loading}
                                                        />
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className={`relative flex items-center justify-center p-2 ml-1 size-1 rounded-lg ${selectedRole === option.value ? option.bgColor : 'bg-muted'}`}>
                                                                {option.image ? (
                                                                    <div className="role-option-image-container">
                                                                    <img src={option.image} alt={option.label} className="role-option-image" />
                                                                    </div>
                                                                ) : (
                                                                    <Icon className={`h-5 w-5 ${selectedRole === option.value ? option.color : 'text-muted-foreground'}`} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-foreground">{option.label}</div>
                                                                <div className="text-sm text-muted-foreground">{option.description}</div>
                                                            </div>
                                                        </div>
                                                        {selectedRole === option.value && (
                                                            <div className="role-indicator w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                                                            </div>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                        <input
                                            type="email"
                                            className="mr-2 w-full pl-10 pr-4 py-3 bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter your email"
                                            autoComplete="username email"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter your password"
                                            autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                                            disabled={loading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {activeTab === "register" && (
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            Password must be at least 6 characters long
                                        </div>
                                    )}
                                </div>

                                {activeTab === "register" && (
                                    <div className="form-group">
                                        <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                placeholder="Confirm your password"
                                                autoComplete="new-password"
                                                disabled={loading}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary w-full py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="loading"></div>
                                            <span>{activeTab === "login" ? "Signing in..." : "Creating account..."}</span>
                                        </div>
                                    ) : (
                                        <span>{activeTab === "login" ? "Sign In" : "Create Account"}</span>
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border"></div>
                                </div>
                            </div>

                            {/* Google Sign In */}
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-[var(--radius)] bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                                    Continue with Google
                                </span>
                            </button>

                            {/* Mode Toggle */}
                            <div className="text-center mt-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                                    <span className="text-sm text-muted-foreground">
                                        {activeTab === "login" ? "Don't have an account?" : "Already have an account?"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setSuccessMsg("");
                                            setActiveTab(activeTab === "login" ? "register" : "login");
                                        }}
                                        className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline decoration-2 underline-offset-2"
                                    >
                                        {activeTab === "login" ? "Create one" : "Sign in"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 px-4">
                        <div className="text-sm text-muted-foreground leading-relaxed">
                            By {activeTab === "register" ? "creating an account" : "signing in"}, you agree to our{" "}
                            <Link to="/terms" className="text-primary hover:text-primary/80 font-medium underline decoration-1 underline-offset-2 transition-colors">
                                Terms of Service
                            </Link>
                            {" "}and{" "}
                            <Link to="/privacy" className="text-primary hover:text-primary/80 font-medium underline decoration-1 underline-offset-2 transition-colors">
                                Privacy Policy
                            </Link>
                        </div>

                        {/* Additional Features */}
                        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                <span>Secure & Encrypted</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                                <span>AI-Powered</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-accent rounded-full"></div>
                                <span>Global Community</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;