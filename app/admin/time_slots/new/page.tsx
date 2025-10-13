"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTimeSlotPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    staff_id: "",
    date: "",
    time: "",
    end_time: "",
    is_reserved: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/time_slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("作成に失敗しました");
      router.push("/admin/time_slots");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">時間枠新規作成</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">スタッフID</label>
          <input name="staff_id" value={form.staff_id} onChange={handleChange} className="border px-2 py-1 w-full" required />
        </div>
        <div>
          <label className="block mb-1">日付</label>
          <input name="date" type="date" value={form.date} onChange={handleChange} className="border px-2 py-1 w-full" required />
        </div>
        <div>
          <label className="block mb-1">時間</label>
          <input name="time" type="time" value={form.time} onChange={handleChange} className="border px-2 py-1 w-full" required />
        </div>
        <div>
          <label className="block mb-1">終了時間</label>
          <input name="end_time" type="time" value={form.end_time} onChange={handleChange} className="border px-2 py-1 w-full" required />
        </div>
        <div>
          <label className="inline-flex items-center">
            <input name="is_reserved" type="checkbox" checked={form.is_reserved} onChange={handleChange} className="mr-2" />
            予約済み
          </label>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "作成中..." : "作成"}
        </button>
      </form>
    </div>
  );
} 
