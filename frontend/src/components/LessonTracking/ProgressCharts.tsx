import React, { useMemo } from "react";
import "./ProgressCharts.css";

interface ProgressData {
	label: string;
	value: number;
	maxValue: number;
	color?: string;
}

interface ProgressChartsProps {
	data: ProgressData[];
	title?: string;
	type?: "bar" | "donut";
	showLegend?: boolean;
	showValues?: boolean;
	height?: number;
}

const DEFAULT_COLORS = [
	"#4f46e5",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#ec4899",
	"#84cc16",
];

export const ProgressCharts: React.FC<ProgressChartsProps> = ({
	data,
	title,
	type = "bar",
	showLegend = true,
	showValues = true,
	height = 300,
}) => {
	const chartData = useMemo(() => {
		return data.map((item, index) => ({
			...item,
			color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
			percentage: item.maxValue > 0 ? (item.value / item.maxValue) * 100 : 0,
		}));
	}, [data]);

	const totalValue = useMemo(
		() => chartData.reduce((sum, item) => sum + item.value, 0),
		[chartData]
	);

	if (type === "donut") {
		return (
			<div className="progress-charts progress-charts--donut">
				{title && <h4 className="progress-charts__title">{title}</h4>}
				<div className="progress-charts__donut-container" style={{ height }}>
					<DonutChart data={chartData} total={totalValue} />
				</div>
				{showLegend && (
					<div className="progress-charts__legend">
						{chartData.map((item, index) => (
							<div key={index} className="progress-charts__legend-item">
								<span
									className="progress-charts__legend-dot"
									style={{ background: item.color }}
								/>
								<span className="progress-charts__legend-label">
									{item.label}
								</span>
								{showValues && (
									<span className="progress-charts__legend-value">
										{item.value}
									</span>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="progress-charts progress-charts--bar">
			{title && <h4 className="progress-charts__title">{title}</h4>}
			<div className="progress-charts__bars" style={{ minHeight: height }}>
				{chartData.map((item, index) => (
					<div key={index} className="progress-charts__bar-item">
						<div className="progress-charts__bar-header">
							<span className="progress-charts__bar-label">{item.label}</span>
							{showValues && (
								<span className="progress-charts__bar-value">
									{item.value} / {item.maxValue}
								</span>
							)}
						</div>
						<div className="progress-charts__bar-track">
							<div
								className="progress-charts__bar-fill"
								style={{
									width: `${Math.min(item.percentage, 100)}%`,
									background: item.color,
								}}
							/>
						</div>
						<span className="progress-charts__bar-percentage">
							{item.percentage.toFixed(0)}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

// Donut Chart Component
const DonutChart: React.FC<{
	data: Array<{ label: string; value: number; color: string }>;
	total: number;
}> = ({ data, total }) => {
	const radius = 80;
	const strokeWidth = 24;
	const center = 100;
	const circumference = 2 * Math.PI * radius;

	let accumulatedPercentage = 0;

	const segments = data.map((item) => {
		const percentage = total > 0 ? (item.value / total) * 100 : 0;
		const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
		const rotation = (accumulatedPercentage / 100) * 360 - 90;
		accumulatedPercentage += percentage;

		return {
			...item,
			percentage,
			dashArray,
			rotation,
		};
	});

	return (
		<svg viewBox="0 0 200 200" className="progress-charts__donut-svg">
			{/* Background circle */}
			<circle
				cx={center}
				cy={center}
				r={radius}
				fill="none"
				stroke="#e5e7eb"
				strokeWidth={strokeWidth}
			/>

			{/* Segments */}
			{segments.map((segment, index) => (
				<circle
					key={index}
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke={segment.color}
					strokeWidth={strokeWidth}
					strokeDasharray={segment.dashArray}
					strokeLinecap="round"
					transform={`rotate(${segment.rotation} ${center} ${center})`}
					className="progress-charts__donut-segment"
				/>
			))}

			{/* Center text */}
			<text
				x={center}
				y={center - 8}
				textAnchor="middle"
				className="progress-charts__donut-total"
			>
				{total}
			</text>
			<text
				x={center}
				y={center + 16}
				textAnchor="middle"
				className="progress-charts__donut-label"
			>
				Total
			</text>
		</svg>
	);
};

// Teaching Methods Distribution Chart
interface TeachingMethodData {
	method: string;
	count: number;
	hours: number;
}

interface TeachingMethodsChartProps {
	data: TeachingMethodData[];
	title?: string;
}

const METHOD_ICONS: Record<string, string> = {
	LECTURE: "📚",
	DISCUSSION: "💬",
	GROUP_WORK: "👥",
	PRACTICAL: "🔬",
	DEMONSTRATION: "🎬",
	ASSESSMENT: "📝",
	REVISION: "🔄",
	OTHER: "📋",
};

const METHOD_COLORS: Record<string, string> = {
	LECTURE: "#4f46e5",
	DISCUSSION: "#10b981",
	GROUP_WORK: "#f59e0b",
	PRACTICAL: "#ef4444",
	DEMONSTRATION: "#8b5cf6",
	ASSESSMENT: "#06b6d4",
	REVISION: "#ec4899",
	OTHER: "#6b7280",
};

export const TeachingMethodsChart: React.FC<TeachingMethodsChartProps> = ({
	data,
	title = "Teaching Methods Distribution",
}) => {
	const totalLessons = data.reduce((sum, item) => sum + item.count, 0);
	const totalHours = data.reduce((sum, item) => sum + item.hours, 0);

	const sortedData = [...data].sort((a, b) => b.count - a.count);

	return (
		<div className="teaching-methods-chart">
			{title && <h4 className="teaching-methods-chart__title">{title}</h4>}

			<div className="teaching-methods-chart__summary">
				<div className="teaching-methods-chart__stat">
					<span className="teaching-methods-chart__stat-value">
						{totalLessons}
					</span>
					<span className="teaching-methods-chart__stat-label">Lessons</span>
				</div>
				<div className="teaching-methods-chart__stat">
					<span className="teaching-methods-chart__stat-value">
						{totalHours.toFixed(1)}
					</span>
					<span className="teaching-methods-chart__stat-label">Hours</span>
				</div>
				<div className="teaching-methods-chart__stat">
					<span className="teaching-methods-chart__stat-value">
						{data.length}
					</span>
					<span className="teaching-methods-chart__stat-label">Methods</span>
				</div>
			</div>

			<div className="teaching-methods-chart__methods">
				{sortedData.map((item, index) => {
					const percentage =
						totalLessons > 0 ? (item.count / totalLessons) * 100 : 0;
					return (
						<div key={index} className="teaching-methods-chart__method">
							<div className="teaching-methods-chart__method-header">
								<span className="teaching-methods-chart__method-icon">
									{METHOD_ICONS[item.method] || "📋"}
								</span>
								<span className="teaching-methods-chart__method-name">
									{item.method.replace(/_/g, " ")}
								</span>
								<span className="teaching-methods-chart__method-count">
									{item.count} ({percentage.toFixed(0)}%)
								</span>
							</div>
							<div className="teaching-methods-chart__method-bar">
								<div
									className="teaching-methods-chart__method-fill"
									style={{
										width: `${percentage}%`,
										background: METHOD_COLORS[item.method] || "#6b7280",
									}}
								/>
							</div>
							<div className="teaching-methods-chart__method-hours">
								{item.hours.toFixed(1)} hours
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

// Weekly Progress Chart
interface WeeklyProgressData {
	week: string;
	planned: number;
	completed: number;
}

interface WeeklyProgressChartProps {
	data: WeeklyProgressData[];
	title?: string;
}

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
	data,
	title = "Weekly Progress",
}) => {
	const maxValue = Math.max(
		...data.flatMap((d) => [d.planned, d.completed]),
		1
	);

	return (
		<div className="weekly-progress-chart">
			{title && <h4 className="weekly-progress-chart__title">{title}</h4>}

			<div className="weekly-progress-chart__legend">
				<span className="weekly-progress-chart__legend-item">
					<span
						className="weekly-progress-chart__legend-dot"
						style={{ background: "#e5e7eb" }}
					/>
					Planned
				</span>
				<span className="weekly-progress-chart__legend-item">
					<span
						className="weekly-progress-chart__legend-dot"
						style={{ background: "#4f46e5" }}
					/>
					Completed
				</span>
			</div>

			<div className="weekly-progress-chart__chart">
				{data.map((item, index) => (
					<div key={index} className="weekly-progress-chart__week">
						<div className="weekly-progress-chart__bars">
							<div
								className="weekly-progress-chart__bar weekly-progress-chart__bar--planned"
								style={{ height: `${(item.planned / maxValue) * 100}%` }}
							/>
							<div
								className="weekly-progress-chart__bar weekly-progress-chart__bar--completed"
								style={{ height: `${(item.completed / maxValue) * 100}%` }}
							/>
						</div>
						<span className="weekly-progress-chart__label">{item.week}</span>
					</div>
				))}
			</div>
		</div>
	);
};

export default ProgressCharts;
