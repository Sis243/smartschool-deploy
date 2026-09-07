'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

export function PresenceChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['bilan-semaine'],
    queryFn: () => api.get('/api/v1/academique/presences/bilan-semaine').then((r) => r.data.data as any[]),
    staleTime: 5 * 60 * 1000,
  });

  const hasData = data?.some((d: any) => d.presents > 0 || d.absents > 0);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Présences cette semaine</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : !hasData ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune présence enregistrée cette semaine
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="jour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="presents" name="Présents" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absents" name="Absents" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="retards" name="Retards" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
