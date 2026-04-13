'use client';

import React from 'react';
import { VET_TOPICS } from '@/lib/vet-topics';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';

export function SkillRadarChart({ skillMap }: { skillMap: Record<string, number> }) {
  const data = VET_TOPICS.map(topic => ({
    topic: topic.name.length > 10 ? topic.name.slice(0, 10) + '…' : topic.name,
    fullName: topic.name,
    mastery: skillMap[topic.id] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#E5E5EA" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: '#86868B', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#86868B', fontSize: 9 }}
        />
        <Radar
          name="Уровень"
          dataKey="mastery"
          stroke="#28CD41"
          fill="#28CD41"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value: number) => [`${value}%`, 'Мастерство']}
              labelFormatter={(label: string) => {
                const item = data.find(d => d.topic === label);
                return item?.fullName || label;
              }}
            />
          }
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
