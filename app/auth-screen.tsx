"use client";

import { FormEvent, useState } from "react";

type Mode = "login" | "signup" | "forgot";

export default function AuthScreen({ googleEnabled }: { googleEnabled: boolean }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    if (mode === "forgot") {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; message?: string; devResetUrl?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        } else {
          setNotice(data.devResetUrl ? `${data.message} (Local dev — chưa cấu hình email, dùng link: ${data.devResetUrl})` : data.message || "Đã gửi yêu cầu.");
        }
      } catch {
        setError("Không kết nối được máy chủ. Vui lòng thử lại.");
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, name }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Không kết nối được máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">L</span>
          <div><strong>LướiFlow</strong><small>Quản lý sản xuất</small></div>
        </div>

        {mode !== "forgot" && (
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => switchMode("login")}>Đăng nhập</button>
            <button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => switchMode("signup")}>Đăng ký</button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="auth-forgot-head">
            <h2>Quên mật khẩu</h2>
            <p>Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>Họ tên
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị" />
            </label>
          )}
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@vidu.com" />
          </label>
          {mode !== "forgot" && (
            <label>Mật khẩu
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 8 ký tự" />
            </label>
          )}

          {mode === "login" && (
            <button type="button" className="auth-forgot-link" onClick={() => switchMode("forgot")}>Quên mật khẩu?</button>
          )}

          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : mode === "signup" ? "Tạo tài khoản" : "Gửi link đặt lại"}
          </button>

          {mode === "forgot" && (
            <button type="button" className="auth-forgot-link" onClick={() => switchMode("login")}>← Quay lại đăng nhập</button>
          )}
        </form>

        {mode !== "forgot" && googleEnabled && (
          <>
            <div className="auth-divider"><span>hoặc</span></div>
            <a className="secondary auth-google" href="/api/auth/google">
              <GoogleLogo />
              Đăng nhập bằng Google
            </a>
          </>
        )}
      </div>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
