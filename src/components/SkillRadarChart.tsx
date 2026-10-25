'use client';

import React from 'react';
import { VET_TOPICS } from '@/lib/vet-topics';
import { PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

export function SkillRadarChart({ skillMap }: { skillMap: Record<string, number> }) {
  const data = VET_TOPICS.map(topic => ({
    topic: topic.name.length > 10 ? topic.name.slice(0, 10) + '…' : topic.name,
    fullName: topic.name,
    mastery: skillMap[topic.id] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#E3E0D5" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: '#6E695C', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6E695C', fontSize: 9 }}
        />
        <Radar
          name="Уровень"
          dataKey="mastery"
          stroke="#4C7A3F"
          fill="#4C7A3F"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [`${value}%`, 'Мастерство']}
          labelFormatter={(label) => {
            const item = data.find(d => d.topic === label);
            return item?.fullName || label;
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
