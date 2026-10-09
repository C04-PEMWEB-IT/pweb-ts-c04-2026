namespace Auth {
  const API = "https://dummyjson.com";
  const ROLES: Role[] = ["admin", "moderator", "user"];

  interface DummyUser {
    id: number;
    username: string;
    password: string;
    firstName: string;
    role: Role;
  }

  export const isStaff = (role: Role): boolean => role === "admin" || role === "moderator";
  export const homeFor = (role: Role): string => (isStaff(role) ? "index.html" : "operator.html");

  export function session(): AuthSession | null {
    const s = Store.read<Partial<AuthSession> | null>(Store.KEYS.session, null);
    if (!s || !s.token || !s.role || !s.firstName || !ROLES.includes(s.role)) return null;
    return s as AuthSession;
  }

  function normalizeRole(value: unknown): Role | null {
    const r = String(value ?? "").toLowerCase();
    return (ROLES as string[]).includes(r) ? (r as Role) : null;
  }

  // Cadangan bila respons login tidak membawa role: cocokkan id lewat endpoint filter per role.
  async function resolveRole(id: number): Promise<Role> {
    for (const role of ["admin", "moderator"] as Role[]) {
      const res = await fetch(`${API}/users/filter?key=role&value=${role}`);
      if (!res.ok) continue;
      const data = (await res.json()) as { users: Array<{ id: number }> };
      if (data.users.some((u) => u.id === id)) return role;
    }
    return "user";
  }

  export async function login(username: string, password: string): Promise<Result<AuthSession>> {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, expiresInMins: 1440 }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : "";
        return { ok: false, error: /invalid/i.test(msg) ? "Username atau password salah." : msg || "Login gagal. Coba lagi." };
      }
      const token = String(data.accessToken ?? data.token ?? "");
      if (!token) return { ok: false, error: "Server tidak mengirim token. Coba lagi." };
      const role = normalizeRole(data.role) ?? (await resolveRole(Number(data.id)));
      const value: AuthSession = {
        token, role,
        firstName: String(data.firstName ?? username),
        username: String(data.username ?? username),
      };
      Store.write(Store.KEYS.session, value);
      return { ok: true, value };
    } catch {
      return { ok: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." };
    }
  }

  export function logout(): void {
    Store.remove(Store.KEYS.session);
    window.location.replace("login.html");
  }

  // Auth guard (+ role guard bila staffOnly). Mengembalikan null setelah mengalihkan halaman.
  export function guard(opts: { staffOnly?: boolean } = {}): AuthSession | null {
    const s = session();
    if (!s) {
      window.location.replace("login.html?reason=login");
      return null;
    }
    if (opts.staffOnly && !isStaff(s.role)) {
      Store.remove(Store.KEYS.session); // cegah loop redirect login <-> halaman terlarang
      window.location.replace("login.html?reason=forbidden");
      return null;
    }
    return s;
  }

  // Akun uji dari endpoint filter per role (untuk bantuan isi form di halaman login).
  export async function testAccounts(): Promise<Record<"admin" | "user", DummyUser[]>> {
    const get = async (role: string): Promise<DummyUser[]> => {
      const res = await fetch(`${API}/users/filter?key=role&value=${role}&limit=3&select=username,password,firstName,role`);
      if (!res.ok) return [];
      return ((await res.json()) as { users: DummyUser[] }).users;
    };
    const [admin, user] = await Promise.all([get("admin"), get("user")]);
    return { admin, user };
  }
}
