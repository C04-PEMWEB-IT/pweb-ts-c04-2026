"use strict";
var Auth;
(function (Auth) {
    const API = "https://dummyjson.com";
    const ROLES = ["admin", "moderator", "user"];
    Auth.isStaff = (role) => role === "admin" || role === "moderator";
    Auth.homeFor = (role) => (Auth.isStaff(role) ? "index.html" : "operator.html");
    function session() {
        const s = Store.read(Store.KEYS.session, null);
        if (!s || !s.token || !s.role || !s.firstName || !ROLES.includes(s.role))
            return null;
        return s;
    }
    Auth.session = session;
    function normalizeRole(value) {
        const r = String(value ?? "").toLowerCase();
        return ROLES.includes(r) ? r : null;
    }
    async function resolveRole(id) {
        for (const role of ["admin", "moderator"]) {
            const res = await fetch(`${API}/users/filter?key=role&value=${role}`);
            if (!res.ok)
                continue;
            const data = (await res.json());
            if (data.users.some((u) => u.id === id))
                return role;
        }
        return "user";
    }
    async function login(username, password) {
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, expiresInMins: 1440 }),
            });
            const data = (await res.json());
            if (!res.ok) {
                const msg = typeof data.message === "string" ? data.message : "";
                return { ok: false, error: /invalid/i.test(msg) ? "Username atau password salah." : msg || "Login gagal. Coba lagi." };
            }
            const token = String(data.accessToken ?? data.token ?? "");
            if (!token)
                return { ok: false, error: "Server tidak mengirim token. Coba lagi." };
            const role = normalizeRole(data.role) ?? (await resolveRole(Number(data.id)));
            const value = {
                token, role,
                firstName: String(data.firstName ?? username),
                username: String(data.username ?? username),
            };
            Store.write(Store.KEYS.session, value);
            return { ok: true, value };
        }
        catch {
            return { ok: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." };
        }
    }
    Auth.login = login;
    function logout() {
        Store.remove(Store.KEYS.session);
        window.location.replace("login.html");
    }
    Auth.logout = logout;
    function guard(opts = {}) {
        const s = session();
        if (!s) {
            window.location.replace("login.html?reason=login");
            return null;
        }
        if (opts.staffOnly && !Auth.isStaff(s.role)) {
            Store.remove(Store.KEYS.session);
            window.location.replace("login.html?reason=forbidden");
            return null;
        }
        return s;
    }
    Auth.guard = guard;
    async function testAccounts() {
        const get = async (role) => {
            const res = await fetch(`${API}/users/filter?key=role&value=${role}&limit=3&select=username,password,firstName,role`);
            if (!res.ok)
                return [];
            return (await res.json()).users;
        };
        const [admin, user] = await Promise.all([get("admin"), get("user")]);
        return { admin, user };
    }
    Auth.testAccounts = testAccounts;
})(Auth || (Auth = {}));
