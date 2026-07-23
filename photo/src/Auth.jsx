import { useState } from "react";

export default function Auth({ pb, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = {
      email: e.target.email.value,
      password: e.target.password.value,
      passwordConfirm: e.target.passwordConfirm?.value,
      name: e.target.name?.value,
    };

    if (!isLogin && data.password !== data.passwordConfirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const authData = await pb
          .collection("users")
          .authWithPassword(data.email, data.password);
        onLogin(authData.record);
      } else {
        await pb.collection("users").create(data);
        const authData = await pb
          .collection("users")
          .authWithPassword(data.email, data.password);
        onLogin(authData.record);
      }
    } catch (err) {
      console.error(err);
      const pbError = err.response?.data?.message || err.message;
      setError(pbError || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="login-subtitle">
          {isLogin
            ? "Enter your details to access the gallery."
            : "Sign up to start sharing your photos."}
        </p>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input type="text" name="name" placeholder="User Name" />
          )}

          <input type="email" name="email" placeholder="Email" required />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
          />
          {!isLogin && (
            <input
              type="password"
              name="passwordConfirm"
              placeholder="Confirm Password"
              required
            />
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Enter Gallery" : "Sign Up"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <p style={{ marginTop: "20px", color: "#ccc", fontSize: "0.9rem" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(""); // Clear errors when switching
            }}
            style={{
              background: "none",
              color: "oklch(76.9% 0.188 70.08)",
              border: "none",
              cursor: "pointer",
              marginLeft: "5px",
              width: "auto",
              padding: 0,
              display: "inline",
            }}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
