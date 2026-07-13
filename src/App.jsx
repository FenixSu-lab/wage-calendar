import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { fetchWages } from './services/wageService';

// --- 1. 模拟 Mock API ---
// 已迁移至 services/wageService.js

// --- 2. 辅助工具函数 ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); 
const formatDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const getCurrentMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const normalizeDateKey = (dateValue) => {
  if (dateValue == null) return null;
  const raw = String(dateValue);
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  const normalizedMonth = String(Number(match[2])).padStart(2, '0');
  const normalizedDay = String(Number(match[3])).padStart(2, '0');
  return `${match[1]}-${normalizedMonth}-${normalizedDay}`;
};

const formatDateLabel = (dateKey) => {
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${Number(match[2])}月${Number(match[3])}日`;
};

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  const v = params.get(key);
  return v ? decodeURIComponent(v) : null;
};

// --- 3. 组件部分 ---
function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ userName: '', records: [] });
  // 默认查看当前月
  const [currentDate, setCurrentDate] = useState(getCurrentMonthStart);

  useEffect(() => {
    const resetToCurrentMonth = () => {
      setCurrentDate(getCurrentMonthStart());
    };

    resetToCurrentMonth();
    window.addEventListener('pageshow', resetToCurrentMonth);

    return () => {
      window.removeEventListener('pageshow', resetToCurrentMonth);
    };
  }, []);

  useEffect(() => {
    const userName = getQueryParam('name'); // 改为从 URL 获取
    

    if (!userName) {
      console.error('Missing required userName in URL query: name');
      setLoading(false);
      setData(prev => ({ ...prev, userName: '' }));
      return;
    }

    fetchWages(userName).then((data) => {
      setData(data);
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to load wages:", error);
      setLoading(false);
    });
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 

  const { daysArray, monthlyTotal, mobileWeeks, duplicateConflictDates } = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const wageCentsMap = {};
    const shiftMap = {}; // 新增：记录班次
    const recordsByDate = {};
    
    data.records.forEach(item => {
      const normalizedDateKey = normalizeDateKey(item.date);
      if (!normalizedDateKey) return;

      const rawWage = item.wage ?? item.amount;
      const parsedWage = rawWage == null ? 0 : Number(rawWage);
      const wage = Number.isFinite(parsedWage) ? parsedWage : 0;
      const wageCents = Math.round(wage * 100);
      const shift = String(item.shift_type ?? item.shift ?? '').trim();

      if (!recordsByDate[normalizedDateKey]) {
        recordsByDate[normalizedDateKey] = [];
      }
      recordsByDate[normalizedDateKey].push({ wageCents, shift });
    });

    const duplicateConflictDates = [];
    Object.entries(recordsByDate).forEach(([dateKey, entries]) => {
      const uniqueKeys = new Set(entries.map(entry => `${entry.wageCents}|${entry.shift}`));

      if (uniqueKeys.size > 1) {
        duplicateConflictDates.push(dateKey);
        return;
      }

      // 同一天若记录完全相同，只保留一条，不做累加。
      const [firstEntry] = entries;
      wageCentsMap[dateKey] = firstEntry.wageCents;
      shiftMap[dateKey] = firstEntry.shift;
    });

    duplicateConflictDates.sort();
    const conflictDateSet = new Set(duplicateConflictDates);

    const blanks = Array(firstDay).fill(null);
    let totalCents = 0;
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = formatDateKey(year, month, day);
      const dailyWageCents = wageCentsMap[dateKey] || 0;
      const isConflict = conflictDateSet.has(dateKey);

      if (!isConflict) {
        totalCents += dailyWageCents;
      }

      return {
        day,
        dateKey,
        wage: isConflict ? null : dailyWageCents / 100,
        shift: isConflict ? '' : (shiftMap[dateKey] || ''),
        isConflict,
      };
    });

    const calendarDays = [...blanks, ...days];
    const paddedDays = [...calendarDays];

    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    const weeks = [];
    for (let index = 0; index < paddedDays.length; index += 7) {
      weeks.push(
        paddedDays.slice(index, index + 7).map((entry, dayIndex) => (
          entry
            ? {
                ...entry,
                weekDayLabel: WEEKDAY_LABELS[dayIndex],
              }
            : null
        ))
      );
    }

    return {
      daysArray: paddedDays,
      monthlyTotal: totalCents / 100,
      mobileWeeks: weeks,
      duplicateConflictDates,
    };
  }, [year, month, data.records]);

  const changeMonth = (offset) => {
    setCurrentDate((prevDate) => {
      const nextYear = prevDate.getFullYear();
      const nextMonth = prevDate.getMonth() + offset;
      return new Date(nextYear, nextMonth, 1);
    });
  };

  if (loading) return <div className="app-loading">数据加载中...</div>;

  return (
    <div className="app-shell">
      <div className="summary-card">
        <h1 className="summary-user">{data.userName} 的工资单</h1>
        <div className="summary-total">
          <span className="summary-label">{year}年{month + 1}月 总收入（已排除待核对日期）</span>
          <span className="summary-amount">¥ {monthlyTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="month-toolbar">
        <button type="button" onClick={() => changeMonth(-1)} className="month-button">&lt; 上月</button>
        <span className="month-title">{year}年 {month + 1}月</span>
        <button type="button" onClick={() => changeMonth(1)} className="month-button">下月 &gt;</button>
      </div>

      <section className="calendar-panel calendar-desktop" aria-label="桌面月历视图">
        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">{label}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {daysArray.map((item, index) => {
            if (!item) return <div key={`blank-${index}`} className="calendar-cell calendar-cell-empty" />;

            const hasWage = typeof item.wage === 'number' && item.wage > 0;
            return (
              <article key={item.day} className={`calendar-cell ${hasWage ? 'calendar-cell-active' : ''} ${item.isConflict ? 'calendar-cell-conflict' : ''}`}>
                <div className="calendar-date">{item.day}</div>
                {item.isConflict ? <div className="calendar-conflict-tag">待财务核对</div> : null}
                {item.shift ? <div className="calendar-shift">{item.shift}</div> : null}
                {hasWage ? (
                  <div className="calendar-wage">+{item.wage.toLocaleString()}</div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="calendar-panel calendar-mobile" aria-label="手机周视图">
        {mobileWeeks.map((week, weekIndex) => {
          const visibleDays = week.filter(Boolean);

          return (
            <div key={`week-${weekIndex}`} className="week-card">
              <div className="week-card-title">第 {weekIndex + 1} 周</div>
              <div className="week-list">
                {visibleDays.map((item) => {
                  const hasWage = typeof item.wage === 'number' && item.wage > 0;

                  return (
                    <article key={item.dateKey} className="week-item">
                      <div className="week-item-date">
                        <span className="week-item-day">{item.day}日</span>
                        <span className="week-item-weekday">周{item.weekDayLabel}</span>
                      </div>
                      <div className="week-item-main">
                        {item.isConflict ? (
                          <span className="week-item-conflict">待财务核对</span>
                        ) : (
                          <>
                            {item.shift ? <span className="week-item-shift">{item.shift}</span> : <span className="week-item-shift week-item-shift-muted">未排班次</span>}
                            {hasWage ? <span className="week-item-wage">¥ {item.wage.toLocaleString()}</span> : null}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default App;