"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="auth-error">Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại từ màn hình đăng nhập.</p>
          <a className="secondary auth-google" href="/">Về trang đăng nhập</a>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-forgot-head">
            <h2>Đã đặt lại mật khẩu</h2>
            <p>Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại.</p>
          </div>
          <a className="primary auth-google" href="/">Đăng nhập ngay</a>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">L</span>
          <div><strong>LướiFlow</strong><small>Quản lý sản xuất</small></div>
        </div>
        <div className="auth-forgot-head">
          <h2>Đặt lại mật khẩu</h2>
          <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>Mật khẩu mới
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 8 ký tự" />
          </label>
          <label>Nhập lại mật khẩu
            <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>{loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}</button>
        </form>
      </div>
    </main>
  );
}
