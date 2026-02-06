// Query Tester - Test queries and see results inline

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2 } from 'lucide-react';
import { localAssistant } from '@/services/LocalAssistant';
import type { ProcessResult } from '@/services/LocalAssistant';

export function QueryTester() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    if (!query.trim()) return;
    setTesting(true);
    try {
      await localAssistant.initialize();
      const res = await localAssistant.process(query);
      setResult(res);
    } catch (error) {
      setResult({ message: `❌ خطأ: ${(error as Error).message}` });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        <Input 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="اكتب سؤال للاختبار..."
          onKeyDown={e => e.key === 'Enter' && runTest()}
        />
        <Button onClick={runTest} disabled={testing || !query.trim()}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      {result && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <div className="text-sm whitespace-pre-wrap">{result.message}</div>
            {result.queryUsed && (
              <Badge variant="outline" className="text-xs">📊 {result.queryUsed}</Badge>
            )}
            {result.data && result.data.length > 0 && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {Object.keys(result.data[0]).filter(k => k !== '_rows').slice(0, 6).map(k => (
                        <th key={k} className="border border-border p-1 bg-muted font-mono">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 10).map((row: any, i: number) => (
                      <tr key={i}>
                        {Object.entries(row).filter(([k]) => k !== '_rows').slice(0, 6).map(([, v], j) => (
                          <td key={j} className="border border-border p-1 max-w-[120px] truncate">
                            {v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.needsTeaching && (
              <Badge variant="destructive" className="text-xs">يحتاج تعليم</Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
