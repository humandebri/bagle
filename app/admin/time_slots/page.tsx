"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TIME_RANGE_MAP, formatDate, formatTimeRange } from "@/components/DateTimeDisplay";

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  max_capacity: number;
  current_bookings?: number;
  is_available?: boolean;
  created_at?: string;
}

// 一週間分の日付配列を生成
function getWeekDates(startDate: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const DEFAULT_TIME_SLOTS = [
  { time: "11:00", max_capacity: 1 },
  { time: "11:15", max_capacity: 1 },
  { time: "11:30", max_capacity: 1 },
  { time: "11:45", max_capacity: 1 },
  { time: "12:00", max_capacity: 4 },
  { time: "13:00", max_capacity: 3 },
  { time: "14:00", max_capacity: 3 },
];

// デフォルト日付計算
function getNextWeekSundayAndSaturday() {
  const today = new Date();
  // 次の日曜
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
  // 次の土曜（次週日曜+6日）
  const nextSaturday = new Date(nextSunday);
  nextSaturday.setDate(nextSunday.getDate() + 6);
  return {
    sunday: nextSunday.toISOString().split('T')[0],
    saturday: nextSaturday.toISOString().split('T')[0],
  };
}

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [bulkDays, setBulkDays] = useState<number[]>([4, 6]); // 木・土
  const { sunday, saturday } = getNextWeekSundayAndSaturday();
  const [bulkStart, setBulkStart] = useState<string>(sunday);
  const [bulkEnd, setBulkEnd] = useState<string>(saturday);
  const [bulkTimeSlots, setBulkTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editDays, setEditDays] = useState<number[]>([4, 6]);
  const [editStart, setEditStart] = useState<string>(sunday);
  const [editEnd, setEditEnd] = useState<string>(saturday);
  const [editTimeSlots, setEditTimeSlots] = useState(DEFAULT_TIME_SLOTS.map(s => s.time));
  const [editMaxCapacity, setEditMaxCapacity] = useState<number>(1);
  const [editIsAvailable, setEditIsAvailable] = useState<boolean>(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editCount, setEditCount] = useState(0);
  const editFormRef = useRef<HTMLFormElement>(null);

  const [deleteDays, setDeleteDays] = useState<number[]>([4, 6]);
  const [deleteStart, setDeleteStart] = useState<string>(sunday);
  const [deleteEnd, setDeleteEnd] = useState<string>(saturday);
  const [deleteTimeSlots, setDeleteTimeSlots] = useState(DEFAULT_TIME_SLOTS.map(s => s.time));
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteCount, setDeleteCount] = useState(0);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const [detailSlot, setDetailSlot] = useState<TimeSlot | null>(null);

  // 週の開始日を状態で管理
  const [weekStart, setWeekStart] = useState(() => {
    // デフォルトは今週の月曜
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    return monday;
  });

  // 週送り・週戻し
  const goPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(weekStart.getDate() - 7);
    setWeekStart(prev);
  };
  const goNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  useEffect(() => {
    setWeekDates(getWeekDates(weekStart));
  }, [weekStart]);

  useEffect(() => {
    fetch('/api/time_slots')
      .then((res) => res.json())
      .then((data) => {
        if (data.timeSlots) setTimeSlots(data.timeSlots);
      });
  }, []);

  // 時間帯リスト
  const timeKeys = Object.keys(TIME_RANGE_MAP);

  // 日付×時間帯でマッピング
  const slotMap: Record<string, Record<string, TimeSlot | undefined>> = {};
  for (const date of weekDates) {
    slotMap[date] = {};
    for (const time of timeKeys) {
      slotMap[date][time] = timeSlots.find(
        (slot) => slot.date === date && slot.time.slice(0, 5) === time
      );
    }
  }

  // countTargetSlotsByActualDataをuseCallbackでラップ
  const countTargetSlotsByActualData = useCallback((start: string, end: string, days: number[], times: string[]) => {
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) {
        const dateStr = d.toISOString().split('T')[0];
        for (const time of times) {
          if (timeSlots.some(slot => slot.date === dateStr && slot.time.slice(0, 5) === time)) {
            count++;
          }
        }
      }
    }
    return count;
  }, [timeSlots]);

  // 一括作成対象枠数カウント
  function countBulkCreateSlots(start: string, end: string, days: number[], times: string[]) {
    let count = 0;
    const s = new Date(start);
    const e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) {
        count += times.length;
      }
    }
    return count;
  }
  const bulkCreateCount = countBulkCreateSlots(bulkStart, bulkEnd, bulkDays, bulkTimeSlots.map(s => s.time));

  // 一括作成ハンドラ
  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault();
    setBulkLoading(true);
    setBulkError("");
    try {
      const start = new Date(bulkStart);
      const end = new Date(bulkEnd);
      const slots = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (bulkDays.includes(d.getDay())) {
          for (const slot of bulkTimeSlots) {
            slots.push({
              date: d.toISOString().split("T")[0],
              time: slot.time,
              max_capacity: slot.max_capacity,
              current_bookings: 0,
              is_available: true,
            });
          }
        }
      }
      // 既存APIにPOST連打
      for (const slot of slots) {
        await fetch("/api/time_slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slot),
        });
      }
      setShowModal(false);
      if (formRef.current) formRef.current.reset();
      window.location.reload();
    } catch {
      setBulkError("作成に失敗しました");
    } finally {
      setBulkLoading(false);
    }
  }

  // 一括編集ハンドラ
  async function handleBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      const s = new Date(editStart);
      const e = new Date(editEnd);
      const updates = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (editDays.includes(d.getDay())) {
          for (const time of editTimeSlots) {
            updates.push({
              date: d.toISOString().split("T")[0],
              time,
            });
          }
        }
      }
      for (const u of updates) {
        await fetch("/api/time_slots", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...u,
            max_capacity: editMaxCapacity,
            is_available: editIsAvailable,
          }),
        });
      }
      setShowEditModal(false);
      if (editFormRef.current) editFormRef.current.reset();
      window.location.reload();
    } catch {
      setEditError("編集に失敗しました");
    } finally {
      setEditLoading(false);
    }
  }

  // 一括削除ハンドラ
  async function handleBulkDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const s = new Date(deleteStart);
      const e = new Date(deleteEnd);
      const targets = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (deleteDays.includes(d.getDay())) {
          for (const time of deleteTimeSlots) {
            targets.push({
              date: d.toISOString().split("T")[0],
              time,
            });
          }
        }
      }
      for (const t of targets) {
        await fetch("/api/time_slots", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
      }
      setShowDeleteModal(false);
      if (deleteFormRef.current) deleteFormRef.current.reset();
      window.location.reload();
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    setDeleteCount(
      countTargetSlotsByActualData(deleteStart, deleteEnd, deleteDays, deleteTimeSlots)
    );
  }, [deleteStart, deleteEnd, deleteDays, deleteTimeSlots, timeSlots, countTargetSlotsByActualData]);

  useEffect(() => {
    setEditCount(
      countTargetSlotsByActualData(editStart, editEnd, editDays, editTimeSlots)
    );
  }, [editStart, editEnd, editDays, editTimeSlots, timeSlots, countTargetSlotsByActualData]);

  // 詳細モーダルの編集用state
  const [editDetailMax, setEditDetailMax] = useState<number | null>(null);
  const [editDetailAvail, setEditDetailAvail] = useState<boolean | null>(null);
  const [editDetailError, setEditDetailError] = useState<string>("");
  useEffect(() => {
    if (detailSlot) {
      setEditDetailMax(detailSlot.max_capacity);
      setEditDetailAvail(detailSlot.is_available ?? true);
      setEditDetailError("");
    }
  }, [detailSlot]);

  async function handleDetailEditSave() {
    if (!detailSlot) return;
    if (editDetailMax === null || editDetailMax < (detailSlot.current_bookings ?? 0)) {
      setEditDetailError(`最大予約数は現在の予約数（${detailSlot.current_bookings ?? 0}）以上にしてください`);
      return;
    }
    setEditDetailError("");
    const isNew = !detailSlot.id || detailSlot.id === '';
    const res = await fetch("/api/time_slots", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: detailSlot.date,
        time: detailSlot.time,
        max_capacity: editDetailMax,
        is_available: editDetailAvail,
        current_bookings: detailSlot.current_bookings ?? 0,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '作成・更新に失敗しました');
      return;
    }
    setDetailSlot(null);
    window.location.reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">時間枠カレンダー</h1>
      <div className="flex gap-5 mb-2 pb-5">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          一括作成
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => setShowEditModal(true)}
        >
          一括編集
        </button>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          onClick={() => setShowDeleteModal(true)}
        >
          一括削除
        </button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={goPrevWeek}>前の週</button>
        <span className="font-bold">{weekDates[0]} 〜 {weekDates[6]}</span>
        <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={goNextWeek}>次の週</button>
      </div>
      {showModal && (
        <div
          className="fixed inset-0  bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-6 rounded shadow max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">予約枠一括作成</h2>
            <form ref={formRef} onSubmit={handleBulkCreate} className="space-y-4">
              <div>
                <label className="block mb-1">開始日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={bulkStart} onChange={e => setBulkStart(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1">終了日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1">曜日</label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((w, i) => (
                    <label key={w} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={bulkDays.includes(i)}
                        onChange={e => {
                          setBulkDays(prev => e.target.checked ? [...prev, i] : prev.filter(d => d !== i));
                        }}
                        className="mr-1"
                      />
                      {w}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1">時間帯と最大予約数</label>
                <div className="space-y-1">
                  {bulkTimeSlots.map((slot, idx) => (
                    <div key={slot.time} className="flex items-center gap-2">
                      <span className="w-20">{slot.time}</span>
                      <input
                        type="number"
                        min={1}
                        value={slot.max_capacity}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setBulkTimeSlots(prev => prev.map((s, i) => i === idx ? { ...s, max_capacity: v } : s));
                        }}
                        className="border px-2 py-1 w-20"
                      />
                      <span>枠</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={bulkCreateCount >= 100 ? "text-red-600 font-bold" : "text-gray-600"}>
                この条件で作成される枠数：{bulkCreateCount}件{bulkCreateCount >= 100 && "（作りすぎ注意！）"}
              </div>
              {bulkError && <div className="text-red-600">{bulkError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2" onClick={() => setShowModal(false)}>キャンセル</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={bulkLoading}>
                  {bulkLoading ? "作成中..." : "一括作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0  bg-black/30 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white p-6 rounded shadow max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">予約枠一括編集</h2>
            <form ref={editFormRef} onSubmit={handleBulkEdit} className="space-y-4">
              <div>
                <label className="block mb-1">開始日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={editStart} onChange={e => { setEditStart(e.target.value); setEditCount(countTargetSlotsByActualData(e.target.value, editEnd, editDays, editTimeSlots)); }} />
              </div>
              <div>
                <label className="block mb-1">終了日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={editEnd} onChange={e => { setEditEnd(e.target.value); setEditCount(countTargetSlotsByActualData(editStart, e.target.value, editDays, editTimeSlots)); }} />
              </div>
              <div>
                <label className="block mb-1">曜日</label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((w, i) => (
                    <label key={w} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={editDays.includes(i)}
                        onChange={e => {
                          setEditDays(prev => e.target.checked ? [...prev, i] : prev.filter(d => d !== i));
                          setEditCount(countTargetSlotsByActualData(editStart, editEnd, e.target.checked ? [...editDays, i] : editDays.filter(d => d !== i), editTimeSlots));
                        }}
                        className="mr-1"
                      />
                      {w}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1">時間帯</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_TIME_SLOTS.map((slot) => (
                    <label key={slot.time} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={editTimeSlots.includes(slot.time)}
                        onChange={e => {
                          setEditTimeSlots(prev => e.target.checked ? [...prev, slot.time] : prev.filter(t => t !== slot.time));
                          setEditCount(countTargetSlotsByActualData(editStart, editEnd, editDays, e.target.checked ? [...editTimeSlots, slot.time] : editTimeSlots.filter(t => t !== slot.time)));
                        }}
                        className="mr-1"
                      />
                      {slot.time}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1">最大予約数</label>
                <input type="number" min={1} value={editMaxCapacity} onChange={e => setEditMaxCapacity(Number(e.target.value))} className="border px-2 py-1 w-20" />
              </div>
              <div>
                <label className="block mb-1">利用可否</label>
                <select value={editIsAvailable ? "true" : "false"} onChange={e => setEditIsAvailable(e.target.value === "true")}
                  className="border px-2 py-1 w-32">
                  <option value="true">利用可</option>
                  <option value="false">利用不可</option>
                </select>
              </div>
              <div className={editCount >= 100 ? "text-red-600 font-bold" : "text-gray-600"}>
                この条件で編集される枠数：{editCount}件{editCount >= 100 && "（作りすぎ注意！）"}
              </div>
              {editError && <div className="text-red-600">{editError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2" onClick={() => setShowEditModal(false)}>キャンセル</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={editLoading}>
                  {editLoading ? "編集中..." : "一括編集"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0  bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white p-6 rounded shadow max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">予約枠一括削除</h2>
            <form ref={deleteFormRef} onSubmit={handleBulkDelete} className="space-y-4">
              <div>
                <label className="block mb-1">開始日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={deleteStart} onChange={e => { setDeleteStart(e.target.value); setDeleteCount(countTargetSlotsByActualData(e.target.value, deleteEnd, deleteDays, deleteTimeSlots)); }} />
              </div>
              <div>
                <label className="block mb-1">終了日</label>
                <input type="date" required className="border px-2 py-1 w-full" value={deleteEnd} onChange={e => { setDeleteEnd(e.target.value); setDeleteCount(countTargetSlotsByActualData(deleteStart, e.target.value, deleteDays, deleteTimeSlots)); }} />
              </div>
              <div>
                <label className="block mb-1">曜日</label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((w, i) => (
                    <label key={w} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteDays.includes(i)}
                        onChange={e => {
                          setDeleteDays(prev => e.target.checked ? [...prev, i] : prev.filter(d => d !== i));
                          setDeleteCount(countTargetSlotsByActualData(deleteStart, deleteEnd, e.target.checked ? [...deleteDays, i] : deleteDays.filter(d => d !== i), deleteTimeSlots));
                        }}
                        className="mr-1"
                      />
                      {w}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1">時間帯</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_TIME_SLOTS.map((slot) => (
                    <label key={slot.time} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteTimeSlots.includes(slot.time)}
                        onChange={e => {
                          setDeleteTimeSlots(prev => e.target.checked ? [...prev, slot.time] : prev.filter(t => t !== slot.time));
                          setDeleteCount(countTargetSlotsByActualData(deleteStart, deleteEnd, deleteDays, e.target.checked ? [...deleteTimeSlots, slot.time] : deleteTimeSlots.filter(t => t !== slot.time)));
                        }}
                        className="mr-1"
                      />
                      {slot.time}
                    </label>
                  ))}
                </div>
              </div>
              <div className={deleteCount >= 100 ? "text-red-600 font-bold" : "text-gray-600"}>
                この条件で削除される枠数：{deleteCount}件{deleteCount >= 100 && "（作りすぎ注意！）"}
              </div>
              {deleteError && <div className="text-red-600">{deleteError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2" onClick={() => setShowDeleteModal(false)}>キャンセル</button>
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded" disabled={deleteLoading}>
                  {deleteLoading ? "削除中..." : "一括削除"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-50 text-center">時間帯</th>
              {weekDates.map((date) => (
                <th key={date} className="border px-2 py-1 bg-gray-50 text-center">
                  {formatDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeKeys.map((time) => (
              <tr key={time}>
                <td className="border px-2 py-1 font-mono bg-gray-50 text-center">{formatTimeRange(time)}</td>
                {weekDates.map((date) => {
                  const slot = slotMap[date][time];
                  let cell;
                  if (!slot) {
                    cell = (
                      <span className="text-gray-300 cursor-pointer" onClick={() => setDetailSlot({
                        id: '', date, time, max_capacity: 1, current_bookings: 0, is_available: true })}>
                        -
                      </span>
                    );
                  } else if (slot.is_available === false || (slot.current_bookings ?? 0) >= slot.max_capacity) {
                    cell = (
                      <span className="text-red-500 font-bold cursor-pointer" onClick={() => setDetailSlot(slot)}>
                        ×<br />
                        <span className="text-xs font-normal">{(slot.current_bookings ?? 0)}/{slot.max_capacity}</span>
                      </span>
                    );
                  } else {
                    const remain = slot.max_capacity - (slot.current_bookings ?? 0);
                    cell = (
                      <span className="text-blue-600 font-bold cursor-pointer" onClick={() => setDetailSlot(slot)}>
                        ⚪︎{remain}<br />
                        <span className="text-xs font-normal">{(slot.current_bookings ?? 0)}/{slot.max_capacity}</span>
                      </span>
                    );
                  }
                  return (
                    <td key={date} className="border px-2 py-1 text-center align-middle">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detailSlot && (
        <div className="fixed inset-0  bg-black/30 flex items-center justify-center z-50" onClick={() => setDetailSlot(null)}>
          <div className="bg-white p-6 rounded shadow max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">予約枠詳細</h2>
            <div className="mb-2">日付: <span className="font-mono">{detailSlot.date}</span></div>
            <div className="mb-2">時間帯: <span className="font-mono">{formatTimeRange(detailSlot.time.slice(0,5))}</span></div>
            <div className="mb-2">最大予約数: <input type="number" min={detailSlot.current_bookings ?? 0} value={editDetailMax ?? ''} onChange={e => setEditDetailMax(Number(e.target.value))} className="border px-2 py-1 w-24 ml-2" /></div>
            <div className="mb-2">予約数: <span className="font-mono">{detailSlot.current_bookings ?? 0}</span></div>
            <div className="mb-2">利用可否: <select value={editDetailAvail ? 'true' : 'false'} onChange={e => setEditDetailAvail(e.target.value === 'true')} className="border px-2 py-1 w-24 ml-2"><option value="true">利用可</option><option value="false">利用不可</option></select></div>
            {detailSlot.created_at && (
              <div className="mb-2">作成日時: <span className="font-mono">{new Date(detailSlot.created_at).toLocaleString('ja-JP')}</span></div>
            )}
            {editDetailError && <div className="text-red-600 mb-2">{editDetailError}</div>}
            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setDetailSlot(null)}>閉じる</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleDetailEditSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 