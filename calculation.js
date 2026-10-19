export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function period(employee) {
  const end = new Date(`${employee.baseDate}T00:00:00Z`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return { start: employee.baseDate, end: end.toISOString().slice(0, 10) };
}
export function classify(row, employee, asOf, edited = false) {
  const wait = reason => ({ category: '確認待ち', days: null, hours: 0, reason });
  if (edited) return wait('入力を編集したため、元の根拠と再照合が必要');
  if (!employee || !validDate(row.date) || !['1日', '半日', '時間'].includes(row.unit) || !['取得済み', '予定', '取消'].includes(row.status) || !['当年', '繰越'].includes(row.source)) return wait('日付・取得区分・状態・取得元に空欄または不明な値がある');
  const amount = Number(row.amount);
  if (row.amount === '' || !Number.isFinite(amount) || (row.unit === '1日' && amount !== 1) || (row.unit === '半日' && amount !== 0.5) || (row.unit === '時間' && (amount <= 0 || amount > 8))) return wait('取得区分と数量が食い違う');
  if (row.unit === '半日' && row.requester !== '本人') return wait('半日の本人取得を確認できない');
  const p = period(employee);
  if (row.date < p.start || row.date > p.end) return { category: '算入しない', days: 0, hours: 0, reason: '管理期間外' };
  if (row.status !== '取得済み' || row.date > asOf) return { category: '算入しない', days: 0, hours: 0, reason: row.status === '取消' ? '取消' : '未来の予定・未取得' };
  if (row.unit === '時間') return { category: '算入しない', days: 0, hours: amount, reason: '時間単位は年5日に算入せず別記' };
  return { category: '取得済み', days: amount, hours: 0, reason: row.source === '繰越' ? '管理期間内の繰越分の取得' : '管理期間内の取得済み' };
}
export function summarize(employee, results) {
  const days = results.reduce((sum, r) => sum + (r.category === '取得済み' ? r.days : 0), 0);
  const pending = results.filter(r => r.category === '確認待ち').length;
  const eligible = employee.granted >= 10;
  return { days, pending, eligible, shortage: eligible ? Math.max(0, 5 - days) : null, hours: results.reduce((sum, r) => sum + r.hours, 0) };
}
