import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

// Import both logos
import pmxDark from "../assets/black_nobg.png";
import pmxLight from "../assets/white_nobg.png";

type Mode = "signin" | "signup";

const AuthPage: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<Mode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Detect current theme for logo
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        if (mode === "signin") {
            const { error } = await signIn(email, password);
            if (error) setError(error);
        } else {
            const { error } = await signUp(email, password);
            if (error) setError(error);
            else setMessage("Check your email to confirm your account.");
        }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <img src={isDark ? pmxDark : pmxLight} alt="PMX" className="auth-logo-img" />
                </div>

                <h1 className="auth-title">
                    {mode === "signin" ? "Welcome back" : "Create account"}
                </h1>
                <p className="auth-subtitle">
                    {mode === "signin"
                        ? "Sign in to your PMX workspace"
                        : "Start managing projects smarter"}
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <input
                            id="auth-email"
                            className="auth-input"
                            type="email"
                            placeholder=" "
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                        <label htmlFor="auth-email" className="auth-label">Email</label>
                    </div>

                    <div className="auth-field">
                        <input
                            id="auth-password"
                            className="auth-input"
                            type="password"
                            placeholder=" "
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        />
                        <label htmlFor="auth-password" className="auth-label">Password</label>
                    </div>

                    {error && <p className="auth-error">{error}</p>}
                    {message && <p className="auth-success">{message}</p>}

                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading
                            ? "Please wait…"
                            : mode === "signin"
                                ? "Sign In"
                                : "Create Account"}
                    </button>
                </form>

                <p className="auth-toggle">
                    {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        className="auth-toggle-btn"
                        onClick={() => {
                            setMode(mode === "signin" ? "signup" : "signin");
                            setError(null);
                            setMessage(null);
                        }}
                    >
                        {mode === "signin" ? "Sign Up" : "Sign In"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
