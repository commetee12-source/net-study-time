---
name: chart-component-skill
description: |
  Recharts 또는 Chart.js를 사용하여 개인 공부시간 추이 차트와
  몰입률 통계 차트 React 컴포넌트를 생성한다.
  사용 시점: 통계 그래프, 추이 차트, 몰입률 시각화,
  일별 공부시간 바 차트, 개인 대시보드 차트 구현 시 반드시 사용.
---

# Chart Component Skill

학습 통계 데이터를 시각화하는 React 차트 컴포넌트를 생성한다.
모바일 화면에 최적화된 반응형 차트를 제공한다.

## 데이터 인터페이스

```typescript
interface DailyTrend {
  date: string;           // 'YYYY-MM-DD'
  netStudySeconds: number;
  totalSeconds: number;
  focusRate: number;
}
```

## 순공부시간 추이 바 차트

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: DailyTrend[];
}

function TrendChart({ data }: TrendChartProps) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    hours: Math.round(d.netStudySeconds / 3600 * 10) / 10
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formatted}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis unit="h" tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(val: number) => [`${val}시간`, '순공부']}
          labelFormatter={(label) => `📅 ${label}`}
        />
        <Bar dataKey="hours" fill="#4F46E5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 몰입률 추이 라인 차트

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FocusRateChartProps {
  data: DailyTrend[];
}

function FocusRateChart({ data }: FocusRateChartProps) {
  const formatted = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    focusRate: d.focusRate
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(val: number) => [`${val}%`, '몰입률']}
        />
        <Line
          type="monotone"
          dataKey="focusRate"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 오늘 요약 카드

```tsx
interface TodaySummaryProps {
  netStudySeconds: number;
  totalSeconds: number;
  focusRate: number;
}

function TodaySummary({ netStudySeconds, totalSeconds, focusRate }: TodaySummaryProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-indigo-50 rounded-xl p-4 text-center">
        <p className="text-xs text-indigo-600 mb-1">순공부시간</p>
        <p className="text-lg font-bold text-indigo-900">{formatTime(netStudySeconds)}</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-600 mb-1">총 시간</p>
        <p className="text-lg font-bold text-gray-900">{formatTime(totalSeconds)}</p>
      </div>
      <div className="bg-emerald-50 rounded-xl p-4 text-center">
        <p className="text-xs text-emerald-600 mb-1">몰입률</p>
        <p className="text-lg font-bold text-emerald-900">{focusRate}%</p>
      </div>
    </div>
  );
}
```

## 모바일 최적화 포인트
- ResponsiveContainer로 화면 폭에 맞게 자동 조정
- 폰트 크기 11px로 작은 화면에서도 가독성 확보
- 차트 높이 200~250px (모바일 화면 비율 고려)
- 한국어 날짜 포맷 (toLocaleDateString 'ko-KR')

## 사용 예제

**예제 1: 일별 추이 바 차트**
- 입력: "최근 30일 순공부시간 바 차트를 만들어줘"
- 출력: Recharts 기반 BarChart 컴포넌트

**예제 2: 몰입률 추이 라인 차트**
- 입력: "주간 몰입률 추이를 라인 차트로 보여줘"
- 출력: Recharts 기반 LineChart 컴포넌트
