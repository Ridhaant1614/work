import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "../api";
import { useAuth } from "../auth";
import { Spinner, EmptyState, Initials } from "../ui";
import { useToast } from "../toast";

export default function Staff() {
  const { user } = useAuth();
  const { show } = useToast();
  const qc = useQueryClient();

  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiGet<any[]>("/staff"),
    enabled: user?.role === "owner",
  });

  const createMutation = useMutation({
    mutationFn: () => apiPost("/staff", { name: name.trim(), email: email.trim(), password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setOpenAdd(false);
      setName("");
      setEmail("");
      setPassword("");
      show("Staff member created successfully", "success");
    },
    onError: (e: any) => show(e?.message || "Failed to create staff", "error"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiPatch(`/staff/${id}`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      show("Staff status updated", "success");
    },
    onError: (e: any) => show(e?.message || "Failed to update staff", "error"),
  });

  if (user?.role !== "owner") {
    return (
      <div className="page-body">
        <EmptyState
          icon="🔒"
          title="Access Restricted"
          subtitle="Staff management is reserved for administrators and business owners only."
        />
      </div>
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      show("Please fill in all fields", "error");
      return;
    }
    if (password.length < 6) {
      show("Password must be at least 6 characters", "error");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Staff & Role Management</h1>
          <p>Manage access credentials and team permissions for distribution operations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setOpenAdd(true)}>
            + Add Staff Member
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
        {/* Admin overview banner */}
        <div
          style={{
            padding: "var(--s4) var(--s5)",
            background: "linear-gradient(135deg, rgba(15,76,92,0.12), rgba(15,76,92,0.03))",
            border: "1px solid rgba(15,76,92,0.25)",
            borderRadius: "var(--r-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--s3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
            <div style={{ fontSize: 32 }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Owner Control Panel</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Staff members have operational access (create sales, record purchases, view inventory) but cannot access owner settings or delete audit records.
              </div>
            </div>
          </div>
          <div className="badge badge-brand" style={{ fontSize: 13, padding: "6px 14px" }}>
            {data.length} Active Staff Accounts
          </div>
        </div>

        {/* Current Owner Profile */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Owner Account</h2>
            <span className="badge badge-brand">Root Admin</span>
          </div>
          <div style={{ padding: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s4)" }}>
            <Initials name={user?.name || "Owner"} size={44} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{user?.email}</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span className="badge badge-success">Permanent Access</span>
            </div>
          </div>
        </div>

        {/* Staff Team List */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Team Members</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setOpenAdd(true)}>
              + Add Member
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: "var(--s6)" }}><Spinner /></div>
          ) : isError ? (
            <div style={{ padding: "var(--s6)" }}>
              <EmptyState icon="⚠️" title="Error loading staff" action="Retry" onAction={() => refetch()} />
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: "var(--s6)" }}>
              <EmptyState
                icon="👥"
                title="No staff members added yet"
                subtitle="Add sales representatives or warehouse dispatchers to allow them to bill orders"
                action="+ Add Staff Member"
                onAction={() => setOpenAdd(true)}
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Email / Login ID</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s: any) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                          <Initials name={s.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>ID: {s.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 13 }}>{s.email}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">Staff</span>
                      </td>
                      <td>
                        <span className={`badge ${s.active ? "badge-success" : "badge-error"}`}>
                          {s.active ? "● Active" : "○ Inactive"}
                        </span>
                      </td>
                      <td className="num">
                        <button
                          className={`btn btn-sm ${s.active ? "btn-outline" : "btn-primary"}`}
                          disabled={toggleStatusMutation.isPending}
                          onClick={() => toggleStatusMutation.mutate({ id: s.id, active: !s.active })}
                        >
                          {s.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {openAdd && (
        <div className="modal-overlay" onClick={() => setOpenAdd(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Staff Member</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setOpenAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email Address (Login ID)</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="rahul@soneja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Temporary Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    Share this password with the employee. They will use it to log in on the web.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setOpenAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
